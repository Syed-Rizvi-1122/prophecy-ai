"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function AdminRegisterForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
          secretKey,
        }),
      });

      const data = (await res.json()) as { url?: string; error?: string };

      if (!res.ok) {
        setError(data.error ?? "Registration failed.");
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
        <h1 className="gradient-title text-3xl font-semibold tracking-tight">Admin registration</h1>
        <p className="mt-2 text-sm text-slate-300">
          Create an administrator account. You must provide the server{" "}
          <code className="text-cyan-200/90">SECRET_KEY</code> from your environment. Additional staff
          accounts are created by an admin after sign-in.
        </p>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-slate-200">Full name</span>
        <input
          className="app-input"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
      </label>

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
        <span className="text-sm font-medium text-slate-200">Password (min 8 characters)</span>
        <input
          className="app-input"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-slate-200">Secret key</span>
        <input
          className="app-input"
          type="password"
          autoComplete="off"
          value={secretKey}
          onChange={(e) => setSecretKey(e.target.value)}
          required
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full px-4 py-2.5 text-sm disabled:cursor-not-allowed"
      >
        {loading ? "Creating account…" : "Create admin & sign in"}
      </button>

      <p className="text-center text-sm text-slate-400">
        <Link href="/login" className="font-medium text-cyan-300 hover:text-cyan-200">
          Back to sign in
        </Link>
      </p>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </form>
  );
}
