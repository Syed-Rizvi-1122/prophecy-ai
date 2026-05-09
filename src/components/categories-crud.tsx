"use client";

import { FormEvent, useEffect, useState } from "react";

type CategoryItem = { id: number; name: string; type: string; _count?: { properties: number } };
const initial = { name: "", type: "" };

export function CategoriesCrud() {
  const [rows, setRows] = useState<CategoryItem[]>([]);
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch("/api/categories", { credentials: "include" });
    const data = (await res.json()) as { categories?: CategoryItem[]; error?: string };
    if (!res.ok) throw new Error(data.error ?? "Failed");
    setRows(data.categories ?? []);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void load().catch((e) => setError(e.message));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/categories", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) throw new Error(data.error ?? "Failed");
    setForm(initial);
    await load();
  };

  return (
    <div className="space-y-6">
      <form onSubmit={(e) => void create(e).catch((er) => setError(er.message))} className="glass-panel rounded-2xl p-6">
        <h2 className="gradient-title text-2xl font-semibold">Create Category</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <input className="app-input" placeholder="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
          <input className="app-input" placeholder="Type" value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} required />
        </div>
        <button className="btn-primary mt-4 px-4 py-2 text-sm" type="submit">Create</button>
      </form>
      <div className="glass-panel rounded-2xl p-6 space-y-3">
        <h3 className="text-xl font-semibold text-slate-100">Categories</h3>
        {rows.map((row) => (
          <CategoryRow key={row.id} row={row} onChanged={() => void load().catch((e) => setError(e.message))} />
        ))}
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      </div>
    </div>
  );
}

function CategoryRow({ row, onChanged }: { row: CategoryItem; onChanged: () => void }) {
  const [local, setLocal] = useState(row);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const res = await fetch(`/api/categories/${local.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(local),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) throw new Error(data.error ?? "Failed");
    onChanged();
  };
  const remove = async () => {
    const res = await fetch(`/api/categories/${local.id}`, { method: "DELETE", credentials: "include" });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) throw new Error(data.error ?? "Failed");
    onChanged();
  };

  return (
    <div className="rounded-xl border border-slate-700/70 bg-slate-900/40 p-3">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
        <input className="app-input" value={local.name} onChange={(e) => setLocal((p) => ({ ...p, name: e.target.value }))} />
        <input className="app-input" value={local.type} onChange={(e) => setLocal((p) => ({ ...p, type: e.target.value }))} />
        <div className="text-xs text-slate-400 self-center">Properties: {local._count?.properties ?? 0}</div>
        <div className="flex gap-2">
          <button className="btn-primary px-3 py-2 text-xs" onClick={() => void save().catch((e) => setError(e.message))}>Save</button>
          <button className="rounded-xl border border-rose-400/40 px-3 py-2 text-xs text-rose-200 hover:bg-rose-500/15" onClick={() => void remove().catch((e) => setError(e.message))}>Delete</button>
        </div>
      </div>
      {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}
    </div>
  );
}
