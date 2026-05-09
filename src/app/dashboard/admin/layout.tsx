import { redirect } from "next/navigation";

import { SideNav } from "@/components/side-nav";
import { getAppUserFromSession } from "@/lib/auth/get-app-user";

export default async function AdminDashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getAppUserFromSession();

  if (!user) {
    redirect("/login");
  }

  if (user.role === "CUSTOMER") {
    redirect("/portal/search");
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1400px] gap-6 px-6 py-6">
      <SideNav />
      <div className="w-full">{children}</div>
    </div>
  );
}
