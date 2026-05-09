import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

type CreatePropertyBody = {
  title: string;
  price: number;
  description: string;
  agentId: string;
  locationId: number;
  categoryId: number;
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const parseCreatePropertyBody = (raw: unknown): CreatePropertyBody => {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid JSON body.");
  }

  const body = raw as Record<string, unknown>;

  const priceValue =
    typeof body.price === "number"
      ? body.price
      : typeof body.price === "string"
        ? Number(body.price)
        : NaN;

  const locationIdValue =
    typeof body.locationId === "number"
      ? body.locationId
      : typeof body.locationId === "string"
        ? Number(body.locationId)
        : NaN;

  const categoryIdValue =
    typeof body.categoryId === "number"
      ? body.categoryId
      : typeof body.categoryId === "string"
        ? Number(body.categoryId)
        : NaN;

  if (
    !isNonEmptyString(body.title) ||
    !Number.isFinite(priceValue) ||
    priceValue <= 0 ||
    !isNonEmptyString(body.description) ||
    !isNonEmptyString(body.agentId) ||
    !Number.isInteger(locationIdValue) ||
    locationIdValue <= 0 ||
    !Number.isInteger(categoryIdValue) ||
    categoryIdValue <= 0
  ) {
    throw new Error("Missing or invalid property fields.");
  }

  return {
    title: body.title.trim(),
    price: priceValue,
    description: body.description.trim(),
    agentId: body.agentId.trim(),
    locationId: locationIdValue,
    categoryId: categoryIdValue,
  };
};

export async function POST(request: NextRequest) {
  try {
    const payload = parseCreatePropertyBody(await request.json());

    const createdProperty = await prisma.$transaction(async (tx) => {
      const agent = await tx.user.findUnique({
        where: { id: payload.agentId },
        select: { id: true, role: true },
      });

      if (!agent) {
        throw new Error("Agent not found.");
      }

      if (agent.role !== "AGENT" && agent.role !== "ADMIN") {
        throw new Error("Only AGENT or ADMIN can add properties.");
      }

      const location = await tx.location.findUnique({
        where: {
          id: payload.locationId,
        },
      });

      if (!location) {
        throw new Error("Location not found.");
      }

      const category = await tx.category.findUnique({
        where: {
          id: payload.categoryId,
        },
      });

      if (!category) {
        throw new Error("Category not found.");
      }

      return tx.property.create({
        data: {
          title: payload.title,
          description: payload.description,
          price: new Prisma.Decimal(payload.price),
          status: "AVAILABLE",
          agentId: payload.agentId,
          locationId: payload.locationId,
          categoryId: payload.categoryId,
        },
        include: {
          location: true,
          category: true,
          agent: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });
    });

    const webhookUrl = process.env.N8N_WEBHOOK_URL?.trim();
    if (webhookUrl) {
      try {
        const webhookRes = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: createdProperty.title,
            price: createdProperty.price.toString(),
            description: createdProperty.description,
            status: createdProperty.status,
          }),
        });
        if (webhookRes.ok) {
          console.log("n8n Automation Triggered");
        } else {
          console.error(
            "n8n webhook returned non-success status:",
            webhookRes.status,
            webhookRes.statusText,
          );
        }
      } catch (webhookError) {
        console.error("n8n webhook request failed:", webhookError);
      }
    }

    return NextResponse.json(
      {
        message: "Property created successfully.",
        property: createdProperty,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const statusCode =
      message.includes("Missing or invalid") || message.includes("Invalid JSON")
        ? 400
        : message.includes("not found") || message.includes("Only AGENT")
          ? 403
          : 500;

    return NextResponse.json({ error: message }, { status: statusCode });
  }
}

export async function GET() {
  try {
    const properties = await prisma.property.findMany({
      include: {
        location: true,
        category: true,
        agent: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ properties }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch properties:", error);
    return NextResponse.json({ error: "Failed to fetch properties." }, { status: 500 });
  }
}
