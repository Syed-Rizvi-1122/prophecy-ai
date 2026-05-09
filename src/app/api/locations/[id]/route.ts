import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

type UpdateLocationBody = {
  city?: string;
  area?: string;
  zipCode?: string;
};

const parseBody = (raw: unknown): UpdateLocationBody => {
  if (!raw || typeof raw !== "object") return {};
  const body = raw as Record<string, unknown>;
  const next: UpdateLocationBody = {};
  if (typeof body.city === "string" && body.city.trim()) next.city = body.city.trim();
  if (typeof body.area === "string" && body.area.trim()) next.area = body.area.trim();
  if (typeof body.zipCode === "string" && body.zipCode.trim()) next.zipCode = body.zipCode.trim();
  return next;
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const payload = parseBody(await request.json());
    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: "No valid fields provided." }, { status: 400 });
    }

    const location = await prisma.location.update({
      where: { id: Number(id) },
      data: payload,
    });

    return NextResponse.json({ location }, { status: 200 });
  } catch (error) {
    console.error("Failed to update location:", error);
    return NextResponse.json({ error: "Failed to update location." }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await prisma.location.delete({ where: { id: Number(id) } });
    return NextResponse.json({ message: "Location deleted." }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete location:", error);
    return NextResponse.json({ error: "Failed to delete location." }, { status: 500 });
  }
}
