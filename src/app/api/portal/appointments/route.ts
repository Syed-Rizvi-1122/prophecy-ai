import { NextRequest, NextResponse } from "next/server";

import { getAppUserFromSession } from "@/lib/auth/get-app-user";
import { prisma } from "@/lib/prisma";
import { runPivotalTransaction } from "@/lib/prisma/pivotal-transaction";

function parseCreateBody(raw: unknown): { propertyId: string; appointmentDate: string } | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as Record<string, unknown>;
  if (typeof body.propertyId !== "string" || !body.propertyId.trim()) return null;
  if (typeof body.appointmentDate !== "string" || !body.appointmentDate.trim()) return null;
  const d = new Date(body.appointmentDate);
  if (Number.isNaN(d.getTime())) return null;
  return { propertyId: body.propertyId.trim(), appointmentDate: body.appointmentDate };
}

/** Customer: list own viewing appointments. */
export async function GET() {
  try {
    const user = await getAppUserFromSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (user.role !== "CUSTOMER") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const rows = await prisma.appointment.findMany({
      where: { customerId: user.id },
      include: {
        property: {
          include: {
            location: true,
            category: true,
            agent: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
      orderBy: { appointmentDate: "desc" },
    });

    return NextResponse.json(
      {
        appointments: rows.map((a) => ({
          id: a.id,
          appointmentDate: a.appointmentDate.toISOString(),
          status: a.status,
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
    console.error("Portal appointments GET failed:", error);
    return NextResponse.json({ error: "Failed to load appointments." }, { status: 500 });
  }
}

/** Customer: book a viewing for an available listing. */
export async function POST(request: NextRequest) {
  try {
    const user = await getAppUserFromSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (user.role !== "CUSTOMER") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const payload = parseCreateBody(await request.json());
    if (!payload) {
      return NextResponse.json(
        { error: "propertyId and valid appointmentDate are required." },
        { status: 400 },
      );
    }

    const when = new Date(payload.appointmentDate);
    if (when.getTime() < Date.now() - 60_000) {
      return NextResponse.json({ error: "Appointment time must be in the future." }, { status: 400 });
    }

    const created = await runPivotalTransaction(async (tx) => {
      const property = await tx.property.findUnique({
        where: { id: payload.propertyId },
        select: { id: true, status: true },
      });

      if (!property) {
        throw new Error("PROPERTY_NOT_FOUND");
      }
      if (property.status !== "AVAILABLE") {
        throw new Error("NOT_AVAILABLE");
      }

      return tx.appointment.create({
        data: {
          propertyId: property.id,
          customerId: user.id,
          appointmentDate: when,
          status: "Scheduled",
        },
        include: {
          property: {
            include: {
              location: true,
              category: true,
              agent: { select: { id: true, fullName: true, email: true } },
            },
          },
        },
      });
    });

    return NextResponse.json(
      {
        appointment: {
          id: created.id,
          appointmentDate: created.appointmentDate.toISOString(),
          status: created.status,
          property: {
            id: created.property.id,
            title: created.property.title,
            price: created.property.price.toString(),
            location: {
              city: created.property.location.city,
              area: created.property.location.area,
            },
            category: {
              name: created.property.category.name,
              type: created.property.category.type,
            },
            agent: created.property.agent,
          },
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "PROPERTY_NOT_FOUND") {
      return NextResponse.json({ error: "Property not found." }, { status: 404 });
    }
    if (message === "NOT_AVAILABLE") {
      return NextResponse.json(
        { error: "Appointments can only be booked for available listings." },
        { status: 409 },
      );
    }
    console.error("Portal appointments POST failed:", error);
    return NextResponse.json({ error: "Failed to create appointment." }, { status: 500 });
  }
}
