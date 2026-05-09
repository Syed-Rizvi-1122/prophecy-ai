/** Filters returned by the LLM (Groq) and persisted on AiLog.extractedFilters */
export type PortalAiFilters = {
  city: string | null;
  maxPrice: number | null;
  minBedrooms: number | null;
};
