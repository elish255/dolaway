import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Banknote,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock3,
  LogOut,
  Wallet,
  X,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import {
  getMe,
  getNotifications,
  logout,
  requestWithdrawal,
} from "@/lib/app.functions";
import { chatters, fmt } from "@/lib/data";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });
type Row = Record<string, unknown>;

function Dashboard() {
  const nav = useNavigate();
  const me = useServerFn(getMe);
  const notes = useServerFn(getNotifications);
  const out = useServerFn(logout);
  const withdraw = useServerFn(requestWithdrawal);
  const [user, setUser] = useState<Row | null>(null);
  const [notifications, setNotifications] = useState<Row[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const [amount, setAmount] = useState("50000");
  const [method, setMethod] = useState("M-Pesa");
  const [account, setAccount] = useState("");
  const [notice, setNotice] = useState("");

  async function refresh() {
    try {
      const result = await me();
      if (!result.user) {
        nav({ to: "/signin" });
        return;
      }
      if (result.user.status !== "active") {
        nav({ to: "/payment" });
        return;
      }
      setUser(result.user);
      setNotifications((await notes()).notifications);
    } catch {
      nav({ to: "/signin" });
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setNotice("");
    try {
      await withdraw({
        data: { amount: Number(amount), method, accountNumber: account },
      });
      setNotice("Ombi la withdrawal limetumwa kwa admin.");
      setShowWithdrawal(false);
      await refresh();
    } catch (error) {
      setNotice(
        error instanceof Error && error.message.includes("INSUFFICIENT")
          ? "Salio halitoshi kwa kiasi hicho."
          : "Withdrawal haikufanikiwa.",
      );
    }
  }

  if (!user) {
    return (
      <main className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
        Inapakia dashboard...
      </main>
    );
  }

  const balance = Number(user.balance ?? 0);
  const withdrawn = Number(user.withdrawn ?? 0);
  const firstName = String(user.name ?? "").split(" ")[0];

  return (
    <main className="min-h-screen bg-muted/40 pb-16">
      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between rounded-3xl border border-border/70 bg-card px-5 py-4 shadow-sm">
          <div>
            <p className="text-xs font-bold tracking-[0.22em] text-primary">DOLAWAY</p>
            <h1 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">
              Karibu, {firstName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Endelea kujenga kipato chako leo.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                aria-label="Fungua notifications"
                onClick={() => setShowNotifications((value) => !value)}
                className="relative flex size-11 items-center justify-center rounded-2xl border border-border bg-background transition hover:bg-muted"
              >
                <Bell className="size-5" />
                {notifications.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                    {notifications.length}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 top-14 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-3 shadow-xl">
                  {notifications.length === 0 ? (
                    <p className="p-4 text-center text-sm text-muted-foreground">Hakuna notifications.</p>
                  ) : (
                    notifications.map((notification) => (
                      <div key={String(notification.id)} className="rounded-xl bg-muted/60 p-3">
                        <p className="font-semibold">{String(notification.title)}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{String(notification.message)}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              aria-label="Toka kwenye akaunti"
              onClick={() => void out().then(() => nav({ to: "/" }))}
              className="flex size-11 items-center justify-center rounded-2xl border border-border bg-background transition hover:bg-muted"
            >
              <LogOut className="size-5" />
            </button>
          </div>
        </header>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="relative overflow-hidden rounded-3xl bg-primary p-6 text-primary-foreground shadow-lg sm:p-8">
            <div className="absolute -right-16 -top-20 size-56 rounded-full bg-white/10" />
            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-primary-foreground/75">SALIO LAKO</p>
                  <p className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">TZS {fmt(balance)}</p>
                  <p className="mt-3 flex items-center gap-2 text-sm text-primary-foreground/80">
                    <CheckCircle2 className="size-4" />
                    Malipo ya chat yaliyokamilika yanaonekana hapa
                  </p>
                </div>
                <div className="rounded-2xl bg-white/15 p-3">
                  <Wallet className="size-6" />
                </div>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setShowWithdrawal(true)}
                  disabled={balance < 50000}
                  className="inline-flex items-center gap-2 rounded-xl bg-background px-4 py-3 text-sm font-bold text-foreground transition hover:bg-background/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Banknote className="size-4" /> Toa pesa
                </button>
                <Link
                  to="/chat/$slug"
                  params={{ slug: chatters[0].slug }}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-4 py-3 text-sm font-bold transition hover:bg-white/10"
                >
                  Anza chat <ArrowUpRight className="size-4" />
                </Link>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
            <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">Jumla iliyotolewa</p>
              <p className="mt-2 text-2xl font-bold">TZS {fmt(withdrawn)}</p>
              <p className="mt-2 text-xs text-muted-foreground">Malipo yaliyotumwa kwako</p>
            </div>
            <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">Hali ya akaunti</p>
              <p className="mt-2 flex items-center gap-2 text-2xl font-bold text-success">
                <span className="size-2 rounded-full bg-success" /> Active
              </p>
              <p className="mt-2 text-xs text-muted-foreground">Uko tayari kuanza chat</p>
            </div>
          </div>
        </section>

        {notice && <div className="mt-4 rounded-2xl border border-success/20 bg-success/10 p-4 text-sm font-semibold text-success">{notice}</div>}

        <section className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-primary">OPPORTUNITIES</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight">Wageni walio tayari kuchat</h2>
            </div>
            <span className="hidden items-center gap-2 text-sm font-semibold text-success sm:flex"><span className="size-2 rounded-full bg-success" /> Wapo online</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {chatters.map((chatter) => (
              <article key={chatter.slug} className="group flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <img src={chatter.avatar} alt={`${chatter.name} profile`} className="size-14 rounded-2xl object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{chatter.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{chatter.wants}</p>
                  <p className="mt-1 text-xs font-semibold text-success">TZS {fmt(chatter.tzs)} / chat</p>
                </div>
                <Link to="/chat/$slug" params={{ slug: chatter.slug }} className="inline-flex items-center gap-1 rounded-xl bg-secondary px-3 py-2 text-xs font-bold text-secondary-foreground transition group-hover:bg-primary group-hover:text-primary-foreground">
                  CHAT <ChevronRight className="size-3" />
                </Link>
              </article>
            ))}
          </div>
        </section>

        <div className="mt-8 flex items-start gap-3 rounded-2xl border border-border/70 bg-card p-4 text-sm text-muted-foreground shadow-sm">
          <Clock3 className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>Malipo ya chat yakikamilika yataongezwa moja kwa moja kwenye <strong className="text-foreground">SALIO LAKO</strong>.</p>
        </div>
      </div>

      {showWithdrawal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-semibold text-primary">WITHDRAWAL</p><h2 className="mt-1 text-xl font-bold">Omba kutoa pesa</h2></div>
              <button type="button" aria-label="Funga withdrawal" onClick={() => setShowWithdrawal(false)} className="rounded-xl p-2 hover:bg-muted"><X className="size-5" /></button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Kiwango cha chini cha kutoa ni TZS 50,000.</p>
            <input type="number" min={50000} value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-5 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" aria-label="Kiasi cha kutoa" />
            <select value={method} onChange={(event) => setMethod(event.target.value)} className="mt-3 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" aria-label="Njia ya malipo">
              <option>M-Pesa</option><option>Airtel Money</option><option>Mixx by Yas</option><option>HaloPesa</option>
            </select>
            <input required value={account} onChange={(event) => setAccount(event.target.value)} placeholder="Namba ya simu/akaunti" aria-label="Namba ya simu au akaunti" className="mt-3 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
            <button className="mt-5 w-full rounded-xl bg-primary py-3.5 font-bold text-primary-foreground transition hover:bg-primary/90">TUMA OMBI</button>
          </form>
        </div>
      )}
    </main>
  );
}
