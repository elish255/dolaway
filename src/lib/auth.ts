import { clearSession, updateSession, useSession } from "@tanstack/react-start/server";

export type SessionData = { userId?: string; role?: "user" | "admin"; expiresAt?: number };

function sessionConfig() {
  const secret = process.env.SESSION_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET_MISSING");
  }
  return {
    password: secret ?? "chatpesa-local-development-secret",
    name: "chatpesa-session",
    maxAge: 60 * 20,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
    },
  };
}

export async function readSession() {
  const session = await useSession<SessionData>(sessionConfig());
  const data = session.data;
  if (data.expiresAt && data.expiresAt <= Date.now()) {
    await clearSession(sessionConfig());
    return {} as SessionData;
  }
  return data;
}

export async function setSession(data: SessionData) {
  await updateSession(sessionConfig(), { ...data, expiresAt: Date.now() + 20 * 60 * 1000 });
}

export async function logoutSession() {
  await clearSession(sessionConfig());
}

export async function requireUser() {
  const session = await readSession();
  if (!session.userId || session.role !== "user") throw new Error("UNAUTHORIZED");
  return session.userId;
}

export async function requireAdmin() {
  const session = await readSession();
  if (!session.userId || session.role !== "admin") throw new Error("UNAUTHORIZED");
  return session.userId;
}
