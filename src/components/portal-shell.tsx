"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SignOutButton } from "@/components/sign-out-button";

type PortalShellProps = {
  userName: string;
  children: React.ReactNode;
};

export function PortalShell({ userName, children }: PortalShellProps) {
  const pathname = usePathname();

  const linkClass = (href: string) =>
    `rounded-xl px-4 py-2 text-sm font-medium transition ${
      pathname === href || pathname.startsWith(`${href}/`)
        ? "bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-400/35"
        : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
    }`;

  return (
    <div className="w-full">
      <header className="glass-panel mb-10 rounded-2xl p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/85">
              Customer portal
            </p>
            <h1 className="gradient-title mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              Prophecy AI
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              Signed in as <span className="text-slate-200">{userName}</span> — search with natural
              language or browse every available listing.
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <nav className="flex flex-wrap gap-2">
              <Link href="/portal/search" className={linkClass("/portal/search")}>
                AI search
              </Link>
              <Link href="/portal/listings" className={linkClass("/portal/listings")}>
                All listings
              </Link>
            </nav>
            <SignOutButton className="rounded-xl border border-slate-600/60 px-4 py-2 text-center text-sm text-slate-300 transition hover:bg-slate-800/70 hover:text-slate-100" />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
