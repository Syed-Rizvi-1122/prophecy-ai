import { NextResponse } from "next/server";

import { getAppUserFromSession } from "@/lib/auth/get-app-user";
import { prisma } from "@/lib/prisma";

/** Authenticated customer: read reviews for a listing (for browse UI). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: propertyId } = await params;
    const user = await getAppUserFromSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (user.role !== "CUSTOMER") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found." }, { status: 404 });
    }

    const rows = await prisma.review.findMany({
      where: { propertyId },
      include: {
        customer: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const avg =
      rows.length > 0
        ? rows.reduce((s, r) => s + r.rating, 0) / rows.length
        : null;

    return NextResponse.json(
      {
        averageRating: avg !== null ? Math.round(avg * 10) / 10 : null,
        count: rows.length,
        reviews: rows.map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          createdAt: r.createdAt.toISOString(),
          customer: { fullName: r.customer.fullName },
        })),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Property reviews GET failed:", error);
    return NextResponse.json({ error: "Failed to load reviews." }, { status: 500 });
  }
}
