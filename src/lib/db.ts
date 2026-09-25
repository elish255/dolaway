import { createServerFn } from "@tanstack/react-start";

function env(name: string, fallback?: string) {
  const value = process.env[name] || fallback;
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value.replace(/\/$/, "");
}

function serverKey() {
  // New Supabase key name first; legacy service-role is accepted for compatibility.
  return env("SUPABASE_SECRET_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function headers(extra: Record<string, string> = {}) {
  const key = serverKey();
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...extra };
}

export type DbRow = Record<string, unknown>;

export async function supabaseRest<T = DbRow[]>(table: string, options: { method?: string; query?: Record<string, string | number | boolean | undefined>; body?: unknown; prefer?: string } = {}): Promise<T> {
  const url = new URL(`${env("SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL)}/rest/v1/${table}`);
  for (const [key, value] of Object.entries(options.query ?? {})) if (value !== undefined) url.searchParams.set(key, String(value));
  const method = options.method ?? "GET";
  const res = await fetch(url, { method, headers: headers({ Prefer: options.prefer ?? (method === "POST" ? "return=representation" : "return=minimal") }), body: options.body === undefined ? undefined : JSON.stringify(options.body) });
  const text = await res.text();
  if (!res.ok) throw new Error(`Database error ${res.status}: ${text.slice(0, 500)}`);
  if (!text) return [] as T;
  return JSON.parse(text) as T;
}
