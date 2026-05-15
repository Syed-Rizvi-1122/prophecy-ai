"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type PortalAppointmentRow = {
  id: string;
  appointmentDate: string;
  status: string;
  property: {
    id: string;
    title: string;
    price: string;
    location: { city: string; area: string };
    category: { name: string; type: string };
    agent: { fullName: string; email: string };
  };
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

type PortalAppointmentsClientProps = {
  initialAppointments: PortalAppointmentRow[];
};

export function PortalAppointmentsClient({ initialAppointments }: PortalAppointmentsClientProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialAppointments);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onCancel = async (id: string) => {
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/portal/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "Cancelled" }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not cancel.");
      setItems((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "Cancelled" } : a)),
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-2xl p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-slate-100">Your viewing appointments</h2>
        <p className="mt-1 text-sm text-slate-400">
          Bookings you have made with listing agents. You can cancel a visit before it happens.
        </p>
      </section>

      {error ? (
        <p className="text-sm text-rose-400" role="alert">
          {error}
        </p>
      ) : null}

      {items.length === 0 ? (
        <p className="text-sm text-slate-500">No appointments yet. Book a viewing from All listings.</p>
      ) : (
        <ul className="space-y-4">
          {items.map((a) => (
            <li
              key={a.id}
              className="glass-panel rounded-2xl border border-slate-700/50 p-5 sm:p-6"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-medium text-slate-100">{a.property.title}</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {a.property.location.city}
                    {a.property.location.area ? ` · ${a.property.location.area}` : ""} ·{" "}
                    {a.property.category.name}
                  </p>
                  <p className="mt-2 text-sm text-slate-400">
                    Agent: {a.property.agent.fullName} ({a.property.agent.email})
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    {new Date(a.appointmentDate).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-cyan-300/80">
                    {a.status}
                  </p>
                </div>
                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <span className="text-sm font-semibold text-cyan-200/95">
                    {formatPkr(a.property.price)}
                  </span>
                  {a.status !== "Cancelled" && a.status !== "Completed" ? (
                    <button
                      type="button"
                      disabled={busyId === a.id}
                      onClick={() => void onCancel(a.id)}
                      className="rounded-xl border border-rose-500/40 px-3 py-1.5 text-sm text-rose-200 transition hover:bg-rose-500/10 disabled:opacity-50"
                    >
                      {busyId === a.id ? "Cancelling…" : "Cancel appointment"}
                    </button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
