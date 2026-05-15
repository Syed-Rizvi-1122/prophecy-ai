import { NextResponse } from "next/server";

import { getAppUserFromSession } from "@/lib/auth/get-app-user";
import { prisma } from "@/lib/prisma";

/** Agent: appointments on their listings. Admin: all appointments. */
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

    const rows = await prisma.appointment.findMany({
      where,
      include: {
        property: {
          include: {
            location: true,
            category: true,
            agent: { select: { id: true, fullName: true, email: true } },
          },
        },
        customer: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { appointmentDate: "desc" },
    });

    return NextResponse.json(
      {
        appointments: rows.map((a) => ({
          id: a.id,
          appointmentDate: a.appointmentDate.toISOString(),
          status: a.status,
          customer: a.customer,
          property: {
            id: a.property.id,
            title: a.property.title,
            price: a.property.price.toString(),
            status: a.property.status,
            location: {
              city: a.property.location.city,
              area: a.property.location.area,
            },
            category: { name: a.property.category.name, type: a.property.category.type },
            agent: a.property.agent,
          },
        })),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Agent appointments GET failed:", error);
    return NextResponse.json({ error: "Failed to load appointments." }, { status: 500 });
  }
}
