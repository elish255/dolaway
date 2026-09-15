import { getSession, isBackendConfigured, rest, rpc, signIn as backendSignIn, signOut as backendSignOut, signUp as backendSignUp } from "./supabase";

export type Chatter = { slug: string; name: string; emoji: string; avatar: string; online: boolean; rating: number; minutes: number; wants: string; tzs: number };
export const chatters: Chatter[] = [
  { slug: "Isabella", name: "Isabella", emoji: "🎵", avatar: "https://i.pravatar.cc/150?img=48", online: true, rating: 4.8, minutes: 47, wants: "Practice Conversation & Music", tzs: 54500 },
  { slug: "Priya", name: "Priya", emoji: "🌺", avatar: "https://i.pravatar.cc/150?img=25", online: true, rating: 4.9, minutes: 38, wants: "Gardens, Flowers & Nature Words", tzs: 44500 },
  { slug: "Felix", name: "Felix", emoji: "🚗", avatar: "https://i.pravatar.cc/150?img=44", online: true, rating: 4.7, minutes: 33, wants: "Cars & Transport Conversation", tzs: 38500 },
  { slug: "Harriet", name: "Harriet", emoji: "🎨", avatar: "https://i.pravatar.cc/150?img=61", online: true, rating: 4.6, minutes: 24, wants: "Art & Colors in Swahili", tzs: 31000 },
  { slug: "Bianca", name: "Bianca", emoji: "👗", avatar: "https://i.pravatar.cc/150?img=21", online: true, rating: 4.9, minutes: 43, wants: "Fashion & Cultural Clothes", tzs: 48000 },
  { slug: "Rosalie", name: "Rosalie", emoji: "🌐", avatar: "https://i.pravatar.cc/150?img=47", online: true, rating: 4.9, minutes: 51, wants: "Languages & World Cultures", tzs: 53500 },
  { slug: "Rowan", name: "Rowan", emoji: "🚴", avatar: "https://i.pravatar.cc/150?img=59", online: true, rating: 4.9, minutes: 45, wants: "Cycling & Outdoor Life", tzs: 50500 },
  { slug: "Matilda", name: "Matilda", emoji: "🍕", avatar: "https://i.pravatar.cc/150?img=26", online: true, rating: 4.9, minutes: 49, wants: "African Food Recipes Discussion", tzs: 52500 },
  { slug: "Thomas", name: "Thomas", emoji: "💼", avatar: "https://i.pravatar.cc/150?img=28", online: true, rating: 4.8, minutes: 40, wants: "Business & Work Vocabulary", tzs: 46000 },
];
export const ACTIVATION_FEE = 14500;
export type Account = { id: string; fullName: string; username: string; email: string; phone: string; country: string; status: "pending" | "approved" | "rejected"; role: "user" | "admin"; balance: number; completed: string[] };
export type ChatMessage = { id: string; from: "them" | "me"; text: string; created_at: string };
export type ChatSession = { id: string; foreigner_slug: string; payout: number; message_count: number; status: "open" | "completed" | "closed" };

export const emptyAccount: Account = { id: "", fullName: "", username: "", email: "", phone: "", country: "", status: "pending", role: "user", balance: 0, completed: [] };
const profileSelect = "id,full_name,username,email,phone,country,status,role,balance";

function mapAccount(row: Record<string, unknown>): Account {
  return { id: String(row.id ?? ""), fullName: String(row.full_name ?? ""), username: String(row.username ?? ""), email: String(row.email ?? ""), phone: String(row.phone ?? ""), country: String(row.country ?? ""), status: (row.status as Account["status"]) ?? "pending", role: (row.role as Account["role"]) ?? "user", balance: Number(row.balance ?? 0), completed: Array.isArray(row.completed) ? row.completed.map(String) : [] };
}

