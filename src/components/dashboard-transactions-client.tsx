"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export type DashboardPropertyOption = {
  id: string;
  title: string;
  price: string;
};

export type DashboardTransactionRow = {
  id: string;
  amount: string;
  transactionDate: string;
  buyer: { fullName: string; email: string };
  property: {
    id: string;
    title: string;
    status: string;
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

type DashboardTransactionsClientProps = {
  availableProperties: DashboardPropertyOption[];
  initialTransactions: DashboardTransactionRow[];
  isAdmin: boolean;
};

export function DashboardTransactionsClient({
  availableProperties,
  initialTransactions,
  isAdmin,
}: DashboardTransactionsClientProps) {
  const router = useRouter();
  const [transactions, setTransactions] = useState(initialTransactions);
  const [propertyId, setPropertyId] = useState(availableProperties[0]?.id ?? "");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formOk, setFormOk] = useState<string | null>(null);

  useEffect(() => {
    setTransactions(initialTransactions);
  }, [initialTransactions]);

  useEffect(() => {
    if (availableProperties.length === 0) {
      setPropertyId("");
      return;
    }
    if (!availableProperties.some((p) => p.id === propertyId)) {
      setPropertyId(availableProperties[0]!.id);
    }
  }, [availableProperties, propertyId]);

  const selectedPrice = availableProperties.find((p) => p.id === propertyId)?.price;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormOk(null);
    if (!propertyId) {
      setFormError("Select a listing.");
      return;
    }
    if (!buyerEmail.trim()) {
      setFormError("Buyer email is required.");
      return;
    }
    setSubmitting(true);
    try {
      const body: { propertyId: string; buyerEmail: string; amount?: number } = {
        propertyId,
        buyerEmail: buyerEmail.trim(),
      };
      const n = Number(amount);
      if (amount.trim() && Number.isFinite(n) && n > 0) {
        body.amount = n;
      }
      const res = await fetch("/api/agent/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not record sale.");
      setFormOk("Sale recorded. Listing marked SOLD.");
      setBuyerEmail("");
      setAmount("");
      router.refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 py-6">
      <header className="float-in glass-panel space-y-3 rounded-2xl p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-fuchsia-300/80">
          {isAdmin ? "Operations" : "Agent workspace"}
        </p>
        <h1 className="gradient-title text-4xl font-semibold tracking-tight md:text-5xl">
          Transactions
        </h1>
        <p className="max-w-3xl text-slate-300">
          Record a sale for an <strong className="text-slate-200">available</strong> listing. The buyer
          must already exist as a customer user. The property moves to{" "}
          <strong className="text-slate-200">SOLD</strong> and appears in the customer&apos;s Purchases
          page.
        </p>
      </header>

      <section className="glass-panel rounded-2xl p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-slate-100">Record a sale</h2>
        {availableProperties.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            No available listings to sell. Add or reopen a listing first.
          </p>
        ) : (
          <form onSubmit={(e) => void onSubmit(e)} className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm text-slate-400 sm:col-span-2">
              <span className="mb-1 block text-xs text-slate-500">Property</span>
              <select
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                className="w-full rounded-lg border border-slate-600/60 bg-slate-900/80 px-3 py-2 text-slate-100"
              >
                {availableProperties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} — {formatPkr(p.price)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-slate-400">
              <span className="mb-1 block text-xs text-slate-500">Buyer email (customer)</span>
              <input
                type="email"
                value={buyerEmail}
                onChange={(e) => setBuyerEmail(e.target.value)}
                autoComplete="off"
                className="w-full rounded-lg border border-slate-600/60 bg-slate-900/80 px-3 py-2 text-slate-100"
                placeholder="customer@example.com"
              />
            </label>
            <label className="block text-sm text-slate-400">
              <span className="mb-1 block text-xs text-slate-500">
                Amount (optional, defaults to list price{" "}
                {selectedPrice ? formatPkr(selectedPrice) : ""})
              </span>
              <input
                type="number"
                min={1}
                step={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border border-slate-600/60 bg-slate-900/80 px-3 py-2 text-slate-100"
                placeholder="Leave blank for list price"
              />
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary rounded-xl px-5 py-2.5 text-sm disabled:opacity-50"
              >
                {submitting ? "Saving…" : "Record transaction"}
              </button>
            </div>
            {formError ? (
              <p className="sm:col-span-2 text-sm text-rose-400" role="alert">
                {formError}
              </p>
            ) : null}
            {formOk ? (
              <p className="sm:col-span-2 text-sm text-emerald-300/90" role="status">
                {formOk}
              </p>
            ) : null}
          </form>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-100">Recent transactions</h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-slate-500">No transactions yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-700/50">
            <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
              <thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Buyer</th>
                  <th className="px-4 py-3 font-medium">Listing</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-950/30 text-slate-300">
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-200">
                      {new Date(t.transactionDate).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-100">{t.buyer.fullName}</div>
                      <div className="text-xs text-slate-500">{t.buyer.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-100">{t.property.title}</div>
                      <div className="text-xs text-slate-500">{t.property.status}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-cyan-200/95">
                      {formatPkr(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
