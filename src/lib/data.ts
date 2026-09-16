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

export const chatters: Chatter[] = [
  {
    slug: "Isabella",
    name: "Isabella",
    emoji: "🎵",
    avatar: "https://i.pravatar.cc/150?img=48",
    online: true,
    rating: 4.8,
    minutes: 47,
    wants: "Practice Conversation & Music",
    tzs: 54500,
  },
  {
    slug: "Priya",
    name: "Priya",
    emoji: "🌺",
    avatar: "https://i.pravatar.cc/150?img=25",
    online: true,
    rating: 4.9,
    minutes: 38,
    wants: "Gardens, Flowers & Nature Words",
    tzs: 44500,
  },
  {
    slug: "Felix",
    name: "Felix",
    emoji: "🚗",
    avatar: "https://i.pravatar.cc/150?img=44",
    online: true,
    rating: 4.7,
    minutes: 33,
    wants: "Cars & Transport Conversation",
    tzs: 38500,
  },
  {
    slug: "Harriet",
    name: "Harriet",
    emoji: "🎨",
    avatar: "https://i.pravatar.cc/150?img=61",
    online: true,
    rating: 4.6,
    minutes: 24,
    wants: "Art & Colors in Swahili",
    tzs: 31000,
  },
  {
    slug: "Bianca",
    name: "Bianca",
    emoji: "👗",
    avatar: "https://i.pravatar.cc/150?img=21",
    online: true,
    rating: 4.9,
    minutes: 43,
    wants: "Fashion & Cultural Clothes",
    tzs: 48000,
  },
  {
    slug: "Rosalie",
    name: "Rosalie",
    emoji: "🌐",
    avatar: "https://i.pravatar.cc/150?img=47",
    online: true,
    rating: 4.9,
    minutes: 51,
    wants: "Languages & World Cultures",
    tzs: 53500,
  },
  {
    slug: "Rowan",
    name: "Rowan",
    emoji: "🚴",
    avatar: "https://i.pravatar.cc/150?img=59",
    online: true,
    rating: 4.9,
    minutes: 45,
    wants: "Cycling & Outdoor Life",
    tzs: 50500,
  },
  {
    slug: "Matilda",
    name: "Matilda",
    emoji: "🍕",
    avatar: "https://i.pravatar.cc/150?img=26",
    online: true,
    rating: 4.9,
    minutes: 49,
    wants: "African Food Recipes Discussion",
    tzs: 52500,
  },
  {
    slug: "Thomas",
    name: "Thomas",
    emoji: "💼",
    avatar: "https://i.pravatar.cc/150?img=28",
    online: true,
    rating: 4.8,
    minutes: 40,
    wants: "Business & Work Vocabulary",
    tzs: 46000,
  },
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

const profileSelect =
  "id,full_name,username,email,phone,country,status,role,balance";

function mapAccount(row: Record<string, unknown>): Account {
  const status =
    row.status === "approved" || row.status === "rejected"
      ? row.status
      : "pending";

  const role = row.role === "admin" ? "admin" : "user";

  const completed = Array.isArray(row.completed)
    ? row.completed.map(String)
    : [];

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
  if (!isBackendConfigured()) {
    return emptyAccount;
  }

  const session = getSession();

  if (!session?.user?.id) {
    return emptyAccount;
  }

  try {
    const id = encodeURIComponent(session.user.id);

    const rows = await rest<Record<string, unknown>[]>(
      `/rest/v1/profiles?select=${profileSelect}&id=eq.${id}&limit=1`,
    );

    if (!rows[0]) {
      return emptyAccount;
    }

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

/**
 * Converts raw Supabase/PostgreSQL errors into messages
 * ambazo user anaweza kuelewa.
 */
function getRegistrationError(error: unknown): Error {
  const raw =
    error instanceof Error
      ? error.message
      : String(error ?? "");

  const message = raw.toLowerCase();

  // Username duplicate
  if (
    message.includes("profiles_username_key") ||
    message.includes("duplicate key value") &&
      message.includes("username") ||
    message.includes("username already exists") ||
    message.includes("username has already been taken")
  ) {
    return new Error(
      "Username hii tayari imetumika. Tafadhali chagua username nyingine.",
    );
  }

  // Email duplicate
  if (
    message.includes("email") &&
    (
      message.includes("already registered") ||
      message.includes("already exists") ||
      message.includes("duplicate")
    )
  ) {
    return new Error(
      "Email hii tayari imesajiliwa. Tafadhali tumia email nyingine au ingia kwenye akaunti yako.",
    );
  }

  // Phone duplicate
  if (
    message.includes("phone") &&
    (
      message.includes("duplicate") ||
      message.includes("already exists") ||
      message.includes("already used")
    )
  ) {
    return new Error(
      "Namba hii ya simu tayari imetumika. Tafadhali tumia namba nyingine.",
    );
  }

  // Weak password
  if (
    message.includes("password") &&
    (
      message.includes("weak") ||
      message.includes("at least") ||
      message.includes("short")
    )
  ) {
    return new Error(
      "Password ni dhaifu. Tafadhali tumia password yenye angalau herufi 6.",
    );
  }

  // Invalid email
  if (
    message.includes("invalid") &&
    message.includes("email")
  ) {
    return new Error(
      "Email uliyoingiza si sahihi. Tafadhali hakikisha umeandika email vizuri.",
    );
  }

  return new Error(
    "Usajili umeshindikana. Tafadhali hakikisha taarifa zako na ujaribu tena.",
  );
}

export async function registerAccount(input: {
  fullName: string;
  username: string;
  email: string;
  phone: string;
  country: string;
  password: string;
}) {
  const fullName = input.fullName.trim();
  const username = input.username.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();

  if (!fullName) {
    throw new Error("Tafadhali weka jina lako.");
  }

  if (!username) {
    throw new Error("Tafadhali weka username.");
  }

  if (username.length < 3) {
    throw new Error(
      "Username inapaswa kuwa na angalau herufi 3.",
    );
  }

  if (!/^[a-zA-Z0-9]+$/.test(username)) {
    throw new Error(
      "Username itumie herufi na namba tu.",
    );
  }

  if (!email) {
    throw new Error("Tafadhali weka email yako.");
  }

  if (!phone) {
    throw new Error("Tafadhali weka namba yako ya simu.");
  }

  if (input.password.length < 6) {
    throw new Error(
      "Password inapaswa kuwa na angalau herufi 6.",
    );
  }

  try {
    const auth = await backendSignUp(
      email,
      input.password,
      {
        full_name: fullName,
        username,
        phone,
        country: input.country,
      },
    );

    if (!auth.access_token) {
      throw new Error(
        "Akaunti imetengenezwa. Thibitisha email yako kisha login ili kuendelea.",
      );
    }

    const userId = auth.user?.id;

    if (userId) {
      try {
        await rest(
          `/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`,
          {
            method: "PATCH",
            headers: {
              Prefer: "return=minimal",
            },
            body: JSON.stringify({
              full_name: fullName,
              username,
              phone,
              country: input.country,
            }),
          },
        );
      } catch (error) {
        throw getRegistrationError(error);
      }
    }

    return loadAccount();
  } catch (error) {
    throw getRegistrationError(error);
  }
}

export async function signIn(
  usernameOrEmail: string,
  password: string,
): Promise<Account | null> {
  try {
    const identifier = usernameOrEmail.trim();

    if (!identifier || !password) {
      return null;
    }

    const email = identifier.includes("@")
      ? identifier
      : await rpc<string | null>(
          "get_login_email",
          {
            p_username: identifier,
          },
        );

    if (!email) {
      return null;
    }

    await backendSignIn(email, password);

    return await loadAccount();
  } catch {
    return null;
  }
}

export async function signOut() {
  await backendSignOut();

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new Event("dolaway-account"),
    );
  }
}

export async function createPayment(phone: string) {
  return rpc("create_activation_payment", {
    p_phone: phone,
  });
}

export async function getPendingPayment() {
  const rows = await rest<
    {
      id: string;
      status: string;
      amount: number;
    }[]
  >(
    `/rest/v1/activation_payments?select=id,status,amount&order=created_at.desc&limit=1`,
  );

  return rows[0] ?? null;
}

export async function getForeigners(): Promise<Chatter[]> {
  try {
    const rows = await rpc<any[]>(
      "get_foreigners",
      {},
    );

    if (
      !Array.isArray(rows) ||
      rows.length === 0
    ) {
      return chatters;
    }

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

export async function getChatSession(
  slug: string,
) {
  return rpc<ChatSession>(
    "get_or_create_chat_session",
    {
      p_foreigner_slug: slug,
    },
  );
}

export async function getChatMessages(
  sessionId: string,
) {
  const id = encodeURIComponent(sessionId);

  const rows = await rest<any[]>(
    `/rest/v1/chat_messages?select=id,sender_type,content,created_at&session_id=eq.${id}&order=created_at.asc`,
  );

  return rows.map((x) => ({
    id: String(x.id),
    from:
      x.sender_type === "user"
        ? "me"
        : "them",
    text: String(x.content ?? ""),
    created_at: String(
      x.created_at ?? "",
    ),
  })) as ChatMessage[];
}

export async function sendChatMessage(
  sessionId: string,
  text: string,
) {
  return rpc<ChatSession>(
    "send_chat_message",
    {
      p_session_id: sessionId,
      p_content: text,
    },
  );
}

export async function completeChat(
  sessionId: string,
) {
  try {
    const sessions = await rpc<
      ChatSession[]
    >("get_my_chat_sessions", {});

    return (
      sessions.find(
        (s) => s.id === sessionId,
      ) ?? null
    );
  } catch {
    return null;
  }
}

export async function createWithdrawal(
  amount: number,
  phone: string,
) {
  return rpc<{ balance: number }>(
    "request_withdrawal",
    {
      p_amount: amount,
      p_phone: phone,
    },
  );
}

export async function getWithdrawals() {
  return rest<
    Record<string, unknown>[]
  >(
    `/rest/v1/withdrawals?select=*&order=created_at.desc`,
  );
}

export async function adminUsers() {
  return rest<
    Record<string, unknown>[]
  >(
    `/rest/v1/profiles?select=${profileSelect}&order=created_at.desc`,
  );
}

export async function adminPayments() {
  return rest<
    Record<string, unknown>[]
  >(
    `/rest/v1/activation_payments?select=*&order=created_at.desc`,
  );
}

export async function adminWithdrawals() {
  return getWithdrawals();
}

export async function approvePayment(
  paymentId: string,
) {
  return rpc(
    "review_activation_payment",
    {
      p_payment_id: paymentId,
      p_status: "approved",
    },
  );
}

export async function rejectPayment(
  paymentId: string,
) {
  return rpc(
    "review_activation_payment",
    {
      p_payment_id: paymentId,
      p_status: "rejected",
    },
  );
}

export const fmt = (
  n: number | null | undefined,
) =>
  Number(n ?? 0).toLocaleString("en-US");