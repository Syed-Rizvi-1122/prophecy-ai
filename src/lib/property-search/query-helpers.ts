import type { Prisma } from "@prisma/client";

/**
 * Parse max price from AI output (number or strings like "15M", "1.2 crore", "15000000").
 */
export function parseMaxPriceFilter(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return normalizePkrMaxPriceNumber(value);
  }
  if (typeof value === "string") {
    const parsed = parsePriceFromString(value);
    return parsed !== null ? normalizePkrMaxPriceNumber(parsed) : null;
  }
  return null;
}

function parsePriceFromString(raw: string): number | null {
  const s = raw.trim().toLowerCase().replace(/,/g, "");
  if (!s) return null;

  const withUnit = s.match(/^(\d+(?:\.\d+)?)\s*(million|mn|m\b|lac|lakh|l\b|crore|cr|k\b)?$/);
  if (withUnit) {
    const num = parseFloat(withUnit[1]);
    if (!Number.isFinite(num)) return null;
    const u = (withUnit[2] || "").replace(/\.$/, "");
    if (u === "million" || u === "mn" || u === "m") return Math.round(num * 1_000_000);
    if (u === "lac" || u === "lakh" || u === "l") return Math.round(num * 100_000);
    if (u === "crore" || u === "cr") return Math.round(num * 10_000_000);
    if (u === "k") return Math.round(num * 1000);
    return Math.round(num);
  }

  const digits = s.replace(/[^\d.]/g, "");
  if (!digits) return null;
  const n = parseFloat(digits);
  return Number.isFinite(n) ? n : null;
}

/**
 * If the model returns a small integer, treat as "N million PKR" shorthand.
 * Full amounts (>= 1M) pass through unchanged.
 */
function normalizePkrMaxPriceNumber(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return n;
  if (n >= 1_000_000) return Math.round(n);
  // Common LLM mistake: return 15 for "15M PKR" — treat small integers as millions.
  if (Number.isInteger(n) && n >= 1 && n <= 99) return n * 1_000_000;
  return Math.round(n);
}

/** Match location if any non-empty term appears in city OR area (typical for PK listings). */
export function locationWhereAnyFieldContains(
  terms: Array<string | null | undefined>,
): Prisma.LocationWhereInput | undefined {
  const cleaned = [...new Set(terms.map((t) => (typeof t === "string" ? t.trim() : "")).filter(Boolean))];
  if (cleaned.length === 0) return undefined;

  const andClauses: Prisma.LocationWhereInput[] = cleaned.map((term) => ({
    OR: [
      { city: { contains: term, mode: "insensitive" } },
      { area: { contains: term, mode: "insensitive" } },
    ],
  }));

  return andClauses.length === 1 ? andClauses[0] : { AND: andClauses };
}

/** Infer bedrooms from title/description (no dedicated column). Includes BHK / common shorthands. */
export function bedroomPatternsOrFromMin(minBedrooms: number): Prisma.PropertyWhereInput[] {
  const min = Math.max(1, Math.trunc(minBedrooms));
  const maxBed = 12;
  const or: Prisma.PropertyWhereInput[] = [];
  for (let n = min; n <= maxBed; n++) {
    const variants = [
      `${n} bed`,
      `${n}bed`,
      `${n} bedroom`,
      `${n}-bed`,
      `${n} bhk`,
      `${n}bhk`,
      `${n} bdrm`,
      `${n}-bhk`,
      `${n} br`,
      `${n}br`,
    ];
    for (const v of variants) {
      or.push({ title: { contains: v, mode: "insensitive" } });
      or.push({ description: { contains: v, mode: "insensitive" } });
    }
  }
  return or;
}

/** Exact bedroom count (smart search); smaller OR list than min..12 range. */
export function bedroomPatternsForExactBedrooms(bedrooms: number): Prisma.PropertyWhereInput[] {
  const n = Math.max(1, Math.trunc(bedrooms));
  const variants = [
    `${n} bed`,
    `${n}bed`,
    `${n} bedroom`,
    `${n}-bed`,
    `${n} bhk`,
    `${n}bhk`,
    `${n} bdrm`,
    `${n}-bhk`,
  ];
  const or: Prisma.PropertyWhereInput[] = [];
  for (const v of variants) {
    or.push({ title: { contains: v, mode: "insensitive" } });
    or.push({ description: { contains: v, mode: "insensitive" } });
  }
  return or;
}
