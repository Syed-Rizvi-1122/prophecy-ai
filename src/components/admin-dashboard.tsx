import Link from "next/link";

import type { DashboardStats } from "@/lib/admin/dashboard-stats";

function formatPk(value: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return new Intl.NumberFormat("en-PK", {
    maximumFractionDigits: 0,
  }).format(n);
}

const DONUT_COLORS = ["#22d3ee", "#a78bfa", "#e879f9"] as const;

export function AdminDashboard({ stats }: { stats: DashboardStats }) {
  const maxStatus = Math.max(
    stats.properties.available,
    stats.properties.sold,
    stats.properties.rented,
    1,
  );

  const statusBars = [
    {
      key: "available",
      label: "Available",
      count: stats.properties.available,
      gradient: "from-emerald-400/90 to-cyan-500/80",
    },
    {
      key: "sold",
      label: "Sold",
      count: stats.properties.sold,
      gradient: "from-violet-400/90 to-fuchsia-500/80",
    },
    {
      key: "rented",
      label: "Rented",
      count: stats.properties.rented,
      gradient: "from-amber-400/90 to-orange-500/80",
    },
  ] as const;

  const userSegments = [
    { label: "Customers", value: stats.users.customers },
    { label: "Agents", value: stats.users.agents },
    { label: "Admins", value: stats.users.admins },
  ];

  const userTotal = stats.users.total;
  let acc = 0;
  const donutStops: string[] = [];
  userSegments.forEach((s, i) => {
    const pct = userTotal > 0 ? (s.value / userTotal) * 100 : 0;
    const start = acc;
    acc += pct;
    if (pct > 0) {
      donutStops.push(`${DONUT_COLORS[i]} ${start}% ${acc}%`);
    }
  });
  const donutBackground =
    donutStops.length > 0
      ? `conic-gradient(${donutStops.join(", ")})`
      : "conic-gradient(rgb(51 65 85 / 0.6) 0% 100%)";

  return (
    <div className="space-y-8 py-6">
      <header className="float-in glass-panel relative overflow-hidden rounded-2xl p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300/90">
          Overview
        </p>
        <h1 className="gradient-title mt-2 text-4xl font-semibold tracking-tight md:text-5xl">
          Operations dashboard
        </h1>
        <p className="mt-3 max-w-2xl text-base text-slate-300">
          Snapshot of people, listings, and AI search activity across your workspace.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dashboard/admin/properties"
            className="btn-primary inline-flex items-center rounded-xl px-5 py-2.5 text-sm"
          >
            Manage properties
          </Link>
          <Link
            href="/dashboard/admin/users"
            className="inline-flex items-center rounded-xl border border-slate-500/50 bg-slate-900/40 px-5 py-2.5 text-sm font-medium text-slate-200 transition hover:border-cyan-400/40 hover:bg-slate-800/60"
          >
            Users &amp; access
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total properties"
          value={stats.properties.total}
          hint="All listings in the system"
          accent="border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-transparent"
        />
        <StatCard
          title="Customers"
          value={stats.users.customers}
          hint="Portal accounts"
          accent="border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent"
        />
        <StatCard
          title="Agents"
          value={stats.users.agents}
          hint="Listing agents"
          accent="border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-transparent"
        />
        <StatCard
          title="Available inventory value"
          value={`PKR ${formatPk(stats.inventoryValueAvailable)}`}
          hint="Sum of AVAILABLE listings"
          accent="border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent"
          valueIsText
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="glass-panel float-in rounded-2xl p-6 md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Listings by status</h2>
              <p className="mt-1 text-sm text-slate-400">Pipeline distribution</p>
            </div>
            <span className="rounded-lg bg-slate-800/80 px-2 py-1 text-xs font-medium text-slate-300">
              {stats.properties.total} total
            </span>
          </div>
          <div className="mt-8 space-y-5">
            {statusBars.map((row) => (
              <div key={row.key}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="text-slate-300">{row.label}</span>
                  <span className="font-mono text-slate-400">{row.count}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-800/90 ring-1 ring-slate-700/80">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${row.gradient} transition-all duration-700 ease-out`}
                    style={{ width: `${(row.count / maxStatus) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-panel float-in rounded-2xl p-6 md:p-8">
          <h2 className="text-lg font-semibold text-slate-100">User mix</h2>
          <p className="mt-1 text-sm text-slate-400">Roles in your directory</p>
          <div className="mt-8 flex flex-col items-center gap-8 sm:flex-row sm:justify-center sm:gap-12">
            <div
              className="relative h-44 w-44 shrink-0 rounded-full shadow-[0_0_60px_-12px_rgba(34,211,238,0.35)]"
              style={{ background: donutBackground }}
            >
              <div className="absolute inset-[18%] flex flex-col items-center justify-center rounded-full bg-slate-950/95 text-center ring-1 ring-slate-700/80">
                <span className="text-2xl font-semibold tabular-nums text-slate-100">
                  {userTotal}
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                  users
                </span>
              </div>
            </div>
            <ul className="w-full max-w-xs space-y-3 text-sm sm:w-auto">
              {userSegments.map((s, i) => (
                <li key={s.label} className="flex items-center justify-between gap-8">
                  <span className="flex items-center gap-2 text-slate-300">
                    <span
                      className="h-2.5 w-2.5 rounded-full ring-1 ring-white/20"
                      style={{ backgroundColor: DONUT_COLORS[i] }}
                    />
                    {s.label}
                  </span>
                  <span className="font-mono text-slate-400">
                    {s.value}
                    <span className="ml-2 text-xs text-slate-600">
                      {userTotal > 0 ? Math.round((s.value / userTotal) * 100) : 0}%
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MiniStat label="Locations" value={stats.taxonomy.locations} />
        <MiniStat label="Categories" value={stats.taxonomy.categories} />
        <MiniStat label="AI smart searches (logs)" value={stats.aiSearchQueries} />
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  hint,
  accent,
  valueIsText,
}: {
  title: string;
  value: number | string;
  hint: string;
  accent: string;
  valueIsText?: boolean;
}) {
  return (
    <div
      className={`float-in rounded-2xl border p-6 shadow-lg shadow-black/20 ${accent} backdrop-blur-sm`}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{title}</p>
      <p
        className={`mt-3 font-semibold tracking-tight text-slate-50 ${valueIsText ? "text-xl md:text-2xl" : "text-3xl tabular-nums"}`}
      >
        {value}
      </p>
      <p className="mt-2 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass-panel rounded-xl border border-slate-700/60 px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-100">{value}</p>
    </div>
  );
}
