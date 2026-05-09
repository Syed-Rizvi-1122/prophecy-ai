import { NextResponse } from "next/server";

import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SEC } from "@/lib/auth/constants";
import { verifyPassword } from "@/lib/auth/password";
import { signSessionToken } from "@/lib/auth/session-token";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const loginRows = await prisma.$queryRaw<
      Array<{
        id: string;
        email: string;
        fullName: string;
        role: "ADMIN" | "AGENT" | "CUSTOMER";
        passwordHash: string | null;
      }>
    >`
      SELECT "id", "email", "fullName", "role", "passwordHash"
      FROM "User"
      WHERE "email" = ${email}
      LIMIT 1
    `;
    const user = loginRows[0];

    if (!user?.passwordHash) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const token = await signSessionToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    if (!token) {
      return NextResponse.json(
        { error: "Server misconfiguration: set SECRET_KEY." },
        { status: 500 },
      );
    }

    const url = user.role === "CUSTOMER" ? "/portal/search" : "/dashboard/admin";

    const res = NextResponse.json({
      message: "Signed in.",
      url,
      role: user.role,
    });

    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SEC,
    });

    return res;
  } catch {
    return NextResponse.json({ error: "Login failed." }, { status: 500 });
  }
}
