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
  reviewCount: number;
  averageRating: number | null;
};

type ReviewItem = {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  customer: { fullName: string };
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
  const [bookDate, setBookDate] = useState<Record<string, string>>({});
  const [bookLoading, setBookLoading] = useState<Record<string, boolean>>({});
  const [bookMessage, setBookMessage] = useState<Record<string, string>>({});
  const [reviewsByProperty, setReviewsByProperty] = useState<
    Record<
      string,
      | {
          averageRating: number | null;
          count: number;
          reviews: ReviewItem[];
        }
      | "error"
    >
  >({});
  const [reviewsLoading, setReviewsLoading] = useState<Record<string, boolean>>({});
  const [reviewRating, setReviewRating] = useState<Record<string, number>>({});
  const [reviewComment, setReviewComment] = useState<Record<string, string>>({});
  const [reviewLoading, setReviewLoading] = useState<Record<string, boolean>>({});
  const [reviewMessage, setReviewMessage] = useState<Record<string, string>>({});

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

  const onBook = async (propertyId: string) => {
    const isoLocal = bookDate[propertyId];
    setBookMessage((m) => ({ ...m, [propertyId]: "" }));
    if (!isoLocal) {
      setBookMessage((m) => ({ ...m, [propertyId]: "Choose a date and time first." }));
      return;
    }
    const when = new Date(isoLocal);
    if (Number.isNaN(when.getTime())) {
      setBookMessage((m) => ({ ...m, [propertyId]: "Invalid date." }));
      return;
    }

    setBookLoading((s) => ({ ...s, [propertyId]: true }));
    try {
      const res = await fetch("/api/portal/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          propertyId,
          appointmentDate: when.toISOString(),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Booking failed.");
      setBookMessage((m) => ({
        ...m,
        [propertyId]: "Booked. You can manage it under Appointments.",
      }));
    } catch (e) {
      setBookMessage((m) => ({
        ...m,
        [propertyId]: e instanceof Error ? e.message : "Could not book.",
      }));
    } finally {
      setBookLoading((s) => ({ ...s, [propertyId]: false }));
    }
  };

  const loadReviews = async (propertyId: string) => {
    setReviewsLoading((s) => ({ ...s, [propertyId]: true }));
    try {
      const res = await fetch(`/api/portal/properties/${propertyId}/reviews`, {
        credentials: "include",
      });
      const data = (await res.json()) as {
        averageRating?: number | null;
        count?: number;
        reviews?: ReviewItem[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to load reviews.");
      setReviewsByProperty((prev) => ({
        ...prev,
        [propertyId]: {
          averageRating: data.averageRating ?? null,
          count: data.count ?? 0,
          reviews: data.reviews ?? [],
        },
      }));
    } catch {
      setReviewsByProperty((prev) => ({ ...prev, [propertyId]: "error" }));
    } finally {
      setReviewsLoading((s) => ({ ...s, [propertyId]: false }));
    }
  };

  const onSubmitReview = async (propertyId: string) => {
    const rating = reviewRating[propertyId] ?? 5;
    const comment = (reviewComment[propertyId] ?? "").trim();
    setReviewMessage((m) => ({ ...m, [propertyId]: "" }));
    if (!comment) {
      setReviewMessage((m) => ({ ...m, [propertyId]: "Please add a short comment." }));
      return;
    }
    setReviewLoading((s) => ({ ...s, [propertyId]: true }));
    try {
      const res = await fetch("/api/portal/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ propertyId, rating, comment }),
      });
      const data = (await res.json()) as { error?: string; updated?: boolean };
      if (!res.ok) throw new Error(data.error ?? "Could not save review.");
      setReviewMessage((m) => ({
        ...m,
        [propertyId]: data.updated ? "Review updated." : "Thanks — review posted.",
      }));
      void loadReviews(propertyId);
    } catch (e) {
      setReviewMessage((m) => ({
        ...m,
        [propertyId]: e instanceof Error ? e.message : "Could not save.",
      }));
    } finally {
      setReviewLoading((s) => ({ ...s, [propertyId]: false }));
    }
  };

  return (
    <div className="space-y-8">
      <section className="glass-panel rounded-2xl p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-slate-100">Available properties</h2>
        <p className="mt-1 text-sm text-slate-400">
          Every active listing in one place. Use <strong className="text-slate-300">Summarise with AI</strong>{" "}
          for a quick three-point brief, <strong className="text-slate-300">Book viewing</strong> to schedule
          with the agent, and <strong className="text-slate-300">Reviews</strong> to read or leave feedback.
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
                    {p.reviewCount > 0 ? (
                      <p className="mt-2 text-xs text-amber-200/90">
                        {p.averageRating !== null ? `${p.averageRating.toFixed(1)} / 5` : "Rated"} ·{" "}
                        {p.reviewCount} review{p.reviewCount === 1 ? "" : "s"}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-slate-600">No reviews yet</p>
                    )}
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

                <div className="mt-6 rounded-xl border border-slate-700/50 bg-slate-950/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Book viewing
                  </p>
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                    <label className="block flex-1 text-sm text-slate-400">
                      <span className="mb-1 block text-xs text-slate-500">Preferred time</span>
                      <input
                        type="datetime-local"
                        value={bookDate[p.id] ?? ""}
                        onChange={(e) =>
                          setBookDate((prev) => ({ ...prev, [p.id]: e.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-600/60 bg-slate-900/80 px-3 py-2 text-slate-100"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={!!bookLoading[p.id]}
                      onClick={() => void onBook(p.id)}
                      className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/20 disabled:opacity-50"
                    >
                      {bookLoading[p.id] ? "Booking…" : "Request appointment"}
                    </button>
                  </div>
                  {bookMessage[p.id] ? (
                    <p className="mt-2 text-sm text-slate-400">{bookMessage[p.id]}</p>
                  ) : null}
                </div>

                <div className="mt-6 rounded-xl border border-slate-700/50 bg-slate-950/30 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Community reviews
                    </p>
                    <button
                      type="button"
                      disabled={!!reviewsLoading[p.id]}
                      onClick={() => void loadReviews(p.id)}
                      className="rounded-lg border border-slate-600/60 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800/70 disabled:opacity-50"
                    >
                      {reviewsByProperty[p.id] ? "Refresh reviews" : "Load reviews"}
                    </button>
                  </div>
                  {reviewsByProperty[p.id] === "error" ? (
                    <p className="mt-3 text-sm text-rose-400">Could not load reviews.</p>
                  ) : (() => {
                      const block = reviewsByProperty[p.id];
                      if (!block || block === "error") return null;
                      return (
                        <ul className="mt-3 space-y-3">
                          {block.reviews.length === 0 ? (
                            <li className="text-sm text-slate-500">No written reviews yet.</li>
                          ) : (
                            block.reviews.map((r) => (
                              <li
                                key={r.id}
                                className="rounded-lg border border-slate-800/80 p-3 text-sm"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-slate-200">{r.customer.fullName}</span>
                                  <span
                                    className="text-amber-300/90"
                                    aria-label={`${r.rating} out of 5`}
                                  >
                                    {"★".repeat(r.rating)}
                                    <span className="text-slate-600">{"★".repeat(5 - r.rating)}</span>
                                  </span>
                                </div>
                                <p className="mt-2 text-slate-400">{r.comment}</p>
                              </li>
                            ))
                          )}
                        </ul>
                      );
                    })()}

                  <div className="mt-4 border-t border-slate-800/80 pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Your review
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-[auto,1fr] sm:items-start">
                      <label className="text-sm text-slate-400">
                        <span className="mb-1 block text-xs text-slate-500">Rating</span>
                        <select
                          value={String(reviewRating[p.id] ?? 5)}
                          onChange={(e) =>
                            setReviewRating((prev) => ({
                              ...prev,
                              [p.id]: Number(e.target.value),
                            }))
                          }
                          className="rounded-lg border border-slate-600/60 bg-slate-900/80 px-3 py-2 text-slate-100"
                        >
                          {[5, 4, 3, 2, 1].map((n) => (
                            <option key={n} value={n}>
                              {n} star{n === 1 ? "" : "s"}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-sm text-slate-400 sm:col-span-1">
                        <span className="mb-1 block text-xs text-slate-500">Comment</span>
                        <textarea
                          value={reviewComment[p.id] ?? ""}
                          onChange={(e) =>
                            setReviewComment((prev) => ({ ...prev, [p.id]: e.target.value }))
                          }
                          rows={3}
                          className="w-full rounded-lg border border-slate-600/60 bg-slate-900/80 px-3 py-2 text-slate-100"
                          placeholder="What stood out about this listing?"
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      disabled={!!reviewLoading[p.id]}
                      onClick={() => void onSubmitReview(p.id)}
                      className="mt-3 rounded-xl btn-primary px-4 py-2 text-sm disabled:opacity-50"
                    >
                      {reviewLoading[p.id] ? "Saving…" : "Submit review"}
                    </button>
                    {reviewMessage[p.id] ? (
                      <p className="mt-2 text-sm text-slate-400">{reviewMessage[p.id]}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
