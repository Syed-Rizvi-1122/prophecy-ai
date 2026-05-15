import { getAppUserFromSession } from "@/lib/auth/get-app-user";
import { prisma } from "@/lib/prisma";

export default async function PortalReviewsPage() {
  const user = await getAppUserFromSession();
  if (!user || user.role !== "CUSTOMER") {
    return null;
  }

  const rows = await prisma.review.findMany({
    where: { customerId: user.id },
    include: {
      property: {
        include: {
          location: true,
          category: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-2xl p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-slate-100">Your reviews</h2>
        <p className="mt-1 text-sm text-slate-400">
          Ratings and comments you have left on listings. You can update a review from{" "}
          <strong className="text-slate-300">All listings</strong> — one review per property.
        </p>
      </section>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">You have not submitted any reviews yet.</p>
      ) : (
        <ul className="space-y-4">
          {rows.map((r) => (
            <li
              key={r.id}
              className="glass-panel rounded-2xl border border-slate-700/50 p-5 sm:p-6"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-medium text-slate-100">{r.property.title}</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {r.property.location.city}
                    {r.property.location.area ? ` · ${r.property.location.area}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                  <span className="text-amber-300/95" aria-hidden>
                    {"★".repeat(r.rating)}
                    <span className="text-slate-600">{"★".repeat(5 - r.rating)}</span>
                  </span>
                  <time className="text-xs text-slate-500" dateTime={r.createdAt.toISOString()}>
                    {new Date(r.createdAt).toLocaleDateString()}
                  </time>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-300">{r.comment}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
