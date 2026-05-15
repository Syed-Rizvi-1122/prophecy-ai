import { NextResponse } from "next/server";

import { getAppUserFromSession } from "@/lib/auth/get-app-user";
import { prisma } from "@/lib/prisma";

/** Customer (buyer): list their purchase records. */
export async function GET() {
  try {
    const user = await getAppUserFromSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (user.role !== "CUSTOMER") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const rows = await prisma.transaction.findMany({
      where: { buyerId: user.id },
      include: {
        property: {
          include: {
            location: true,
            category: true,
            agent: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
      orderBy: { transactionDate: "desc" },
    });

    return NextResponse.json(
      {
        transactions: rows.map((t) => ({
          id: t.id,
          amount: t.amount.toString(),
          transactionDate: t.transactionDate.toISOString(),
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
    console.error("Portal transactions GET failed:", error);
    return NextResponse.json({ error: "Failed to load transactions." }, { status: 500 });
  }
}
