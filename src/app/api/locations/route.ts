import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

type CreateLocationBody = {
  city: string;
  area: string;
  zipCode: string;
};

const parseBody = (raw: unknown): CreateLocationBody => {
  if (!raw || typeof raw !== "object") throw new Error("Invalid JSON body.");
  const body = raw as Record<string, unknown>;

  if (
    typeof body.city !== "string" ||
    !body.city.trim() ||
    typeof body.area !== "string" ||
    !body.area.trim() ||
    typeof body.zipCode !== "string" ||
    !body.zipCode.trim()
  ) {
    throw new Error("city, area and zipCode are required.");
  }

  return {
    city: body.city.trim(),
    area: body.area.trim(),
    zipCode: body.zipCode.trim(),
  };
};

export async function GET() {
  try {
    const locations = await prisma.location.findMany({
      include: { _count: { select: { properties: true } } },
      orderBy: { id: "desc" },
    });

    return NextResponse.json({ locations }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch locations:", error);
    return NextResponse.json({ error: "Failed to fetch locations." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = parseBody(await request.json());
    const location = await prisma.location.create({ data: payload });
    return NextResponse.json({ location }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("required") || message.includes("Invalid JSON") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
