import Link from "next/link";
import { redirect } from "next/navigation";

import { getAppUserFromSession } from "@/lib/auth/get-app-user";
import { prisma } from "@/lib/prisma";

type AiLogRow = {
  id: number;
  queryText: string;
  extractedFilters: unknown;
  createdAt: Date;
  user: {
    fullName: string;
    email: string;
    role: string;
  };
};

export default async function AdminAiLogsPage() {
  const user = await getAppUserFromSession();
  if (!user) {
    redirect("/login");
  }
  if (user.role === "CUSTOMER") {
    redirect("/portal/search");
  }

  const rawRows = await prisma.$queryRaw<
    Array<{
      id: number;
      queryText: string;
      extractedFilters: unknown;
      createdAt: Date;
      fullName: string;
      email: string;
      role: string;
    }>
  >`
    SELECT
      a."id",
      a."queryText",
      a."extractedFilters",
      a."createdAt",
      u."fullName",
      u."email",
      u."role"::text AS "role"
    FROM "AiLog" a
    INNER JOIN "User" u ON a."userId" = u."id"
    ORDER BY a."createdAt" DESC
    LIMIT 400
  `;

  const logs: AiLogRow[] = rawRows.map((r) => ({
    id: r.id,
    queryText: r.queryText,
    extractedFilters: r.extractedFilters,
    createdAt: r.createdAt,
    user: {
      fullName: r.fullName,
      email: r.email,
      role: r.role,
    },
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/85">Audit</p>
          <h1 className="gradient-title text-3xl font-semibold tracking-tight">AI logs</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Search queries and extracted filters stored for each user session (smart search and related
            flows). Latest {logs.length} entries.
          </p>
        </div>
        <Link
          href="/dashboard/admin"
          className="rounded-xl border border-slate-600/60 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800/70 hover:text-slate-100"
        >
          ← Dashboard
        </Link>
      </div>

      <div className="glass-panel overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-700/80 bg-slate-950/50 text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-semibold">When</th>
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Query</th>
                <th className="px-4 py-3 font-semibold">Extracted filters</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                    No AI logs yet. Customer smart searches will appear here.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-slate-800/80 align-top text-slate-300 last:border-0 hover:bg-slate-900/40"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                      {log.createdAt.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-200">{log.user.fullName}</div>
                      <div className="text-xs text-slate-500">{log.user.email}</div>
                      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-600">
                        {log.user.role}
                      </div>
                    </td>
                    <td className="max-w-xs px-4 py-3 text-slate-400">
                      <p className="line-clamp-4 whitespace-pre-wrap">{log.queryText}</p>
                    </td>
                    <td className="min-w-[220px] px-4 py-3">
                      <pre className="max-h-40 overflow-auto rounded-lg bg-slate-950/70 p-2 text-[11px] leading-snug text-slate-400">
                        {JSON.stringify(log.extractedFilters, null, 2)}
                      </pre>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
