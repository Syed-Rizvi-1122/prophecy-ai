import { NextRequest, NextResponse } from "next/server";

import { getAppUserFromSession } from "@/lib/auth/get-app-user";
import { prisma } from "@/lib/prisma";
import { runPivotalTransaction, withSavepoint } from "@/lib/prisma/pivotal-transaction";

function parseReviewBody(raw: unknown): { propertyId: string; rating: number; comment: string } | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as Record<string, unknown>;
  if (typeof body.propertyId !== "string" || !body.propertyId.trim()) return null;
  const rating = typeof body.rating === "number" ? body.rating : Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return null;
  if (typeof body.comment !== "string" || !body.comment.trim()) return null;
  return { propertyId: body.propertyId.trim(), rating, comment: body.comment.trim() };
}

/** Customer: list reviews they wrote. */
export async function GET() {
  try {
    const user = await getAppUserFromSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (user.role !== "CUSTOMER") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const rows = await prisma.review.findMany({
      where: { customerId: user.id },
      include: {
        property: {
          include: {
            location: true,
            category: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      {
        reviews: rows.map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          createdAt: r.createdAt.toISOString(),
          property: {
            id: r.property.id,
            title: r.property.title,
            price: r.property.price.toString(),
            location: {
              city: r.property.location.city,
              area: r.property.location.area,
            },
            category: { name: r.property.category.name, type: r.property.category.type },
          },
        })),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Portal reviews GET failed:", error);
    return NextResponse.json({ error: "Failed to load reviews." }, { status: 500 });
  }
}

/** Customer: add or update a review for a property (one per listing). */
export async function POST(request: NextRequest) {
  try {
    const user = await getAppUserFromSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (user.role !== "CUSTOMER") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const payload = parseReviewBody(await request.json());
    if (!payload) {
      return NextResponse.json(
        { error: "propertyId, rating (1–5), and comment are required." },
        { status: 400 },
      );
    }

    const { saved, updated } = await runPivotalTransaction(async (tx) => {
      const property = await tx.property.findUnique({
        where: { id: payload.propertyId },
        select: { id: true },
      });

      if (!property) {
        throw new Error("PROPERTY_NOT_FOUND");
      }

      return withSavepoint(tx, "review_write", async () => {
        const existing = await tx.review.findFirst({
          where: { customerId: user.id, propertyId: payload.propertyId },
        });

        const row = existing
          ? await tx.review.update({
              where: { id: existing.id },
              data: { rating: payload.rating, comment: payload.comment },
              include: {
                property: {
                  include: { location: true, category: true },
                },
              },
            })
          : await tx.review.create({
              data: {
                propertyId: payload.propertyId,
                customerId: user.id,
                rating: payload.rating,
                comment: payload.comment,
              },
              include: {
                property: {
                  include: { location: true, category: true },
                },
              },
            });

        return { saved: row, updated: Boolean(existing) };
      });
    });

    return NextResponse.json(
      {
        review: {
          id: saved.id,
          rating: saved.rating,
          comment: saved.comment,
          createdAt: saved.createdAt.toISOString(),
          property: {
            id: saved.property.id,
            title: saved.property.title,
            price: saved.property.price.toString(),
            location: {
              city: saved.property.location.city,
              area: saved.property.location.area,
            },
            category: {
              name: saved.property.category.name,
              type: saved.property.category.type,
            },
          },
        },
        updated,
      },
      { status: updated ? 200 : 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "PROPERTY_NOT_FOUND") {
      return NextResponse.json({ error: "Property not found." }, { status: 404 });
    }
    console.error("Portal reviews POST failed:", error);
    return NextResponse.json({ error: "Failed to save review." }, { status: 500 });
  }
}
