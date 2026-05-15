import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { getAppUserFromSession } from "@/lib/auth/get-app-user";
import { prisma } from "@/lib/prisma";
import { runPivotalTransaction, withSavepoint } from "@/lib/prisma/pivotal-transaction";

function parsePostBody(raw: unknown): { propertyId: string; buyerEmail: string; amount?: number } | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as Record<string, unknown>;
  if (typeof body.propertyId !== "string" || !body.propertyId.trim()) return null;
  if (typeof body.buyerEmail !== "string" || !body.buyerEmail.trim()) return null;
  const amount =
    typeof body.amount === "number" && Number.isFinite(body.amount) && body.amount > 0
      ? body.amount
      : undefined;
  return { propertyId: body.propertyId.trim(), buyerEmail: body.buyerEmail.trim(), amount };
}

/** Agent: sales on their listings. Admin: all sales. */
export async function GET() {
  try {
    const user = await getAppUserFromSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (user.role !== "AGENT" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const where =
      user.role === "ADMIN"
        ? {}
        : {
            property: { agentId: user.id },
          };

    const rows = await prisma.transaction.findMany({
      where,
      include: {
        property: {
          include: {
            location: true,
            category: true,
            agent: { select: { id: true, fullName: true, email: true } },
          },
        },
        buyer: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { transactionDate: "desc" },
    });

    return NextResponse.json(
      {
        transactions: rows.map((t) => ({
          id: t.id,
          amount: t.amount.toString(),
          transactionDate: t.transactionDate.toISOString(),
          buyer: t.buyer,
          property: {
            id: t.property.id,
            title: t.property.title,
            status: t.property.status,
            location: {
              city: t.property.location.city,
              area: t.property.location.area,
            },
            category: { name: t.property.category.name, type: t.property.category.type },
            agent: t.property.agent,
          },
        })),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Agent transactions GET failed:", error);
    return NextResponse.json({ error: "Failed to load transactions." }, { status: 500 });
  }
}

/**
 * Agent / admin: record a sale. Marks the listing as SOLD and stores the transaction.
 * Buyer must be an existing customer (by email).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAppUserFromSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (user.role !== "AGENT" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const payload = parsePostBody(await request.json());
    if (!payload) {
      return NextResponse.json(
        { error: "propertyId and buyerEmail are required; amount optional." },
        { status: 400 },
      );
    }

    const emailNorm = payload.buyerEmail.toLowerCase();

    const result = await runPivotalTransaction(async (tx) => {
      const property = await tx.property.findUnique({
        where: { id: payload.propertyId },
        select: {
          id: true,
          agentId: true,
          price: true,
          status: true,
        },
      });

      if (!property) {
        throw new Error("PROPERTY_NOT_FOUND");
      }

      if (user.role === "AGENT" && property.agentId !== user.id) {
        throw new Error("FORBIDDEN_PROPERTY");
      }

      if (property.status !== "AVAILABLE") {
        throw new Error("NOT_AVAILABLE");
      }

      const buyer = await tx.user.findFirst({
        where: { email: { equals: emailNorm, mode: "insensitive" } },
        select: { id: true, role: true },
      });

      if (!buyer || buyer.role !== "CUSTOMER") {
        throw new Error("BUYER_INVALID");
      }

      const amountDecimal = new Prisma.Decimal(
        payload.amount ?? property.price.toString(),
      );

      return withSavepoint(tx, "sale_commit", async () => {
        const transactionRow = await tx.transaction.create({
          data: {
            propertyId: property.id,
            buyerId: buyer.id,
            amount: amountDecimal,
          },
        });

        await tx.property.update({
          where: { id: property.id },
          data: { status: "SOLD" },
        });

        return transactionRow;
      });
    });

    const full = await prisma.transaction.findUnique({
      where: { id: result.id },
      include: {
        property: {
          include: {
            location: true,
            category: true,
            agent: { select: { id: true, fullName: true, email: true } },
          },
        },
        buyer: { select: { id: true, fullName: true, email: true } },
      },
    });

    return NextResponse.json(
      {
        transaction: full && {
          id: full.id,
          amount: full.amount.toString(),
          transactionDate: full.transactionDate.toISOString(),
          buyer: full.buyer,
          property: {
            id: full.property.id,
            title: full.property.title,
            status: full.property.status,
            location: {
              city: full.property.location.city,
              area: full.property.location.area,
            },
            category: { name: full.property.category.name, type: full.property.category.type },
            agent: full.property.agent,
          },
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "PROPERTY_NOT_FOUND") {
      return NextResponse.json({ error: "Property not found." }, { status: 404 });
    }
    if (msg === "FORBIDDEN_PROPERTY") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    if (msg === "NOT_AVAILABLE") {
      return NextResponse.json(
        { error: "Only available listings can be sold." },
        { status: 409 },
      );
    }
    if (msg === "BUYER_INVALID") {
      return NextResponse.json(
        { error: "Buyer must be a registered customer email." },
        { status: 400 },
      );
    }
    console.error("Agent transactions POST failed:", error);
    return NextResponse.json({ error: "Failed to record transaction." }, { status: 500 });
  }
}
