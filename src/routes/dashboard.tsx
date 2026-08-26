import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { chatters, fmt, loadAccount, type Account } from "@/lib/data";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | DolaWay" },
      { name: "description", content: "Angalia salio lako, chats zilizokamilika na uendelee kuchat ili kulipwa zaidi." },
      { property: "og:title", content: "Dashboard | DolaWay" },
      { property: "og:description", content: "Angalia salio lako na uendelee kuchat ili kulipwa zaidi." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [account, setAccount] = useState<Account | null>(null);

  useEffect(() => {
    const sync = () => setAccount(loadAccount());
    sync();
    window.addEventListener("dolaway-account", sync);
    return () => window.removeEventListener("dolaway-account", sync);
  }, []);

  const available = chatters.filter((c) => !(account?.completed ?? []).includes(c.slug));

  return (
    <div className="min-h-screen bg-background pb-16">
      <SiteHeader />

      <main className="mx-auto max-w-lg px-3 py-5">
        <section className="rounded-2xl bg-brand-deep px-5 py-6 text-center">
          <p className="text-[12px] font-bold tracking-[0.2em] text-brand-foreground/70">SALIO LAKO</p>
          <p className="mt-1 text-[36px] font-black text-gold">TZS {fmt(account?.balance ?? 0)}</p>
          <p className="mt-1 text-[13px] text-brand-foreground/80">
            {account?.activated ? `Karibu ${account.fullName || "mtumiaji"} • akaunti imewashwa ✓` : "Akaunti bado haijawashwa"}
          </p>
          <button
            disabled={(account?.balance ?? 0) < 50000}
            className="mt-4 w-full rounded-full bg-primary py-3 text-[15px] font-bold text-primary-foreground disabled:opacity-50"
          >
            💰 Withdraw
          </button>
          <p className="mt-2 text-[11px] text-brand-foreground/60">Kiwango cha chini cha kutoa ni TZS 50,000</p>
        </section>

        {!account?.activated && (
          <Link
            to="/register"
            className="mt-4 block rounded-xl bg-primary py-3.5 text-center text-[16px] font-bold text-primary-foreground"
          >
            📝 Jisajili & Lipa Activation
          </Link>
        )}

        <h2 className="mt-6 text-[16px] font-bold text-foreground">Chats zinazopatikana</h2>
        <div className="mt-3 space-y-3">
          {available.map((c) => (
            <Link
              key={c.slug}
              to="/chat/$slug"
              params={{ slug: c.slug }}
              className="card-soft flex items-center gap-3 p-3"
            >
              <img src={c.avatar} alt={c.name} className="size-11 rounded-full border-2 border-primary object-cover" />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold text-foreground">
                  {c.name} {c.emoji}
                </p>
                <p className="truncate text-[12px] text-muted-foreground">{c.wants}</p>
              </div>
              <span className="rounded-md bg-brand-deep px-2.5 py-1 text-[12px] font-black text-brand-foreground">
                TZS {fmt(c.tzs)}
              </span>
            </Link>
          ))}
        </div>

        {(account?.completed.length ?? 0) > 0 && (
          <>
            <h2 className="mt-6 text-[16px] font-bold text-foreground">Zilizokamilika</h2>
            <ul className="mt-2 space-y-2">
              {account!.completed.map((slug, i) => {
                const c = chatters.find((x) => x.slug === slug);
                return (
                  <li key={`${slug}-${i}`} className="card-soft flex items-center justify-between p-3 text-[14px]">
                    <span className="font-semibold text-foreground">{c?.name ?? slug}</span>
                    <span className="font-bold text-success">+ TZS {fmt(c?.tzs ?? 0)}</span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </main>
    </div>
  );
}
