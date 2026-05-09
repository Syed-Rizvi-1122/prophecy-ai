"use client";

import { FormEvent, useEffect, useState } from "react";

type UserItem = {
  id: string;
  fullName: string;
  email: string;
  role: "ADMIN" | "AGENT" | "CUSTOMER";
};

type UserForm = {
  fullName: string;
  email: string;
  password: string;
  role: "AGENT" | "CUSTOMER";
};

const initialForm: UserForm = { fullName: "", email: "", password: "", role: "AGENT" };

const fetchOptions: RequestInit = { credentials: "include" };

export function UsersCrud() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [form, setForm] = useState<UserForm>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [passwordResetById, setPasswordResetById] = useState<Record<string, string>>({});

  const loadUsers = async () => {
    const res = await fetch("/api/users", fetchOptions);
    const data = (await res.json()) as { users?: UserItem[]; error?: string };
    if (!res.ok) throw new Error(data.error ?? "Failed to fetch users");
    setUsers(data.users ?? []);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadUsers().catch((e) => setError(e instanceof Error ? e.message : "Error"));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const createUser = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/users", {
      ...fetchOptions,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) throw new Error(data.error ?? "Failed to create user");
    setForm(initialForm);
    await loadUsers();
  };

  const updateUser = async (user: UserItem) => {
    const newPassword = passwordResetById[user.id]?.trim();
    const body: Record<string, string> = {
      fullName: user.fullName,
      email: user.email,
    };
    if (user.role !== "ADMIN") {
      body.role = user.role;
    }
    if (newPassword) {
      body.password = newPassword;
    }

    const res = await fetch(`/api/users/${user.id}`, {
      ...fetchOptions,
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) throw new Error(data.error ?? "Failed to update user");
    setPasswordResetById((prev) => {
      const next = { ...prev };
      delete next[user.id];
      return next;
    });
    await loadUsers();
  };

  const deleteUser = async (id: string) => {
    const res = await fetch(`/api/users/${id}`, { ...fetchOptions, method: "DELETE" });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) throw new Error(data.error ?? "Failed to delete user");
    await loadUsers();
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => void createUser(e).catch((err) => setError(err.message))}
        className="glass-panel rounded-2xl p-6"
      >
        <h2 className="gradient-title text-2xl font-semibold">Create agent or customer</h2>
        <p className="mt-1 text-sm text-slate-400">Only admins can create accounts. Set a password the user will use at login.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <input
            className="app-input"
            placeholder="Full name"
            value={form.fullName}
            onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
            required
          />
          <input
            className="app-input"
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            required
          />
          <input
            className="app-input"
            placeholder="Password (min 8)"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            minLength={8}
            required
          />
          <select
            className="app-input"
            value={form.role}
            onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as UserForm["role"] }))}
          >
            <option value="AGENT">AGENT</option>
            <option value="CUSTOMER">CUSTOMER</option>
          </select>
        </div>
        <button className="btn-primary mt-4 px-4 py-2 text-sm" type="submit">
          Create
        </button>
      </form>

      <div className="glass-panel rounded-2xl p-6">
        <h3 className="text-xl font-semibold text-slate-100">Users</h3>
        <div className="mt-4 space-y-3">
          {users.map((user) => (
            <div key={user.id} className="rounded-xl border border-slate-700/70 bg-slate-900/40 p-3">
              <div className="grid grid-cols-1 gap-2 lg:grid-cols-6">
                <input
                  className="app-input lg:col-span-1"
                  value={user.fullName}
                  onChange={(e) =>
                    setUsers((prev) =>
                      prev.map((u) => (u.id === user.id ? { ...u, fullName: e.target.value } : u)),
                    )
                  }
                />
                <input
                  className="app-input lg:col-span-1"
                  value={user.email}
                  onChange={(e) =>
                    setUsers((prev) =>
                      prev.map((u) => (u.id === user.id ? { ...u, email: e.target.value } : u)),
                    )
                  }
                />
                {user.role === "ADMIN" ? (
                  <div className="app-input flex items-center text-sm text-slate-400 lg:col-span-1">
                    ADMIN (role locked)
                  </div>
                ) : (
                  <select
                    className="app-input lg:col-span-1"
                    value={user.role}
                    onChange={(e) =>
                      setUsers((prev) =>
                        prev.map((u) =>
                          u.id === user.id
                            ? { ...u, role: e.target.value as UserItem["role"] }
                            : u,
                        ),
                      )
                    }
                  >
                    <option value="AGENT">AGENT</option>
                    <option value="CUSTOMER">CUSTOMER</option>
                  </select>
                )}
                <input
                  className="app-input lg:col-span-1"
                  type="password"
                  autoComplete="new-password"
                  placeholder="New password (optional)"
                  value={passwordResetById[user.id] ?? ""}
                  onChange={(e) =>
                    setPasswordResetById((prev) => ({ ...prev, [user.id]: e.target.value }))
                  }
                />
                <div className="flex flex-wrap gap-2 lg:col-span-2">
                  <button
                    className="btn-primary px-3 py-2 text-xs"
                    type="button"
                    onClick={() => void updateUser(user).catch((e) => setError(e.message))}
                  >
                    Save
                  </button>
                  <button
                    className="rounded-xl border border-rose-400/40 px-3 py-2 text-xs text-rose-200 hover:bg-rose-500/15"
                    type="button"
                    onClick={() => void deleteUser(user.id).catch((e) => setError(e.message))}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-400">ID: {user.id}</p>
            </div>
          ))}
        </div>
        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
      </div>
    </div>
  );
}
