import { NextRequest, NextResponse } from "next/server";

import { summarizeListingForCustomer } from "@/lib/ai/property-summary";
import { getAppUserFromSession } from "@/lib/auth/get-app-user";
import { GroqChatError, isGroqRateLimitError } from "@/lib/groq/chat-json";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: NextRequest,
  context: Readonly<{ params: Promise<{ id: string }> }>,
) {
  try {
    const user = await getAppUserFromSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (user.role !== "CUSTOMER") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Missing property id." }, { status: 400 });
    }

    const property = await prisma.property.findFirst({
      where: { id, status: "AVAILABLE" },
      include: { location: true, category: true },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found." }, { status: 404 });
    }

    const priceNumeric = Number(property.price.toString());
    const pricePkr = new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 0,
    }).format(priceNumeric);

    const summary = await summarizeListingForCustomer({
      title: property.title,
      description: property.description,
      city: property.location.city,
      area: property.location.area,
      categoryName: property.category.name,
      categoryType: property.category.type,
      pricePkr,
      priceNumeric,
    });

    return NextResponse.json({ summary }, { status: 200 });
  } catch (error) {
    console.error("Property summarize failed:", error);

    if (isGroqRateLimitError(error)) {
      return NextResponse.json(
        {
          error: "AI service rate limited. Try again shortly.",
          retryAfterSeconds: error.retryAfterSeconds,
        },
        { status: 429 },
      );
    }

    if (error instanceof GroqChatError) {
      return NextResponse.json(
        { error: error.message || "AI request failed." },
        { status: error.status >= 400 && error.status < 600 ? error.status : 502 },
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "AI returned invalid data. Try again." }, { status: 502 });
    }

    if (error instanceof Error && error.message.includes("GROQ_API_KEY")) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: "Failed to summarize property." }, { status: 500 });
  }
}
