import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { hashPassword } from "@/lib/auth/password";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";

type UpdateUserBody = {
  fullName?: string;
  email?: string;
  role?: UserRole;
  password?: string;
};

const parseUpdateBody = (raw: unknown): UpdateUserBody => {
  if (!raw || typeof raw !== "object") return {};
  const body = raw as Record<string, unknown>;
  const next: UpdateUserBody = {};

  if (typeof body.fullName === "string" && body.fullName.trim()) next.fullName = body.fullName.trim();
  if (typeof body.email === "string" && body.email.trim()) next.email = body.email.trim().toLowerCase();
  if (body.role === "AGENT" || body.role === "CUSTOMER") {
    next.role = body.role;
  }
  if (typeof body.password === "string" && body.password.length > 0) {
    if (body.password.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }
    next.password = body.password;
  }

  return next;
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const gate = await requireAdmin();
    if ("response" in gate) return gate.response;

    const { id } = await params;
    const payload = parseUpdateBody(await request.json());

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: "No valid fields provided." }, { status: 400 });
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });

    if (!target) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (target.role === "ADMIN" && payload.role !== undefined) {
      return NextResponse.json({ error: "Cannot change admin role here." }, { status: 400 });
    }

    const data: {
      fullName?: string;
      email?: string;
      role?: UserRole;
      passwordHash?: string;
    } = {};

    if (payload.fullName) data.fullName = payload.fullName;
    if (payload.email) data.email = payload.email;
    if (payload.role) data.role = payload.role;
    if (payload.password) {
      data.passwordHash = await hashPassword(payload.password);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No valid fields provided." }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("Password must")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("Failed to update user:", error);
    return NextResponse.json({ error: "Failed to update user." }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const gate = await requireAdmin();
    if ("response" in gate) return gate.response;

    const { id } = await params;

    if (id === gate.user.id) {
      return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { role: true },
    });

    if (target?.role === "ADMIN") {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) {
        return NextResponse.json({ error: "Cannot delete the last admin." }, { status: 400 });
      }
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ message: "User deleted." }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete user:", error);
    return NextResponse.json({ error: "Failed to delete user." }, { status: 500 });
  }
}
