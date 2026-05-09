"use client";

import { FormEvent, useState } from "react";

import type { PortalAiFilters } from "@/lib/ai-search/portal-filters";

type PropertyCard = {
  id: string;
  title: string;
  description: string;
  price: string;
  status: string;
  location: { city: string; area: string; zipCode: string };
  category: { name: string; type: string };
};

type SearchResult = {
  query: string;
  count: number;
  filters: PortalAiFilters;
  relaxedBedroomFilter?: boolean;
  properties: PropertyCard[];
};

function formatPkr(amount: string) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return amount;
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(n);
}

function filterSummary(f: PortalAiFilters): string {
  const parts: string[] = [];
  if (f.city) parts.push(`City: ${f.city}`);
  if (f.maxPrice != null) parts.push(`Max ${formatPkr(String(f.maxPrice))}`);
  if (f.minBedrooms != null) parts.push(`≥ ${f.minBedrooms} bed`);
  return parts.length ? parts.join(" · ") : "No structured filters (showing available listings)";
}

export function PortalSearch() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResult | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const res = await fetch("/api/ai-search", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = (await res.json()) as SearchResult & {
        error?: string;
        retryAfterSeconds?: number;
      };

      if (!res.ok) {
        const msg = data.error ?? "Search failed.";
        const wait =
          typeof data.retryAfterSeconds === "number"
            ? ` Suggested wait: ~${data.retryAfterSeconds}s.`
            : "";
        throw new Error(msg + wait);
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-3xl flex-col">
      <section className="glass-panel mb-8 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-slate-100">Natural language search</h2>
        <p className="mt-1 text-sm text-slate-400">
          Describe what you need; we turn it into filters and match available listings.
        </p>
      </section>

      <main className="flex flex-1 flex-col">
        <form onSubmit={(e) => void onSubmit(e)} className="flex flex-1 flex-col gap-6">
          <label className="flex flex-1 flex-col gap-3">
            <span className="sr-only">Describe what you are looking for</span>
            <textarea
              className="min-h-[200px] w-full resize-y rounded-xl border border-slate-700/80 bg-slate-950/40 px-4 py-4 text-base leading-relaxed text-slate-100 placeholder:text-slate-600 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500/40"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Looking for a flat in Karachi under 15M with at least 2 bedrooms"
              rows={8}
              required
            />
          </label>

          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="rounded-xl bg-slate-100 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Searching…" : "Search with AI"}
          </button>

          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
        </form>

        {result ? (
          <section
            className="mt-12 border-t border-slate-800/80 pt-10"
            aria-labelledby="results-heading"
          >
            <h2 id="results-heading" className="text-lg font-semibold text-slate-100">
              Results
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {result.count} propert{result.count === 1 ? "y" : "ies"} · {filterSummary(result.filters)}
            </p>
            {result.relaxedBedroomFilter ? (
              <p className="mt-2 text-xs text-amber-200/90">
                No listings matched the bedroom wording in titles/descriptions; showing other matches for
                your location and price instead.
              </p>
            ) : null}

            {result.properties.length === 0 ? (
              <p className="mt-8 text-sm text-slate-500">No matches. Try broadening your query.</p>
            ) : (
              <ul className="mt-8 space-y-4">
                {result.properties.map((p) => (
                  <li
                    key={p.id}
                    className="glass-panel rounded-2xl border border-slate-700/50 p-5 transition hover:border-cyan-500/25"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="font-medium text-slate-100">{p.title}</h3>
                      <span className="shrink-0 text-sm font-semibold text-slate-200">
                        {formatPkr(p.price)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {p.location.city}
                      {p.location.area ? `, ${p.location.area}` : ""} · {p.category.name} ·{" "}
                      {p.category.type}
                    </p>
                    <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-400">
                      {p.description}
                    </p>
                    <p className="mt-2 text-[10px] uppercase tracking-wider text-slate-600">{p.status}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
      </main>
    </div>
  );
}
