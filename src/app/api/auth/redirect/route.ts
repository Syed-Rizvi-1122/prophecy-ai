import { NextResponse } from "next/server";

import { getAppUserFromSession } from "@/lib/auth/get-app-user";

export async function GET() {
  const appUser = await getAppUserFromSession();

  if (!appUser) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const url =
    appUser.role === "CUSTOMER" ? "/portal/search" : "/dashboard/admin";

  return NextResponse.json({ url, role: appUser.role });
}
