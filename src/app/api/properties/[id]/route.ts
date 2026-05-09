import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

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

    const updated = await prisma.property.update({
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

    return NextResponse.json({ property: updated }, { status: 200 });
  } catch (error) {
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
    await prisma.property.delete({ where: { id } });
    return NextResponse.json({ message: "Property deleted." }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete property:", error);
    return NextResponse.json({ error: "Failed to delete property." }, { status: 500 });
  }
}
