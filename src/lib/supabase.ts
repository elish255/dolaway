const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const SESSION_KEY = "dolaway_supabase_session";

type Session = { access_token: string; refresh_token?: string; user?: { id: string; email?: string } };

export function isBackendConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function requireConfig() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Backend haijawekwa. Weka VITE_SUPABASE_URL na VITE_SUPABASE_ANON_KEY.");
  }
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch { return null; }
}

export function setSession(session: Session | null) {
  if (typeof window === "undefined") return;
  if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else window.localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event("dolaway-session"));
}

async function request(path: string, init: RequestInit = {}, auth = true) {
  requireConfig();
  const session = getSession();
  const headers = new Headers(init.headers);
  headers.set("apikey", SUPABASE_ANON_KEY!);
  headers.set("Content-Type", "application/json");
  if (auth && session?.access_token) headers.set("Authorization", `Bearer ${session.access_token}`);
  const response = await fetch(`${SUPABASE_URL}${path}`, { ...init, headers });
  const text = await response.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) {
    const message = typeof data === "object" && data && "message" in data ? String((data as { message: unknown }).message) : "Request failed";
    throw new Error(message);
  }
  return data;
}

export async function signUp(email: string, password: string, metadata: Record<string, string>) {
  const data = await request("/auth/v1/signup", { method: "POST", body: JSON.stringify({ email, password, data: metadata }) }, false) as Session;
  if (data.access_token) setSession(data);
  return data;
}

export async function signIn(email: string, password: string) {
  const data = await request(`/auth/v1/token?grant_type=password`, { method: "POST", body: JSON.stringify({ email, password }) }, false) as Session;
  setSession(data);
  return data;
}

export async function signOut() {
  try { await request("/auth/v1/logout", { method: "POST" }); } finally { setSession(null); }
}

export async function rest<T>(path: string, init: RequestInit = {}) { return await request(path, init) as T; }

export async function rpc<T>(name: string, args: Record<string, unknown> = {}) {
  return await request(`/rest/v1/rpc/${name}`, { method: "POST", body: JSON.stringify(args) }) as T;
}
