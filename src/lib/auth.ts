import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";

export type SessionData = { userId?: string; role?: "user" | "admin"; expiresAt?: number };

const COOKIE_NAME = "dolaway-session";
const COOKIE_OPTIONS = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 60 * 20 };

function encode(data: SessionData) { return Buffer.from(JSON.stringify(data)).toString("base64url"); }
function decode(value?: string): SessionData { if (!value) return {}; try { return JSON.parse(Buffer.from(value, "base64url").toString("utf8")); } catch { return {}; } }

export async function readSession() {
  const data = decode(getCookie(COOKIE_NAME));
  if (data.expiresAt && data.expiresAt <= Date.now()) { await logoutSession(); return {}; }
  return data;
}
export async function setSession(data: SessionData) { setCookie(COOKIE_NAME, encode({ ...data, expiresAt: Date.now() + 20 * 60 * 1000 }), COOKIE_OPTIONS); }
export async function logoutSession() { deleteCookie(COOKIE_NAME, COOKIE_OPTIONS); }
export async function requireUser() { const s=await readSession(); if(!s.userId || s.role!=="user") throw new Error("UNAUTHORIZED"); return s.userId; }
export async function requireAdmin() { const s=await readSession(); if(!s.userId || s.role!=="admin") throw new Error("UNAUTHORIZED"); return s.userId; }
