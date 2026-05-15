import { NextRequest, NextResponse } from "next/server";

import { getAppUserFromSession } from "@/lib/auth/get-app-user";
import { runPivotalTransaction } from "@/lib/prisma/pivotal-transaction";

/** Customer: cancel own appointment (status → Cancelled). */
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
    if (user.role !== "CUSTOMER") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const raw = await request.json();
    const status =
      raw && typeof raw === "object" && typeof (raw as { status?: unknown }).status === "string"
        ? (raw as { status: string }).status
        : null;

    if (status !== "Cancelled") {
      return NextResponse.json({ error: "Customers may only set status to Cancelled." }, { status: 400 });
    }

    const updated = await runPivotalTransaction(async (tx) => {
      const existing = await tx.appointment.findFirst({
        where: { id, customerId: user.id },
      });

      if (!existing) {
        throw new Error("NOT_FOUND");
      }

      if (existing.status === "Cancelled") {
        throw new Error("ALREADY_CANCELLED");
      }

      return tx.appointment.update({
        where: { id },
        data: { status: "Cancelled" },
      });
    });

    return NextResponse.json(
      {
        appointment: {
          id: updated.id,
          appointmentDate: updated.appointmentDate.toISOString(),
          status: updated.status,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "NOT_FOUND") {
      return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
    }
    if (message === "ALREADY_CANCELLED") {
      return NextResponse.json({ error: "Already cancelled." }, { status: 409 });
    }
    console.error("Portal appointment PATCH failed:", error);
    return NextResponse.json({ error: "Failed to update appointment." }, { status: 500 });
  }
}
