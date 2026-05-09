import { randomUUID } from "crypto";

import { NextResponse } from "next/server";

import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SEC } from "@/lib/auth/constants";
import { hashPassword } from "@/lib/auth/password";
import { signSessionToken } from "@/lib/auth/session-token";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const serverSecret = process.env.SECRET_KEY;
    if (!serverSecret) {
      return NextResponse.json(
        { error: "Server misconfiguration: set SECRET_KEY." },
        { status: 500 },
      );
    }

    const body = (await request.json()) as {
      fullName?: string;
      email?: string;
      password?: string;
      secretKey?: string;
    };

    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const secretKey = typeof body.secretKey === "string" ? body.secretKey : "";

    if (!fullName || !email || !password || !secretKey) {
      return NextResponse.json(
        { error: "fullName, email, password, and secretKey are required." },
        { status: 400 },
      );
    }

    if (secretKey !== serverSecret) {
      return NextResponse.json({ error: "Invalid secret key." }, { status: 403 });
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 },
      );
    }

    const takenRows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "User" WHERE "email" = ${email} LIMIT 1
    `;

    if (takenRows[0]) {
      return NextResponse.json({ error: "Email already in use." }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const newId = randomUUID();

    const inserted = await prisma.$queryRaw<
      Array<{ id: string; email: string; fullName: string; role: "ADMIN" | "AGENT" | "CUSTOMER" }>
    >`
      INSERT INTO "User" ("id", "fullName", "email", "passwordHash", "role", "createdAt")
      VALUES (${newId}, ${fullName}, ${email}, ${passwordHash}, 'ADMIN', NOW())
      RETURNING "id", "email", "fullName", "role"
    `;
    const user = inserted[0];
    if (!user) {
      return NextResponse.json({ error: "Registration failed." }, { status: 500 });
    }

    const token = await signSessionToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    if (!token) {
      return NextResponse.json({ error: "Could not create session." }, { status: 500 });
    }

    const res = NextResponse.json({
      message: "Admin account created.",
      url: "/dashboard/admin",
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
    return NextResponse.json({ error: "Registration failed." }, { status: 500 });
  }
}
