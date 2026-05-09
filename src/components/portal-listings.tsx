"use client";

import { useState } from "react";

import type { PropertySummaryBullets } from "@/lib/ai/property-summary";

type Listing = {
  id: string;
  title: string;
  description: string;
  price: string;
  status: string;
  location: { city: string; area: string; zipCode: string };
  category: { name: string; type: string };
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

type PortalListingsProps = {
  initialListings: Listing[];
};

export function PortalListings({ initialListings }: PortalListingsProps) {
  const [summaries, setSummaries] = useState<Record<string, PropertySummaryBullets | "error">>({});
  const [summarizeLoading, setSummarizeLoading] = useState<Record<string, boolean>>({});

  const onSummarize = async (id: string) => {
    setSummarizeLoading((s) => ({ ...s, [id]: true }));
    try {
      const res = await fetch(`/api/portal/properties/${id}/summarize`, {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json()) as { summary?: PropertySummaryBullets; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Summary failed.");
      if (data.summary) {
        setSummaries((prev) => ({ ...prev, [id]: data.summary! }));
      }
    } catch {
      setSummaries((prev) => ({ ...prev, [id]: "error" }));
    } finally {
      setSummarizeLoading((s) => ({ ...s, [id]: false }));
    }
  };

  return (
    <div className="space-y-8">
      <section className="glass-panel rounded-2xl p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-slate-100">Available properties</h2>
        <p className="mt-1 text-sm text-slate-400">
          Every active listing in one place. Use <strong className="text-slate-300">Summarise with AI</strong>{" "}
          for a quick three-point brief from the description.
        </p>
      </section>

      {initialListings.length === 0 ? (
        <p className="text-sm text-slate-500">No available listings right now. Check back later.</p>
      ) : (
        <ul className="space-y-6">
          {initialListings.map((p) => (
            <li
              key={p.id}
              className="glass-panel overflow-hidden rounded-2xl border border-slate-700/50 shadow-lg shadow-slate-950/40"
            >
              <div className="border-b border-slate-700/40 bg-slate-950/35 px-5 py-4 sm:px-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-100">{p.title}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {p.location.city}
                      {p.location.area ? ` · ${p.location.area}` : ""} · {p.category.name} ·{" "}
                      {p.category.type}
                    </p>
                  </div>
                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <span className="text-lg font-semibold text-cyan-200/95">{formatPkr(p.price)}</span>
                    <span className="rounded-md bg-slate-800/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {p.status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="px-5 py-4 sm:px-6">
                <p className="text-sm leading-relaxed text-slate-400">{p.description}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={!!summarizeLoading[p.id]}
                    onClick={() => void onSummarize(p.id)}
                    className="btn-primary rounded-xl px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {summarizeLoading[p.id] ? "Summarising…" : "Summarise with AI"}
                  </button>
                </div>

                {summaries[p.id] === "error" ? (
                  <p className="mt-4 text-sm text-rose-400">Could not generate summary. Try again.</p>
                ) : summaries[p.id] && summaries[p.id] !== "error" ? (
                  <div className="mt-5 space-y-3 rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300/90">
                      Smart summary
                    </p>
                    <ul className="space-y-2.5 text-sm text-slate-200">
                      <li className="flex gap-2">
                        <span className="shrink-0" aria-hidden>
                          ✅
                        </span>
                        <span>
                          <span className="font-medium text-slate-300">Key feature: </span>
                          {(summaries[p.id] as PropertySummaryBullets).keyFeature}
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span className="shrink-0" aria-hidden>
                          💰
                        </span>
                        <span>
                          <span className="font-medium text-slate-300">Value: </span>
                          {(summaries[p.id] as PropertySummaryBullets).valueAssessment}
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span className="shrink-0" aria-hidden>
                          📍
                        </span>
                        <span>
                          <span className="font-medium text-slate-300">Location: </span>
                          {(summaries[p.id] as PropertySummaryBullets).locationPerk}
                        </span>
                      </li>
                    </ul>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
