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

export type Account = {
  fullName: string;
  username: string;
  password: string;
  phone: string;
  country: string;
  activated: boolean;
  balance: number;
  completed: string[];
};

const KEY = "dolaway_account";
const USERS_KEY = "dolaway_users";

export const countries = [
  "Tanzania",
  "Kenya",
  "Uganda",
  "Rwanda",
  "Burundi",
  "DR Congo",
  "Zambia",
  "Malawi",
  "Msumbiji",
  "Afrika Kusini",
  "Nyingine",
];

export const emptyAccount: Account = {
  fullName: "",
  username: "",
  password: "",
  phone: "",
  country: "",
  activated: false,
  balance: 0,
  completed: [],
};

export function loadAccount(): Account {
  if (typeof window === "undefined") return emptyAccount;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...emptyAccount, ...(JSON.parse(raw) as Account) } : emptyAccount;
  } catch {
    return emptyAccount;
  }
}

function loadUsers(): Record<string, Account> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, Account>) : {};
  } catch {
    return {};
  }
}

export function saveAccount(account: Account) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(account));
  if (account.username) {
    const users = loadUsers();
    users[account.username.trim().toLowerCase()] = account;
    window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
  window.dispatchEvent(new Event("dolaway-account"));
}

export function usernameTaken(username: string) {
  return Boolean(loadUsers()[username.trim().toLowerCase()]);
}

export function signIn(username: string, password: string): Account | null {
  const user = loadUsers()[username.trim().toLowerCase()];
  if (!user || user.password !== password) return null;
  saveAccount(user);
  return user;
}

export function signOut() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("dolaway-account"));
}

export const fmt = (n: number) => n.toLocaleString("en-US");

