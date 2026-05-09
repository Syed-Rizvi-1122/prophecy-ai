import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { getAppUserFromSession } from "@/lib/auth/get-app-user";
import { groqChatJsonContent, GroqChatError, isGroqRateLimitError } from "@/lib/groq/chat-json";
import {
  bedroomPatternsForExactBedrooms,
  locationWhereAnyFieldContains,
  parseMaxPriceFilter,
} from "@/lib/property-search/query-helpers";
import { prisma } from "@/lib/prisma";

type ExtractedFilters = {
  city: string | null;
  area: string | null;
  maxPrice: number | null;
  bedrooms: number | null;
  propertyType: string | null;
};

const modelOutputSchemaDescription = `Return ONLY one valid JSON object with exactly these keys:
{
  "city": string | null,
  "area": string | null,
  "maxPrice": number | null,
  "bedrooms": number | null,
  "propertyType": string | null
}

Rules:
- Use null if a value is not present in the user query.
- maxPrice must be a number without commas or currency symbols.
- bedrooms must be a whole number.
- Do not add any extra keys.
- Do not include markdown fences or extra text.`;

const normalizeFilters = (raw: unknown): ExtractedFilters => {
  const objectValue = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};

  const maybeNumber = (value: unknown): number | null => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value.replace(/[^\d.]/g, ""));
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };

  const maybeString = (value: unknown): string | null => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const bedroomValue = maybeNumber(objectValue.bedrooms);

  return {
    city: maybeString(objectValue.city),
    area: maybeString(objectValue.area),
    maxPrice: parseMaxPriceFilter(objectValue.maxPrice),
    bedrooms: bedroomValue !== null ? Math.trunc(bedroomValue) : null,
    propertyType: maybeString(objectValue.propertyType),
  };
};

const extractFiltersWithGroq = async (query: string): Promise<ExtractedFilters> => {
  const text = await groqChatJsonContent(
    "You extract structured real-estate search filters from user text. Output valid JSON only.",
    `${modelOutputSchemaDescription}\n\nUser query: ${query}`,
  );
  const parsed = JSON.parse(text) as unknown;
  return normalizeFilters(parsed);
};

const buildPropertyWhere = (filters: ExtractedFilters): Prisma.PropertyWhereInput => {
  const where: Prisma.PropertyWhereInput = {
    status: "AVAILABLE",
  };

  if (filters.maxPrice !== null) {
    where.price = { lte: new Prisma.Decimal(filters.maxPrice) };
  }

  const locationClause = locationWhereAnyFieldContains([filters.city, filters.area]);
  if (locationClause) {
    where.location = locationClause;
  }

  if (filters.propertyType) {
    where.category = {
      OR: [
        { type: { contains: filters.propertyType, mode: "insensitive" } },
        { name: { contains: filters.propertyType, mode: "insensitive" } },
      ],
    };
  }

  if (filters.bedrooms !== null) {
    where.OR = bedroomPatternsForExactBedrooms(filters.bedrooms);
  }

  return where;
};

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("query")?.trim();

    if (!query) {
      return NextResponse.json(
        { error: "Missing required query parameter: query" },
        { status: 400 },
      );
    }

    const appUser = await getAppUserFromSession();
    if (!appUser) {
      return NextResponse.json(
        { error: "Authentication required for smart search." },
        { status: 401 },
      );
    }

    const userId = appUser.id;

    const filters = await extractFiltersWithGroq(query);
    let where = buildPropertyWhere(filters);

    let properties = await prisma.property.findMany({
      where,
      include: {
        location: true,
        category: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    let relaxedBedroomFilter = false;
    if (properties.length === 0 && filters.bedrooms !== null) {
      where = buildPropertyWhere({ ...filters, bedrooms: null });
      properties = await prisma.property.findMany({
        where,
        include: { location: true, category: true },
        orderBy: { createdAt: "desc" },
      });
      relaxedBedroomFilter = properties.length > 0;
    }

    await prisma.aiLog.create({
      data: {
        userId,
        queryText: query,
        extractedFilters: filters,
      },
    });

    return NextResponse.json(
      {
        query,
        filters,
        relaxedBedroomFilter,
        count: properties.length,
        properties,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Smart search failed:", error);

    if (isGroqRateLimitError(error)) {
      const headers = new Headers();
      if (error.retryAfterSeconds !== undefined) {
        headers.set("Retry-After", String(error.retryAfterSeconds));
      }
      return NextResponse.json(
        {
          error:
            "Groq rate limit reached. Wait and try again, or check your plan at console.groq.com.",
          retryAfterSeconds: error.retryAfterSeconds,
        },
        { status: 429, headers },
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "The model returned invalid JSON. Please try again." },
        { status: 502 },
      );
    }

    if (error instanceof GroqChatError) {
      return NextResponse.json(
        { error: error.message || "Groq request failed." },
        { status: error.status >= 400 && error.status < 600 ? error.status : 502 },
      );
    }

    if (error instanceof Error && error.message.includes("GROQ_API_KEY")) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        error: "Failed to process smart search request.",
      },
      { status: 500 },
    );
  }
}
