import { NextResponse } from "next/server";

import { getAppUserFromSession } from "@/lib/auth/get-app-user";

export async function requireAdmin(): Promise<
  { user: NonNullable<Awaited<ReturnType<typeof getAppUserFromSession>>> } | { response: NextResponse }
> {
  const user = await getAppUserFromSession();
  if (!user) {
    return { response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  }
  if (user.role !== "ADMIN") {
    return { response: NextResponse.json({ error: "Forbidden." }, { status: 403 }) };
  }
  return { user };
}
