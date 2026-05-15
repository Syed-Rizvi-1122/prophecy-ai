import { NextRequest, NextResponse } from "next/server";

import { getAppUserFromSession } from "@/lib/auth/get-app-user";
import { runPivotalTransaction } from "@/lib/prisma/pivotal-transaction";

const ALLOWED = new Set(["Scheduled", "Completed", "Cancelled"]);

/** Agent / admin: update appointment status for listings the agent owns (or any, if admin). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getAppUserFromSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (user.role !== "AGENT" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const raw = await request.json();
    const status =
      raw && typeof raw === "object" && typeof (raw as { status?: unknown }).status === "string"
        ? (raw as { status: string }).status
        : null;

    if (!status || !ALLOWED.has(status)) {
      return NextResponse.json(
        { error: "status must be one of: Scheduled, Completed, Cancelled." },
        { status: 400 },
      );
    }

    const updated = await runPivotalTransaction(async (tx) => {
      const existing = await tx.appointment.findUnique({
        where: { id },
        include: { property: { select: { agentId: true } } },
      });

      if (!existing) {
        throw new Error("NOT_FOUND");
      }

      if (user.role === "AGENT" && existing.property.agentId !== user.id) {
        throw new Error("FORBIDDEN");
      }

      return tx.appointment.update({
        where: { id },
        data: { status },
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
      });
    });

    return NextResponse.json(
      {
        appointment: {
          id: updated.id,
          appointmentDate: updated.appointmentDate.toISOString(),
          status: updated.status,
          customer: updated.customer,
          property: {
            id: updated.property.id,
            title: updated.property.title,
            price: updated.property.price.toString(),
            status: updated.property.status,
            location: {
              city: updated.property.location.city,
              area: updated.property.location.area,
            },
            category: {
              name: updated.property.category.name,
              type: updated.property.category.type,
            },
            agent: updated.property.agent,
          },
        },
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "NOT_FOUND") {
      return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
    }
    if (message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    console.error("Agent appointment PATCH failed:", error);
    return NextResponse.json({ error: "Failed to update appointment." }, { status: 500 });
  }
}
