import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { getAppUserFromSession } from "@/lib/auth/get-app-user";

export default async function LoginPage() {
  const appUser = await getAppUserFromSession();

  if (appUser) {
    if (appUser.role === "CUSTOMER") redirect("/portal/search");
    redirect("/dashboard/admin");
  }

  return (
    <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center px-4 py-12">
      <LoginForm />
    </div>
  );
}
