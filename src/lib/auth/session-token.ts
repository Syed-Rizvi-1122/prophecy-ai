import * as jose from "jose";

export type SessionPayload = {
  sub: string;
  email: string;
  role: "ADMIN" | "AGENT" | "CUSTOMER";
};

function getSecretKey(): Uint8Array | null {
  const secret = process.env.SECRET_KEY;
  if (!secret) {
    return null;
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(payload: SessionPayload): Promise<string | null> {
  const key = getSecretKey();
  if (!key) return null;

  return new jose.SignJWT({
    email: payload.email,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  const key = getSecretKey();
  if (!key) return null;

  try {
    const { payload } = await jose.jwtVerify(token, key, { algorithms: ["HS256"] });
    const sub = typeof payload.sub === "string" ? payload.sub : null;
    const email = typeof payload.email === "string" ? payload.email : null;
    const role = payload.role;
    if (
      !sub ||
      !email ||
      (role !== "ADMIN" && role !== "AGENT" && role !== "CUSTOMER")
    ) {
      return null;
    }
    return { sub, email, role };
  } catch {
    return null;
  }
}
