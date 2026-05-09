import { redirect } from "next/navigation";

import { PortalShell } from "@/components/portal-shell";
import { getAppUserFromSession } from "@/lib/auth/get-app-user";

export default async function PortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getAppUserFromSession();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "CUSTOMER") {
    redirect("/dashboard/admin");
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-4xl px-4 py-8 sm:px-6 lg:max-w-5xl">
      <PortalShell userName={user.fullName}>{children}</PortalShell>
    </div>
  );
}
