import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { runPivotalTransaction } from "@/lib/prisma/pivotal-transaction";

type UpdatePropertyBody = {
  title?: string;
  price?: number;
  description?: string;
  status?: "AVAILABLE" | "SOLD" | "RENTED";
  locationId?: number;
  categoryId?: number;
  agentId?: string;
};

const parseUpdateBody = (raw: unknown): UpdatePropertyBody => {
  if (!raw || typeof raw !== "object") return {};
  const body = raw as Record<string, unknown>;
  const next: UpdatePropertyBody = {};

  if (typeof body.title === "string" && body.title.trim()) next.title = body.title.trim();
  if (typeof body.description === "string" && body.description.trim()) {
    next.description = body.description.trim();
  }
  if (typeof body.price === "number" && Number.isFinite(body.price) && body.price > 0) {
    next.price = body.price;
  }
  if (body.status === "AVAILABLE" || body.status === "SOLD" || body.status === "RENTED") {
    next.status = body.status;
  }
  if (typeof body.locationId === "number" && Number.isInteger(body.locationId)) {
    next.locationId = body.locationId;
  }
  if (typeof body.categoryId === "number" && Number.isInteger(body.categoryId)) {
    next.categoryId = body.categoryId;
  }
  if (typeof body.agentId === "string" && body.agentId.trim()) {
    next.agentId = body.agentId.trim();
  }

  return next;
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const payload = parseUpdateBody(await request.json());

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: "No valid fields provided." }, { status: 400 });
    }

    const updated = await runPivotalTransaction(async (tx) => {
      const current = await tx.property.findUnique({ where: { id }, select: { id: true } });
      if (!current) {
        throw new Error("NOT_FOUND");
      }

      if (payload.locationId !== undefined) {
        const loc = await tx.location.findUnique({ where: { id: payload.locationId } });
        if (!loc) throw new Error("LOCATION_NOT_FOUND");
      }
      if (payload.categoryId !== undefined) {
        const cat = await tx.category.findUnique({ where: { id: payload.categoryId } });
        if (!cat) throw new Error("CATEGORY_NOT_FOUND");
      }
      if (payload.agentId) {
        const agent = await tx.user.findUnique({
          where: { id: payload.agentId },
          select: { role: true },
        });
        if (!agent || (agent.role !== "AGENT" && agent.role !== "ADMIN")) {
          throw new Error("AGENT_INVALID");
        }
      }

      return tx.property.update({
        where: { id },
        data: {
          ...(payload.title ? { title: payload.title } : {}),
          ...(payload.description ? { description: payload.description } : {}),
          ...(payload.price !== undefined ? { price: new Prisma.Decimal(payload.price) } : {}),
          ...(payload.status ? { status: payload.status } : {}),
          ...(payload.locationId !== undefined ? { locationId: payload.locationId } : {}),
          ...(payload.categoryId !== undefined ? { categoryId: payload.categoryId } : {}),
          ...(payload.agentId ? { agentId: payload.agentId } : {}),
        },
        include: {
          location: true,
          category: true,
          agent: { select: { id: true, fullName: true, email: true } },
        },
      });
    });

    return NextResponse.json({ property: updated }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "NOT_FOUND") {
      return NextResponse.json({ error: "Property not found." }, { status: 404 });
    }
    if (
      message === "LOCATION_NOT_FOUND" ||
      message === "CATEGORY_NOT_FOUND" ||
      message === "AGENT_INVALID"
    ) {
      return NextResponse.json(
        { error: "Invalid location, category, or agent." },
        { status: 400 },
      );
    }
    console.error("Failed to update property:", error);
    return NextResponse.json({ error: "Failed to update property." }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await runPivotalTransaction(async (tx) => {
      const row = await tx.property.findUnique({ where: { id }, select: { id: true } });
      if (!row) {
        throw new Error("NOT_FOUND");
      }
      await tx.property.delete({ where: { id } });
    });
    return NextResponse.json({ message: "Property deleted." }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "NOT_FOUND") {
      return NextResponse.json({ error: "Property not found." }, { status: 404 });
    }
    console.error("Failed to delete property:", error);
    return NextResponse.json({ error: "Failed to delete property." }, { status: 500 });
  }
}
