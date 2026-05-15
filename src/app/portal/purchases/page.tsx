import { getAppUserFromSession } from "@/lib/auth/get-app-user";
import { prisma } from "@/lib/prisma";

function formatPkr(amount: string) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return amount;
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function PortalPurchasesPage() {
  const user = await getAppUserFromSession();
  if (!user || user.role !== "CUSTOMER") {
    return null;
  }

  const rows = await prisma.transaction.findMany({
    where: { buyerId: user.id },
    include: {
      property: {
        include: {
          location: true,
          category: true,
          agent: { select: { fullName: true, email: true } },
        },
      },
    },
    orderBy: { transactionDate: "desc" },
  });

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-2xl p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-slate-100">Your purchases</h2>
        <p className="mt-1 text-sm text-slate-400">
          Recorded sales where you are the buyer. Your agent marks the deal complete from their
          dashboard.
        </p>
      </section>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">No transactions yet.</p>
      ) : (
        <ul className="space-y-4">
          {rows.map((t) => (
            <li
              key={t.id}
              className="glass-panel rounded-2xl border border-slate-700/50 p-5 sm:p-6"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-medium text-slate-100">{t.property.title}</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {t.property.location.city}
                    {t.property.location.area ? ` · ${t.property.location.area}` : ""}
                  </p>
                  <p className="mt-2 text-sm text-slate-400">
                    Agent: {t.property.agent.fullName}
                  </p>
                  <p className="mt-2 text-sm text-slate-400">
                    {new Date(t.transactionDate).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-lg font-semibold text-cyan-200/95">
                    {formatPkr(t.amount.toString())}
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {t.property.status}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
