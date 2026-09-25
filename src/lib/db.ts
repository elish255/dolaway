export type DbRow = Record<string, unknown>;

function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value.replace(/\/$/, "");
}

function serverKey() {
  // Server-side database access must use the Supabase secret/service-role key.
  // Never expose this key to the browser.
  return env("SUPABASE_SERVICE_ROLE_KEY");
}

function headers(extra: Record<string, string> = {}) {
  const key = serverKey();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

export async function supabaseRest<T = DbRow[]>(
  table: string,
  options: {
    method?: string;
    query?: Record<string, string | number | boolean | undefined>;
    body?: unknown;
    prefer?: string;
  } = {},
): Promise<T> {
  const url = new URL(`${env("SUPABASE_URL")}/rest/v1/${table}`);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  const res = await fetch(url, {
    method: options.method ?? "GET",
    headers: headers({
      Prefer: options.prefer ?? (options.method === "POST" ? "return=representation" : "return=minimal"),
    }),
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Database error ${res.status}: ${text.slice(0, 500)}`);
  }
  if (!text) return [] as T;
  return JSON.parse(text) as T;
}

export async function supabaseRpc<T = DbRow[]>(fn: string, body: unknown): Promise<T> {
  const url = `${env("SUPABASE_URL")}/rest/v1/rpc/${fn}`;
  const key = serverKey();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Database RPC error ${res.status}: ${text.slice(0, 500)}`);
  if (!text) return [] as T;
  return JSON.parse(text) as T;
}
