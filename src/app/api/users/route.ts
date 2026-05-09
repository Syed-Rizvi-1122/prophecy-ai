import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { getAppUserFromSession } from "@/lib/auth/get-app-user";
import { hashPassword } from "@/lib/auth/password";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";

type CreateUserBody = {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const parseCreateUserBody = (raw: unknown): CreateUserBody => {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid JSON body.");
  }

  const body = raw as Record<string, unknown>;
  const roleValue = body.role;

  if (
    !isNonEmptyString(body.fullName) ||
    !isNonEmptyString(body.email) ||
    !isNonEmptyString(body.password)
  ) {
    throw new Error("fullName, email, and password are required.");
  }

  if (body.password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  if (roleValue !== "AGENT" && roleValue !== "CUSTOMER") {
    throw new Error("role must be AGENT or CUSTOMER.");
  }

  return {
    fullName: body.fullName.trim(),
    email: body.email.trim().toLowerCase(),
    password: body.password,
    role: roleValue,
  };
};

export async function GET(request: NextRequest) {
  try {
    const me = await getAppUserFromSession();
    if (!me) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (me.role === "CUSTOMER") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const requestedRole = request.nextUrl.searchParams.get("role");
    const roleFilter =
      requestedRole === "ADMIN" || requestedRole === "AGENT" || requestedRole === "CUSTOMER"
        ? requestedRole
        : undefined;

    if (me.role === "AGENT") {
      const users = await prisma.user.findMany({
        where: { role: "AGENT" },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ users }, { status: 200 });
    }

    const users = await prisma.user.findMany({
      where: roleFilter ? { role: roleFilter } : undefined,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json({ error: "Failed to fetch users." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const gate = await requireAdmin();
    if ("response" in gate) return gate.response;

    const payload = parseCreateUserBody(await request.json());

    const existing = await prisma.user.findUnique({
      where: {
        email: payload.email,
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ error: "Email already exists." }, { status: 409 });
    }

    const passwordHash = await hashPassword(payload.password);

    const user = await prisma.user.create({
      data: {
        fullName: payload.fullName,
        email: payload.email,
        passwordHash,
        role: payload.role,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json(
      {
        message: "User registered successfully.",
        user,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status =
      message.includes("required") ||
      message.includes("Invalid JSON") ||
      message.includes("must be") ||
      message.includes("role must")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
