import { cookies } from "next/headers";
import {
    createSession,
    deleteSession,
    getUserFromSession,
} from "../services/authService";

const SESSION_COOKIE = "session_id";

export async function setSessionCookie(userId: number) {
  const { sessionId, expiresAt } = await createSession(userId);

  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(expiresAt),
    path: "/",
  });

  return sessionId;
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();

  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (sessionId) {
    await deleteSession(sessionId);
  }

  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();

  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (!sessionId) {
    return null;
  }

  return getUserFromSession(sessionId);
}