import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

export const AUTH_COOKIE = "auth_token";
const JWT_EXPIRES_IN = "7d";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return new TextEncoder().encode(secret);
}

export async function setAuthCookie(user: {
  id: number;
  email: string;
  name: string | null;
  role: string;
}) {
  const token = await new SignJWT({
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({
      alg: "HS256",
    })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(getJwtSecret());

  const cookieStore = await cookies();

  cookieStore.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();

  cookieStore.delete(AUTH_COOKIE);
}

/** Verify the same HTTP-only JWT used by REST requests, outside Next request context. */
export async function verifyAuthToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), { algorithms: ["HS256"] });
    if (!payload.sub) return null;
    return {
      id: Number(payload.sub),
      email: String(payload.email),
      name: payload.name == null ? null : String(payload.name),
      role: String(payload.role),
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies();

  const token = cookieStore.get(AUTH_COOKIE)?.value;

  if (!token) {
    return null;
  }

  return verifyAuthToken(token);
}

export async function requireAdmin() {
  const user = await getCurrentUser();

  if (!user) {
    return {
      user: null,
      error: "Not authenticated",
    };
  }

  if (user.role !== "ADMIN") {
    return {
      user: null,
      error: "Admin access required",
    };
  }

  return {
    user,
    error: null,
  };
}
