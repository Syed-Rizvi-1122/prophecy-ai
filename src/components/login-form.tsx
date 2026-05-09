"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = (await res.json()) as { url?: string; error?: string };

      if (!res.ok) {
        setError(data.error ?? "Sign in failed.");
        return;
      }

      if (data.url) {
        router.push(data.url);
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className="float-in glass-panel mx-auto w-full max-w-md space-y-5 rounded-2xl p-8"
    >
      <div>
        <h1 className="gradient-title text-3xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm text-slate-300">
          One login for admins, agents, and customers. Use the email and password issued to your account.
        </p>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-slate-200">Email</span>
        <input
          className="app-input"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-slate-200">Password</span>
        <input
          className="app-input"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full px-4 py-2.5 text-sm disabled:cursor-not-allowed"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-center text-sm text-slate-400">
        Need an admin account?{" "}
        <Link href="/signup" className="font-medium text-cyan-300 hover:text-cyan-200">
          Admin registration
        </Link>
      </p>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </form>
  );
}
