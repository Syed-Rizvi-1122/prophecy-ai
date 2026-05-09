import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionToken } from "@/lib/auth/session-token";
import { prisma } from "@/lib/prisma";

export type AppUser = {
  id: string;
  email: string;
  fullName: string;
  role: "ADMIN" | "AGENT" | "CUSTOMER";
};

export async function getAppUserFromSession(): Promise<AppUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const rows = await prisma.$queryRaw<AppUser[]>`
    SELECT "id", "email", "fullName", "role"
    FROM "User"
    WHERE "id" = ${payload.sub}
    LIMIT 1
  `;
  const row = rows[0];

  if (!row || row.email.toLowerCase() !== payload.email.toLowerCase()) {
    return null;
  }

  if (row.role !== payload.role) {
    return null;
  }

  return row;
}
