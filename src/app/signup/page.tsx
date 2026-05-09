import { redirect } from "next/navigation";

import { AdminRegisterForm } from "@/components/admin-register-form";
import { getAppUserFromSession } from "@/lib/auth/get-app-user";

export default async function SignupPage() {
  const user = await getAppUserFromSession();
  if (user) {
    if (user.role === "CUSTOMER") redirect("/portal/search");
    redirect("/dashboard/admin");
  }

  return (
    <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center px-4 py-12">
      <AdminRegisterForm />
    </div>
  );
}
