import Link from "next/link";

import { UsersCrud } from "@/components/users-crud";

export default function AdminUsersPage() {
  return (
    <div className="space-y-8 py-6">
      <header className="float-in glass-panel space-y-3 rounded-2xl p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-fuchsia-300/80">
          Workspace
        </p>
        <h1 className="gradient-title text-4xl font-semibold tracking-tight md:text-5xl">
          User Registration
        </h1>
        <p className="max-w-3xl text-slate-300">
          Register users here. Agents appear in the agent dropdown when creating a property on the
          Properties page.
        </p>
        <Link
          href="/dashboard/admin/properties"
          className="inline-flex items-center rounded-xl border border-fuchsia-300/40 bg-fuchsia-400/10 px-4 py-2 text-sm font-medium text-fuchsia-100 transition hover:-translate-y-0.5 hover:border-fuchsia-200/70 hover:bg-fuchsia-400/20"
        >
          Go to Properties
        </Link>
      </header>

      <UsersCrud />
    </div>
  );
}
