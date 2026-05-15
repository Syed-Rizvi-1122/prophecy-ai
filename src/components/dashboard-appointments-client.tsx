"use client";

import { useState } from "react";

export type DashboardAppointmentRow = {
  id: string;
  appointmentDate: string;
  status: string;
  customer: { id: string; fullName: string; email: string };
  property: {
    id: string;
    title: string;
    price: string;
    status: string;
    location: { city: string; area: string };
    category: { name: string; type: string };
    agent: { fullName: string; email: string };
  };
};

const STATUSES = ["Scheduled", "Completed", "Cancelled"] as const;

type DashboardAppointmentsClientProps = {
  initialAppointments: DashboardAppointmentRow[];
  isAdmin: boolean;
};

export function DashboardAppointmentsClient({
  initialAppointments,
  isAdmin,
}: DashboardAppointmentsClientProps) {
  const [items, setItems] = useState(initialAppointments);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onStatusChange = async (id: string, status: string) => {
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/agent/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      const data = (await res.json()) as { error?: string; appointment?: { status: string } };
      if (!res.ok) throw new Error(data.error ?? "Update failed.");
      if (data.appointment) {
        setItems((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: data.appointment!.status } : a)),
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-8 py-6">
      <header className="float-in glass-panel space-y-3 rounded-2xl p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-fuchsia-300/80">
          {isAdmin ? "Operations" : "Agent workspace"}
        </p>
        <h1 className="gradient-title text-4xl font-semibold tracking-tight md:text-5xl">
          Viewing appointments
        </h1>
        <p className="max-w-3xl text-slate-300">
          {isAdmin
            ? "Every customer booking across all listings. Update status as visits complete or cancel."
            : "Bookings on your listings only. Mark visits completed or cancelled so customers see the latest state."}
        </p>
      </header>

      {error ? (
        <p className="text-sm text-rose-400" role="alert">
          {error}
        </p>
      ) : null}

      {items.length === 0 ? (
        <p className="text-sm text-slate-500">No appointments to show.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-700/50">
          <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
            <thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Listing</th>
                <th className="px-4 py-3 font-medium">Agent</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-slate-950/30 text-slate-300">
              {items.map((a) => (
                <tr key={a.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-200">
                    {new Date(a.appointmentDate).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-100">{a.customer.fullName}</div>
                    <div className="text-xs text-slate-500">{a.customer.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-100">{a.property.title}</div>
                    <div className="text-xs text-slate-500">
                      {a.property.location.city}
                      {a.property.location.area ? ` · ${a.property.location.area}` : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {a.property.agent.fullName}
                    <div className="text-slate-600">{a.property.agent.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={a.status}
                      disabled={busyId === a.id}
                      onChange={(e) => void onStatusChange(a.id, e.target.value)}
                      className="rounded-lg border border-slate-600/60 bg-slate-900/90 px-2 py-1.5 text-sm text-slate-100 disabled:opacity-50"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
