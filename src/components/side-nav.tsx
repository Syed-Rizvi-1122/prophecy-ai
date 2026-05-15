"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SignOutButton } from "@/components/sign-out-button";

const navItems = [
  { href: "/dashboard/admin", label: "Dashboard", exact: true },
  { href: "/dashboard/admin/appointments", label: "Appointments" },
  { href: "/dashboard/admin/transactions", label: "Transactions" },
  { href: "/dashboard/admin/users", label: "Users" },
  { href: "/dashboard/admin/properties", label: "Properties" },
  { href: "/dashboard/admin/locations", label: "Locations" },
  { href: "/dashboard/admin/categories", label: "Categories" },
  { href: "/dashboard/admin/ai-logs", label: "AI logs" },
];

export function SideNav() {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="glass-panel sticky top-6 hidden h-[calc(100vh-3rem)] w-64 shrink-0 flex-col rounded-2xl p-5 lg:flex">
      <p className="gradient-title text-xl font-semibold">Prophecy AI</p>
      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">System Walkthrough</p>
      <nav className="mt-6 flex flex-1 flex-col space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`block rounded-xl px-3 py-2 text-sm transition ${
              isActive(item.href, item.exact)
                ? "bg-cyan-400/20 text-cyan-100"
                : "text-slate-300 hover:bg-slate-800/70 hover:text-slate-100"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <SignOutButton className="mt-4 rounded-xl border border-slate-600/60 px-3 py-2 text-left text-sm text-slate-300 transition hover:bg-slate-800/70 hover:text-slate-100" />
    </aside>
  );
}
