import {
  getSession,
  isBackendConfigured,
  rest,
  rpc,
  signIn as backendSignIn,
  signOut as backendSignOut,
  signUp as backendSignUp,
} from "./supabase";

export const ACTIVATION_FEE = 14500;

export type Chatter = {
  slug: string;
  name: string;
  emoji: string;
  avatar: string;
  online: boolean;
  rating: number;
  minutes: number;
  wants: string;
  tzs: number;
};

// Frontend fallback data. The same people are also seeded in the DolaWay
// Supabase database. Keeping a complete fallback prevents a blank/error page
// if the database request is temporarily unavailable.
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

export type Account = {
  id: string;
  fullName: string;
  username: string;
  email: string;
  phone: string;
  country: string;
  status: "pending" | "approved" | "rejected";
  role: "user" | "admin";
  balance: number;
  completed: string[];
};

export type ChatMessage = {
  id: string;
  from: "them" | "me";
  text: string;
  created_at: string;
};

export type ChatSession = {
  id: string;
  foreigner_slug: string;
  payout: number;
  message_count: number;
  status: "open" | "completed" | "closed" | string;
};

export const emptyAccount: Account = {
  id: "",
  fullName: "",
  username: "",
  email: "",
  phone: "",
  country: "",
  status: "pending",
  role: "user",
  balance: 0,
  completed: [],
};

const profileSelect = "id,full_name,username,email,phone,country,status,role,balance";

function mapAccount(row: Record<string, unknown>): Account {
  const status = row.status === "approved" || row.status === "rejected" ? row.status : "pending";
  const role = row.role === "admin" ? "admin" : "user";
  const completed = Array.isArray(row.completed) ? row.completed.map(String) : [];

  return {
    id: String(row.id ?? ""),
    fullName: String(row.full_name ?? ""),
    username: String(row.username ?? ""),
    email: String(row.email ?? ""),
    phone: String(row.phone ?? ""),
    country: String(row.country ?? ""),
    status,
    role,
    balance: Number(row.balance ?? 0) || 0,
    completed,
  };
}

export async function loadAccount(): Promise<Account> {
  if (!isBackendConfigured()) return emptyAccount;
  const session = getSession();
  if (!session?.user?.id) return emptyAccount;

  try {
    const id = encodeURIComponent(session.user.id);
    const rows = await rest<Record<string, unknown>[]>(
      `/rest/v1/profiles?select=${profileSelect}&id=eq.${id}&limit=1`,
    );

    if (!rows[0]) return emptyAccount;

    const completed = await rest<{ foreigner_slug: string }[]>(
      `/rest/v1/chat_sessions?select=foreigner_slug&user_id=eq.${id}&status=eq.completed`,
    );

    return mapAccount({
      ...rows[0],
      completed: completed.map((x) => x.foreigner_slug),
    });
  } catch {
    return emptyAccount;
  }
}

export async function registerAccount(input: {
  fullName: string;
  username: string;
  email: string;
  phone: string;
  country: string;
  password: string;
}) {
  const auth = await backendSignUp(input.email, input.password, {
    full_name: input.fullName.trim(),
    username: input.username.trim(),
    phone: input.phone.trim(),
    country: input.country,
  });

  if (!auth.access_token) {
    throw new Error("Akaunti imetengenezwa. Thibitisha email yako kisha login ili kuendelea.");
  }

  const userId = auth.user?.id;
  if (userId) {
    await rest(`/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        full_name: input.fullName.trim(),
        username: input.username.trim(),
        phone: input.phone.trim(),
        country: input.country,
      }),
    });
  }

  return loadAccount();
}

export async function signIn(usernameOrEmail: string, password: string): Promise<Account | null> {
  try {
    const identifier = usernameOrEmail.trim();
    const email = identifier.includes("@")
      ? identifier
      : await rpc<string | null>("get_login_email", { p_username: identifier });

    if (!email) return null;
    await backendSignIn(email, password);
    return await loadAccount();
  } catch {
    return null;
  }
}

export async function signOut() {
  await backendSignOut();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("dolaway-account"));
  }
}

export async function createPayment(phone: string) {
  return rpc("create_activation_payment", { p_phone: phone });
}

export async function getPendingPayment() {
  const rows = await rest<{ id: string; status: string; amount: number }[]>(
    `/rest/v1/activation_payments?select=id,status,amount&order=created_at.desc&limit=1`,
  );
  return rows[0] ?? null;
}

export async function getForeigners(): Promise<Chatter[]> {
  try {
    const rows = await rpc<any[]>("get_foreigners", {});
    if (!Array.isArray(rows) || rows.length === 0) return chatters;

    return rows.map((r) => ({
      slug: String(r.slug),
      name: String(r.name ?? r.slug),
      emoji: String(r.emoji ?? "🌍"),
      avatar: String(r.avatar ?? ""),
      online: Boolean(r.online),
      rating: Number(r.rating ?? 0),
      minutes: Number(r.minutes ?? 0),
      wants: String(r.wants ?? ""),
      tzs: Number(r.payout ?? 0) || 0,
    }));
  } catch {
    return chatters;
  }
}

export async function getChatSession(slug: string) {
  return rpc<ChatSession>("get_or_create_chat_session", {
    p_foreigner_slug: slug,
  });
}

export async function getChatMessages(sessionId: string) {
  const id = encodeURIComponent(sessionId);
  const rows = await rest<any[]>(
    `/rest/v1/chat_messages?select=id,sender_type,content,created_at&session_id=eq.${id}&order=created_at.asc`,
  );

  return rows.map((x) => ({
    id: String(x.id),
    from: x.sender_type === "user" ? "me" : "them",
    text: String(x.content ?? ""),
    created_at: String(x.created_at ?? ""),
  })) as ChatMessage[];
}

export async function sendChatMessage(sessionId: string, text: string) {
  return rpc<ChatSession>("send_chat_message", {
    p_session_id: sessionId,
    p_content: text,
  });
}

export async function completeChat(sessionId: string) {
  // The database rewards and closes the chat automatically on message 20.
  // There is intentionally no extra message sent here, preventing message 21.
  return rpc<ChatSession>("get_my_chat_sessions", {}).then((sessions: ChatSession[]) =>
    sessions.find((s) => s.id === sessionId) ?? null,
  );
}

export async function createWithdrawal(amount: number, phone: string) {
  return rpc<{ balance: number }>("request_withdrawal", {
    p_amount: amount,
    p_phone: phone,
  });
}

export async function getWithdrawals() {
  return rest<Record<string, unknown>[]>(`/rest/v1/withdrawals?select=*&order=created_at.desc`);
}

export async function adminUsers() {
  return rest<Record<string, unknown>[]>(
    `/rest/v1/profiles?select=${profileSelect}&order=created_at.desc`,
  );
}

export async function adminPayments() {
  return rest<Record<string, unknown>[]>(
    `/rest/v1/activation_payments?select=*,profiles(full_name,username,email)&order=created_at.desc`,
  );
}

export async function adminWithdrawals() {
  return getWithdrawals();
}

export async function approvePayment(paymentId: string) {
  return rpc("review_activation_payment", {
    p_payment_id: paymentId,
    p_status: "approved",
  });
}

export async function rejectPayment(paymentId: string) {
  return rpc("review_activation_payment", {
    p_payment_id: paymentId,
    p_status: "rejected",
  });
}

export const fmt = (n: number | null | undefined) =>
  Number(n ?? 0).toLocaleString("en-US");
