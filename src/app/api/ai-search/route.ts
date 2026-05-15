import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import type { PortalAiFilters } from "@/lib/ai-search/portal-filters";
import { getAppUserFromSession } from "@/lib/auth/get-app-user";
import { groqChatJsonContent, GroqChatError, isGroqRateLimitError } from "@/lib/groq/chat-json";
import {
  bedroomPatternsOrFromMin,
  locationWhereAnyFieldContains,
  parseMaxPriceFilter,
} from "@/lib/property-search/query-helpers";
import { runPivotalTransaction, tryWithSavepoint } from "@/lib/prisma/pivotal-transaction";

const modelOutputSchemaDescription = `Return ONLY one valid JSON object with exactly these keys:
{
  "city": string | null,
  "maxPrice": number | null,
  "minBedrooms": number | null
}

Rules:
- Use null if a value is not present in the user query.
- maxPrice must be a number without commas or currency symbols (e.g. 15000000 for 15M).
- minBedrooms must be a whole number (minimum number of bedrooms requested).
- Do not add any extra keys.
- Do not include markdown fences or extra text.`;

const normalizeFilters = (raw: unknown): PortalAiFilters => {
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

  const bed = maybeNumber(objectValue.minBedrooms);

  return {
    city: maybeString(objectValue.city),
    maxPrice: parseMaxPriceFilter(objectValue.maxPrice),
    minBedrooms: bed !== null ? Math.max(1, Math.trunc(bed)) : null,
  };
};

const extractFiltersWithGroq = async (query: string): Promise<PortalAiFilters> => {
  const text = await groqChatJsonContent(
    "You extract structured real-estate search filters from user text. Output valid JSON only.",
    `${modelOutputSchemaDescription}\n\nUser query: ${query}`,
  );
  const parsed = JSON.parse(text) as unknown;
  return normalizeFilters(parsed);
};

const buildPropertyWhere = (filters: PortalAiFilters): Prisma.PropertyWhereInput => {
  const where: Prisma.PropertyWhereInput = {
    status: "AVAILABLE",
  };

  if (filters.maxPrice !== null) {
    where.price = { lte: new Prisma.Decimal(filters.maxPrice) };
  }

  const locationClause = locationWhereAnyFieldContains([filters.city]);
  if (locationClause) {
    where.location = locationClause;
  }

  if (filters.minBedrooms !== null) {
    where.OR = bedroomPatternsOrFromMin(filters.minBedrooms);
  }

  return where;
};

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const query =
      typeof body === "object" && body !== null && "query" in body
        ? String((body as { query: unknown }).query).trim()
        : "";

    if (!query) {
      return NextResponse.json({ error: "Missing or empty \"query\" in body." }, { status: 400 });
    }

    const appUser = await getAppUserFromSession();
    if (!appUser) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const filters = await extractFiltersWithGroq(query);

    const { properties, relaxedBedroomFilter } = await runPivotalTransaction(async (tx) => {
      let where = buildPropertyWhere(filters);

      let rows = await tx.property.findMany({
        where,
        include: {
          location: true,
          category: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      let relaxed = false;
      if (rows.length === 0 && filters.minBedrooms !== null) {
        where = buildPropertyWhere({ ...filters, minBedrooms: null });
        rows = await tx.property.findMany({
          where,
          include: { location: true, category: true },
          orderBy: { createdAt: "desc" },
        });
        relaxed = rows.length > 0;
      }

      const logResult = await tryWithSavepoint(tx, "ai_log_insert", async () =>
        tx.aiLog.create({
          data: {
            userId: appUser.id,
            queryText: query,
            extractedFilters: filters,
          },
        }),
      );

      if (!logResult.ok) {
        console.error("AiLog insert failed (search results still returned):", logResult.error);
      }

      return { properties: rows, relaxedBedroomFilter: relaxed };
    });

    const payload = {
      query,
      filters,
      relaxedBedroomFilter,
      count: properties.length,
      properties: properties.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        price: p.price.toString(),
        status: p.status,
        createdAt: p.createdAt.toISOString(),
        location: {
          city: p.location.city,
          area: p.location.area,
          zipCode: p.location.zipCode,
        },
        category: {
          name: p.category.name,
          type: p.category.type,
        },
      })),
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error("AI search failed:", error);

    if (isGroqRateLimitError(error)) {
      const headers = new Headers();
      if (error.retryAfterSeconds !== undefined) {
        headers.set("Retry-After", String(error.retryAfterSeconds));
      }
      return NextResponse.json(
        {
          error:
            "Groq rate limit reached. Wait and try again, or check your plan and API usage at console.groq.com.",
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

    return NextResponse.json({ error: "Failed to process AI search." }, { status: 500 });
  }
}
