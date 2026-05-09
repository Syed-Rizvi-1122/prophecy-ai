import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

type CreateCategoryBody = {
  name: string;
  type: string;
};

const parseBody = (raw: unknown): CreateCategoryBody => {
  if (!raw || typeof raw !== "object") throw new Error("Invalid JSON body.");
  const body = raw as Record<string, unknown>;

  if (
    typeof body.name !== "string" ||
    !body.name.trim() ||
    typeof body.type !== "string" ||
    !body.type.trim()
  ) {
    throw new Error("name and type are required.");
  }

  return {
    name: body.name.trim(),
    type: body.type.trim(),
  };
};

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      include: { _count: { select: { properties: true } } },
      orderBy: { id: "desc" },
    });

    return NextResponse.json({ categories }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return NextResponse.json({ error: "Failed to fetch categories." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = parseBody(await request.json());
    const category = await prisma.category.create({ data: payload });
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("required") || message.includes("Invalid JSON") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
