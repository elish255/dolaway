import { createServerFn } from "@tanstack/react-start";

function env(name: string, fallback?: string) {
  const value = process.env[name] || fallback;
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value.replace(/\/$/, "");
}

function serverKey() {
  // Prefer the modern Supabase secret key. Legacy service-role JWT is supported too.
  return env("SUPABASE_SECRET_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function headers(extra: Record<string, string> = {}) {
  const key = serverKey();
  const h: Record<string, string> = {
    apikey: key,
    "Content-Type": "application/json",
    ...extra,
  };

  // `sb_secret_...` is an API key, not a JWT. Sending it as a Bearer token
  // can make PostgREST reject otherwise valid requests with 401/Invalid JWT.
  // Legacy `service_role` keys are JWTs and still need Authorization.
  if (!key.startsWith("sb_secret_")) h.Authorization = `Bearer ${key}`;
  return h;
}

export type DbRow = Record<string, unknown>;

export async function supabaseRest<T = DbRow[]>(table: string, options: { method?: string; query?: Record<string, string | number | boolean | undefined>; body?: unknown; prefer?: string } = {}): Promise<T> {
  const url = new URL(`${env("SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL)}/rest/v1/${table}`);
  for (const [key, value] of Object.entries(options.query ?? {})) if (value !== undefined) url.searchParams.set(key, String(value));
  const method = options.method ?? "GET";
  const res = await fetch(url, { method, headers: headers({ Prefer: options.prefer ?? (method === "POST" ? "return=representation" : "return=minimal") }), body: options.body === undefined ? undefined : JSON.stringify(options.body) });
  const text = await res.text();
  if (!res.ok) throw new Error(`Database error ${res.status}: ${text.slice(0, 500)}`);
  if (!text) return [] as T;
  return JSON.parse(text) as T;
}
