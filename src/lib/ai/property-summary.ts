import { groqChatJsonContent } from "@/lib/groq/chat-json";

export type PropertySummaryBullets = {
  keyFeature: string;
  valueAssessment: string;
  locationPerk: string;
};

const SYSTEM = `You are a real-estate assistant. Summarize a single listing for buyers.
Return ONLY valid JSON with exactly these keys (strings, no extra keys, no markdown):
{
  "keyFeature": "one short sentence: standout amenity or trait (e.g. rooms, stories, parking, condition)",
  "valueAssessment": "one short sentence about VALUE FOR MONEY using the EXACT asking price from the listing (repeat the price in words or the same currency string). Say if it reads as budget-friendly, mid-range, or premium for what is described. The listing ALWAYS includes a concrete price — never say pricing is unclear, unknown, or cannot be determined.",
  "locationPerk": "one short sentence: neighborhood or location benefit inferred from city/area and description"
}
Each value must be under 24 words. For keyFeature or locationPerk only, if truly missing you may say "Not specified in listing." Never use vague pricing language in valueAssessment when a price field is present.`;

function normalizeBullet(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const t = value.trim();
  return t.length > 0 ? t : fallback;
}

const VAGUE_VALUE_PHRASES =
  /\b(unclear|not clear|uncertain|unknown|can'?t tell|cannot tell|hard to tell|not enough (info|information)|insufficient|pricing seems unclear|price is unclear|no price|without price)\b/i;

/** If the model hedges despite a definite listing price, replace with an explicit price-forward line. */
function enforceConcreteValueAssessment(text: string, pricePkr: string): string {
  const price = pricePkr.trim();
  if (!price) return text;
  if (VAGUE_VALUE_PHRASES.test(text)) {
    return `Listed at ${price}; compare with similar listings nearby to judge fit for your budget.`;
  }
  const mentionsMoney =
    /\d/.test(text) || /\brs\b/i.test(text) || /pkr/i.test(text) || /₨/.test(text);
  if (!mentionsMoney) {
    return `Asking ${price} — ${text}`.trim();
  }
  return text;
}

export async function summarizeListingForCustomer(input: {
  title: string;
  description: string;
  city: string;
  area: string;
  categoryName: string;
  categoryType: string;
  pricePkr: string;
  priceNumeric: number;
}): Promise<PropertySummaryBullets> {
  const userBlock = `Listing for summarization (the asking price below is authoritative — use it verbatim in valueAssessment):
title: ${input.title}
asking price (PKR, exact): ${input.pricePkr}
numeric price for reference: ${input.priceNumeric}
city: ${input.city}
area: ${input.area}
category: ${input.categoryName} / ${input.categoryType}
description:
${input.description}`;

  const raw = await groqChatJsonContent(SYSTEM, userBlock);
  const parsed = JSON.parse(raw) as Record<string, unknown>;

  const valueAssessment = enforceConcreteValueAssessment(
    normalizeBullet(parsed.valueAssessment, `Asking ${input.pricePkr} for this ${input.categoryType} in ${input.area || input.city}.`),
    input.pricePkr,
  );

  return {
    keyFeature: normalizeBullet(parsed.keyFeature, "Not specified in listing."),
    valueAssessment,
    locationPerk: normalizeBullet(parsed.locationPerk, "Not specified in listing."),
  };
}