export async function loadAccount(): Promise<Account> {
  if (!isBackendConfigured() || !getSession()) return emptyAccount;
  try {
    const rows = await rest<Record<string, unknown>[]>(`/rest/v1/profiles?select=${profileSelect}&id=eq.${encodeURIComponent(getSession()!.user?.id ?? "")}&limit=1`);
    if (!rows[0]) return emptyAccount;
    const completed = await rest<{ foreigner_slug: string }[]>(`/rest/v1/chat_sessions?select=foreigner_slug&user_id=eq.${encodeURIComponent(rows[0].id)}&status=eq.completed`);
    return mapAccount({ ...rows[0], completed: completed.map((x) => x.foreigner_slug) });
  } catch { return emptyAccount; }
}

export async function registerAccount(input: { fullName: string; username: string; email: string; phone: string; country: string; password: string }) {
  const auth = await backendSignUp(input.email, input.password, { full_name: input.fullName, username: input.username });
  if (!auth.access_token) throw new Error("Akaunti imeundwa. Thibitisha email yako kisha login ili kuendelea.");
  await rest(`/rest/v1/profiles?id=eq.${encodeURIComponent(auth.user?.id ?? "")}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ full_name: input.fullName.trim(), username: input.username.trim(), email: input.email.trim(), phone: input.phone.trim(), country: input.country }) });
  return loadAccount();
}

export async function signIn(usernameOrEmail: string, password: string): Promise<Account | null> {
  try {
    const email = usernameOrEmail.includes("@") ? usernameOrEmail : await rpc<string | null>("get_login_email", { p_username: usernameOrEmail.trim() });
    if (!email) return null;
    await backendSignIn(email, password);
    return await loadAccount();
  } catch { return null; }
}
export async function signOut() { await backendSignOut(); window.dispatchEvent(new Event("dolaway-account")); }
export async function createPayment() { return await rpc<{ id: string }>("create_activation_payment", { p_amount: ACTIVATION_FEE }); }
export async function getPendingPayment() { const rows = await rest<{ id: string; status: string; amount: number }[]>(`/rest/v1/payments?select=id,status,amount&payment_type=eq.activation&order=created_at.desc&limit=1`); return rows[0] ?? null; }
export async function getChatSession(slug: string, payout: number) { return await rpc<ChatSession>("get_or_create_chat_session", { p_foreigner_slug: slug, p_payout: payout }); }
export async function getChatMessages(sessionId: string) { return await rest<ChatMessage[]>(`/rest/v1/chat_messages?select=id,sender_type,content,created_at&session_id=eq.${encodeURIComponent(sessionId)}&order=created_at.asc`).then(rows => rows.map(r => ({ id:r.id, from:r.sender_type === "user" ? "me" : "them", text:r.content, created_at:r.created_at })));
}
export async function sendChatMessage(sessionId: string, content: string) { return await rpc<ChatSession>("send_chat_message", { p_session_id: sessionId, p_content: content }); }
export async function completeChat(sessionId: string) { return await rpc<{ balance: number }>("complete_chat", { p_session_id: sessionId }); }
export async function createWithdrawal(amount: number, phone: string) { return await rpc<{ balance: number }>("request_withdrawal", { p_amount: amount, p_phone: phone }); }
export async function getWithdrawals() { return await rest<Record<string, unknown>[]>(`/rest/v1/withdrawals?select=*&order=created_at.desc`); }
export async function adminUsers() { return await rest<Record<string, unknown>[]>(`/rest/v1/profiles?select=${profileSelect}&order=created_at.desc`); }
export async function adminPayments() { return await rest<Record<string, unknown>[]>(`/rest/v1/payments?select=*,profiles(full_name,username,email)&order=created_at.desc`); }
export async function adminWithdrawals() { return await getWithdrawals(); }
export async function approvePayment(paymentId: string) { return await rpc("approve_activation_payment", { p_payment_id: paymentId }); }
export async function rejectPayment(paymentId: string) { return await rpc("reject_activation_payment", { p_payment_id: paymentId }); }
export const fmt = (n: number) => n.toLocaleString("en-US");
