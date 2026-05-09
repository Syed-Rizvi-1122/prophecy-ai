import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

type UpdateCategoryBody = {
  name?: string;
  type?: string;
};

const parseBody = (raw: unknown): UpdateCategoryBody => {
  if (!raw || typeof raw !== "object") return {};
  const body = raw as Record<string, unknown>;
  const next: UpdateCategoryBody = {};
  if (typeof body.name === "string" && body.name.trim()) next.name = body.name.trim();
  if (typeof body.type === "string" && body.type.trim()) next.type = body.type.trim();
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

    const category = await prisma.category.update({
      where: { id: Number(id) },
      data: payload,
    });

    return NextResponse.json({ category }, { status: 200 });
  } catch (error) {
    console.error("Failed to update category:", error);
    return NextResponse.json({ error: "Failed to update category." }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await prisma.category.delete({ where: { id: Number(id) } });
    return NextResponse.json({ message: "Category deleted." }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete category:", error);
    return NextResponse.json({ error: "Failed to delete category." }, { status: 500 });
  }
}
