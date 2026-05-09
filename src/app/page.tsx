import { redirect } from "next/navigation";

import { getAppUserFromSession } from "@/lib/auth/get-app-user";

export default async function Home() {
  const appUser = await getAppUserFromSession();

  if (!appUser) {
    redirect("/login");
  }

  if (appUser.role === "CUSTOMER") {
    redirect("/portal/search");
  }

  redirect("/dashboard/admin");
}
