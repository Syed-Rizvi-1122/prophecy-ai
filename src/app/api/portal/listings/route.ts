import { NextResponse } from "next/server";

import { getAppUserFromSession } from "@/lib/auth/get-app-user";
import { prisma } from "@/lib/prisma";

/** Customer-only: available listings for the public catalog. */
export async function GET() {
  try {
    const user = await getAppUserFromSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (user.role !== "CUSTOMER") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const properties = await prisma.property.findMany({
      where: { status: "AVAILABLE" },
      include: {
        location: true,
        category: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      {
        properties: properties.map((p) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          price: p.price.toString(),
          status: p.status,
          createdAt: p.createdAt.toISOString(),
          location: {
            city: p.location.city,
            area: p.location.area,
            zipCode: p.location.zipCode,
          },
          category: {
            name: p.category.name,
            type: p.category.type,
          },
        })),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Portal listings failed:", error);
    return NextResponse.json({ error: "Failed to load listings." }, { status: 500 });
  }
}
