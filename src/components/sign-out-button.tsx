"use client";

import { useRouter } from "next/navigation";

type Props = {
  className?: string;
  label?: string;
};

export function SignOutButton({ className, label = "Sign out" }: Props) {
  const router = useRouter();

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        void (async () => {
          await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
          router.push("/login");
          router.refresh();
        })();
      }}
    >
      {label}
    </button>
  );
}
