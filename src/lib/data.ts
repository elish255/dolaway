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

/* =========================================================
   CHATTERS
========================================================= */

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

/* =========================================================
   ACCOUNT TYPES
========================================================= */

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

/* =========================================================
   HELPERS
========================================================= */

function mapAccount(row: Record<string, unknown>): Account {
  const statusValue = String(row.status ?? "pending");

  const status: Account["status"] =
    statusValue === "approved"
      ? "approved"
      : statusValue === "rejected"
        ? "rejected"
        : "pending";

  const role: Account["role"] =
    String(row.role ?? "user") === "admin" ? "admin" : "user";

  const completed = Array.isArray(row.completed)
    ? row.completed.map(String)
    : [];

  const rawBalance = Number(row.balance ?? 0);

  return {
    id: String(row.id ?? ""),
    fullName: String(row.full_name ?? ""),
    username: String(row.username ?? ""),
    email: String(row.email ?? ""),
    phone: String(row.phone ?? ""),
    country: String(row.country ?? ""),
    status,
    role,
    balance: Number.isFinite(rawBalance) ? rawBalance : 0,
    completed,
  };
}

/* =========================================================
   LOAD ACCOUNT
========================================================= */

export async function loadAccount(): Promise<Account> {
  if (!isBackendConfigured()) {
    return emptyAccount;
  }

  const session = getSession();

  if (!session?.user?.id) {
    return emptyAccount;
  }

  const userId = session.user.id;
  const encodedId = encodeURIComponent(userId);

  try {
    const profiles = await rest<Record<string, unknown>[]>(
      `/rest/v1/profiles?select=${profileSelect}&id=eq.${encodedId}&limit=1`,
    );

    if (!Array.isArray(profiles) || !profiles[0]) {
      return emptyAccount;
    }

    let completed: string[] = [];

    try {
      const sessions = await rest<{ foreigner_slug?: string }[]>(
        `/rest/v1/chat_sessions?select=foreigner_slug&user_id=eq.${encodedId}&status=eq.completed`,
      );

      if (Array.isArray(sessions)) {
        completed = sessions
          .map((item) => String(item.foreigner_slug ?? ""))
          .filter(Boolean);
      }
    } catch (chatError) {
      console.warn("DolaWay: could not load completed chats", chatError);
      completed = [];
    }

    return mapAccount({
      ...profiles[0],
      completed,
    });
  } catch (error) {
    console.error("DolaWay loadAccount error:", error);

    /*
     * Do not crash the whole page if the profile request temporarily fails.
     */
    return emptyAccount;
  }
}

/* =========================================================
   REGISTER
========================================================= */

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
  const country = input.country.trim();

  const auth = await backendSignUp(email, input.password, {
    full_name: fullName,
    username,
    phone,
    country,
  });

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
            country,
          }),
        },
      );
    } catch (error) {
      console.warn(
        "DolaWay: profile details could not be updated after signup",
        error,
      );
    }
  }

  return loadAccount();
}

/* =========================================================
   SIGN IN
========================================================= */

export async function signIn(
  usernameOrEmail: string,
  password: string,
): Promise<Account | null> {
  try {
    const identifier = usernameOrEmail.trim();

    if (!identifier || !password) {
      return null;
    }

    let email = identifier;

    /*
     * User can login using either email or username.
     */
    if (!identifier.includes("@")) {
      email = await rpc<string | null>("get_login_email", {
        p_username: identifier,
      });

      if (!email) {
        return null;
      }
    }

    await backendSignIn(email, password);

    const account = await loadAccount();

    if (!account.id) {
      return null;
    }

    return account;
  } catch (error) {
    console.error("DolaWay signIn error:", error);
    return null;
  }
}

/* =========================================================
   SIGN OUT
========================================================= */

export async function signOut() {
  await backendSignOut();

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("dolaway-account"));
  }
}

/* =========================================================
   ACTIVATION PAYMENT
========================================================= */

export async function createPayment(phone: string) {
  return rpc("create_activation_payment", {
    p_phone: phone.trim(),
  });
}

export async function getPendingPayment() {
  const session = getSession();

  if (!session?.user?.id) {
    return null;
  }

  const userId = encodeURIComponent(session.user.id);

  try {
    /*
     * IMPORTANT:
     * This now loads only the logged-in user's payment.
     */
    const rows = await rest<
      {
        id: string;
        status: string;
        amount: number;
      }[]
    >(
      `/rest/v1/activation_payments?select=id,status,amount&user_id=eq.${userId}&order=created_at.desc&limit=1`,
    );

    return rows[0] ?? null;
  } catch (error) {
    console.error("DolaWay getPendingPayment error:", error);
    return null;
  }
}

/* =========================================================
   FOREIGNERS
========================================================= */

export async function getForeigners(): Promise<Chatter[]> {
  try {
    const rows = await rpc<any[]>("get_foreigners", {});

    if (!Array.isArray(rows) || rows.length === 0) {
      return chatters;
    }

    return rows.map((row) => ({
      slug: String(row.slug ?? ""),
      name: String(row.name ?? row.slug ?? ""),
      emoji: String(row.emoji ?? "🌍"),
      avatar: String(row.avatar ?? ""),
      online: Boolean(row.online),
      rating: Number(row.rating ?? 0) || 0,
      minutes: Number(row.minutes ?? 0) || 0,
      wants: String(row.wants ?? ""),
      tzs: Number(row.payout ?? 0) || 0,
    }));
  } catch (error) {
    console.warn("DolaWay getForeigners fallback:", error);
    return chatters;
  }
}

