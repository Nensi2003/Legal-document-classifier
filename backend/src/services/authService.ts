import bcrypt from "bcryptjs";
import { db } from "../prisma/db";

const SESSION_DURATION_DAYS = 7;

export async function registerUser(
  email: string,
  password: string,
  name?: string
) {
  const normalizedEmail = email.trim().toLowerCase();

  // Check if user already exists
  const existingUser = await db.orm.public.User
    .where({ email: normalizedEmail })
    .first();

  if (existingUser) {
    throw new Error("User already exists");
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create user
  const user = await db.orm.public.User.create({
    email: normalizedEmail,
    password: hashedPassword,
    name: name?.trim() || null,
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}

export async function loginUser(
  email: string,
  password: string
) {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await db.orm.public.User
    .where({ email: normalizedEmail })
    .first();

  if (!user) {
    throw new Error("Invalid email or password");
  }

  const passwordMatches = await bcrypt.compare(
    password,
    user.password
  );

  if (!passwordMatches) {
    throw new Error("Invalid email or password");
  }

  return user;
}

export async function createSession(userId: number) {
  const sessionId = crypto.randomUUID();

  const expiresAt = new Date(
  Date.now() +
    SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  await db.orm.public.Session.create({
    id: sessionId,
    userId,
    expiresAt,
  });

  return {
    sessionId,
    expiresAt,
  };
}

export async function deleteSession(sessionId: string) {
  await db.orm.public.Session
    .where({ id: sessionId })
    .delete();
}

export async function getUserFromSession(sessionId: string) {
  const session = await db.orm.public.Session
    .where({ id: sessionId })
    .first();

  if (!session) {
    return null;
  }

  if (new Date(session.expiresAt) < new Date()) {
    await deleteSession(sessionId);
    return null;
  }

  const user = await db.orm.public.User
    .where({ id: session.userId })
    .first();

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}