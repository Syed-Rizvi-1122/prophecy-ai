"use client";

import { useEffect, useState } from "react";

type PropertyItem = {
  id: string;
  title: string;
  price: string;
  status: "AVAILABLE" | "SOLD" | "RENTED";
  location: { city: string; area: string };
  category: { name: string; type: string };
  agent: { fullName: string; email: string };
};

type PropertiesCrudProps = {
  /** Increment to refetch the list from the parent (e.g. after creating a property). */
  refreshKey?: number;
};

export function PropertiesCrud({ refreshKey = 0 }: PropertiesCrudProps) {
  const [rows, setRows] = useState<PropertyItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch("/api/properties", { credentials: "include" });
    const data = (await res.json()) as { properties?: PropertyItem[]; error?: string };
    if (!res.ok) throw new Error(data.error ?? "Failed to fetch properties");
    setRows(data.properties ?? []);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void load().catch((e) => setError(e.message));
    }, 0);
    return () => clearTimeout(timer);
  }, [refreshKey]);

  const saveStatus = async (id: string, status: PropertyItem["status"]) => {
    const res = await fetch(`/api/properties/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) throw new Error(data.error ?? "Failed to update property");
    await load();
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/properties/${id}`, { method: "DELETE", credentials: "include" });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) throw new Error(data.error ?? "Failed to delete property");
    await load();
  };

  return (
    <div className="glass-panel rounded-2xl p-6">
      <h2 className="gradient-title text-2xl font-semibold">All listings</h2>
      <p className="mt-2 text-sm text-slate-300">
        Update status or remove listings. Add new ones using the form above.
      </p>
      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="rounded-xl border border-slate-700/70 bg-slate-900/40 p-3">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
              <div>
                <p className="text-sm font-semibold text-slate-100">{row.title}</p>
                <p className="text-xs text-slate-400">PKR {row.price}</p>
              </div>
              <div className="text-xs text-slate-300 self-center">
                {row.location.city}, {row.location.area}
              </div>
              <div className="text-xs text-slate-300 self-center">
                {row.category.name} / {row.category.type}
              </div>
              <select
                className="app-input"
                value={row.status}
                onChange={(e) => {
                  const nextStatus = e.target.value as PropertyItem["status"];
                  setRows((prev) => prev.map((p) => (p.id === row.id ? { ...p, status: nextStatus } : p)));
                }}
              >
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="SOLD">SOLD</option>
                <option value="RENTED">RENTED</option>
              </select>
              <div className="flex gap-2">
                <button className="btn-primary px-3 py-2 text-xs" onClick={() => void saveStatus(row.id, row.status).catch((e) => setError(e.message))}>Save</button>
                <button className="rounded-xl border border-rose-400/40 px-3 py-2 text-xs text-rose-200 hover:bg-rose-500/15" onClick={() => void remove(row.id).catch((e) => setError(e.message))}>Delete</button>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-400">Agent: {row.agent.fullName} ({row.agent.email})</p>
          </div>
        ))}
      </div>
      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}