/* =========================================================
   CHAT SESSION
========================================================= */

export async function getChatSession(
  slug: string,
): Promise<ChatSession> {
  return rpc<ChatSession>("get_or_create_chat_session", {
    p_foreigner_slug: slug,
  });
}

/* =========================================================
   CHAT MESSAGES
========================================================= */

export async function getChatMessages(
  sessionId: string,
): Promise<ChatMessage[]> {
  const encodedId = encodeURIComponent(sessionId);

  const rows = await rest<any[]>(
    `/rest/v1/chat_messages?select=id,sender_type,content,created_at&session_id=eq.${encodedId}&order=created_at.asc`,
  );

  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map((row) => ({
    id: String(row.id ?? ""),
    from: row.sender_type === "user" ? "me" : "them",
    text: String(row.content ?? ""),
    created_at: String(row.created_at ?? ""),
  }));
}

/* =========================================================
   SEND CHAT MESSAGE
========================================================= */

export async function sendChatMessage(
  sessionId: string,
  text: string,
): Promise<ChatSession> {
  const message = text.trim();

  if (!message) {
    throw new Error("Ujumbe hauwezi kuwa tupu.");
  }

  return rpc<ChatSession>("send_chat_message", {
    p_session_id: sessionId,
    p_content: message,
  });
}

/* =========================================================
   COMPLETE CHAT
========================================================= */

export async function completeChat(sessionId: string) {
  const encodedId = encodeURIComponent(sessionId);

  try {
    /*
     * Database itself completes and rewards the chat at message 20.
     * We only read the current session here.
     */
    const rows = await rest<ChatSession[]>(
      `/rest/v1/chat_sessions?select=id,foreigner_slug,payout,message_count,status&id=eq.${encodedId}&limit=1`,
    );

    return rows[0] ?? null;
  } catch (error) {
    console.error("DolaWay completeChat error:", error);
    return null;
  }
}

/* =========================================================
   WITHDRAWAL
========================================================= */

export async function createWithdrawal(
  amount: number,
  phone: string,
) {
  const value = Number(amount);

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Kiasi cha withdrawal si sahihi.");
  }

  if (!phone.trim()) {
    throw new Error("Weka namba ya simu.");
  }

  return rpc<{ balance: number }>("request_withdrawal", {
    p_amount: value,
    p_phone: phone.trim(),
  });
}

export async function getWithdrawals() {
  try {
    return await rest<Record<string, unknown>[]>(
      `/rest/v1/withdrawals?select=*&order=created_at.desc`,
    );
  } catch (error) {
    console.error("DolaWay getWithdrawals error:", error);
    return [];
  }
}

/* =========================================================
   ADMIN - USERS
========================================================= */

export async function adminUsers() {
  return rest<Record<string, unknown>[]>(
    `/rest/v1/profiles?select=${profileSelect}&order=created_at.desc`,
  );
}

/* =========================================================
   ADMIN - PAYMENTS
========================================================= */

export async function adminPayments() {
  /*
   * IMPORTANT FIX:
   *
   * Do NOT use:
   *
   * select=*,profiles(...)
   *
   * because Supabase found multiple relationships between
   * activation_payments and profiles.
   *
   * We fetch payments first, then fetch profiles separately.
   * This completely avoids the relationship ambiguity.
   */

  const payments = await rest<Record<string, any>[]>(
    `/rest/v1/activation_payments?select=*&order=created_at.desc`,
  );

  if (!Array.isArray(payments) || payments.length === 0) {
    return [];
  }

  const userIds = Array.from(
    new Set(
      payments
        .map((payment) => String(payment.user_id ?? ""))
        .filter(Boolean),
    ),
  );

  if (userIds.length === 0) {
    return payments;
  }

  const profileResults: Record<string, any>[] = [];

  /*
   * Fetch profiles one by one.
   * This is intentionally simple and avoids all PostgREST
   * relationship/embedding ambiguity.
   */
  for (const userId of userIds) {
    try {
      const rows = await rest<Record<string, any>[]>(
        `/rest/v1/profiles?select=id,full_name,username,email,phone,country,status,role,balance&id=eq.${encodeURIComponent(userId)}&limit=1`,
      );

      if (rows[0]) {
        profileResults.push(rows[0]);
      }
    } catch (error) {
      console.warn(
        "DolaWay: could not load payment profile",
        userId,
        error,
      );
    }
  }

  const profileMap = new Map(
    profileResults.map((profile) => [
      String(profile.id),
      profile,
    ]),
  );

  return payments.map((payment) => ({
    ...payment,
    profiles:
      profileMap.get(String(payment.user_id ?? "")) ?? null,
  }));
}

/* =========================================================
   ADMIN - WITHDRAWALS
========================================================= */

export async function adminWithdrawals() {
  return getWithdrawals();
}

/* =========================================================
   ADMIN - APPROVE PAYMENT
========================================================= */

export async function approvePayment(paymentId: string) {
  return rpc("review_activation_payment", {
    p_payment_id: paymentId,
    p_status: "approved",
  });
}

/* =========================================================
   ADMIN - REJECT PAYMENT
========================================================= */

export async function rejectPayment(paymentId: string) {
  return rpc("review_activation_payment", {
    p_payment_id: paymentId,
    p_status: "rejected",
  });
}

/* =========================================================
   NUMBER FORMATTER
========================================================= */

export const fmt = (
  value: number | string | null | undefined,
): string => {
  const numberValue = Number(value ?? 0);

  if (!Number.isFinite(numberValue)) {
    return "0";
  }

  return numberValue.toLocaleString("en-US");
};