import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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

type WStage = "closed" | "form" | "processing" | "sent";

function Dashboard() {
  const navigate = useNavigate();
  const [account, setAccount] = useState<Account | null>(null);
  const [wStage, setWStage] = useState<WStage>("closed");
  const [wAmount, setWAmount] = useState("");
  const [wPhone, setWPhone] = useState("");
  const [wError, setWError] = useState("");
  const [wSent, setWSent] = useState({ amount: 0, phone: "" });

  useEffect(() => {
    const sync = () => {
      const current = loadAccount();
      setAccount(current);
      if (!current.username) {
        navigate({ to: "/register" });
        return;
      }
      if (!current.activated) {
        navigate({ to: "/payment" });
      }
    };
    sync();
    window.addEventListener("dolaway-account", sync);
    return () => window.removeEventListener("dolaway-account", sync);
  }, [navigate]);

  const available = chatters.filter((c) => !(account?.completed ?? []).includes(c.slug));

  const openWithdraw = () => {
    setWError("");
    setWAmount("");
    setWPhone(account?.phone ?? "");
    setWStage("form");
  };

  const submitWithdraw = () => {
    const amount = Number(wAmount.replace(/\D/g, ""));
    if (!amount || amount < 50000) return setWError("Kiasi cha chini ni TZS 50,000.");
    if (amount > (account?.balance ?? 0)) return setWError("Salio lako halitoshi.");
    if (!/^0[67]\d{8}$/.test(wPhone.trim())) return setWError("Namba ya simu si sahihi (mfano 0712345678).");
    setWError("");
    setWStage("processing");
    setTimeout(() => {
      setWSent({ amount, phone: wPhone.trim() });
      setWStage("sent");
    }, 3000);
  };

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
            onClick={openWithdraw}
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

      {wStage !== "closed" && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/50 px-3 py-6 sm:items-center">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-gradient-to-r from-success to-gold">
            <div className="px-6 pb-4 pt-6">
              <p className="text-[12px] font-bold tracking-[0.3em] text-success-foreground">WITHDRAWAL</p>
            </div>
            <div className="rounded-3xl bg-card px-5 py-6">
              {wStage === "form" && (
                <>
                  <div className="rounded-2xl bg-success-soft py-4 text-center">
                    <p className="text-[13px] font-bold tracking-[0.15em] text-success/80">SALIO LINALOPATIKANA</p>
                    <p className="mt-1 text-[30px] font-black leading-none text-success">
                      {fmt(account?.balance ?? 0)} <span className="text-[18px] align-middle">TZS</span>
                    </p>
                  </div>

                  <label htmlFor="wamount" className="mt-5 block text-[16px] font-semibold text-foreground">
                    Kiasi (TZS)
                  </label>
                  <div className="mt-2 flex items-center gap-2 rounded-full border-2 border-success px-4 py-3">
                    <span aria-hidden>💰</span>
                    <input
                      id="wamount"
                      inputMode="numeric"
                      maxLength={9}
                      value={wAmount}
                      onChange={(e) => setWAmount(e.target.value)}
                      placeholder="50000"
                      className="w-full bg-transparent text-[17px] outline-none"
                    />
                  </div>

                  <label htmlFor="wphone" className="mt-4 block text-[16px] font-semibold text-foreground">
                    Namba ya simu
                  </label>
                  <div className="mt-2 flex items-center gap-2 rounded-full border-2 border-success px-4 py-3">
                    <span aria-hidden>📱</span>
                    <input
                      id="wphone"
                      inputMode="numeric"
                      maxLength={10}
                      value={wPhone}
                      onChange={(e) => setWPhone(e.target.value)}
                      placeholder="0712345678"
                      className="w-full bg-transparent text-[17px] outline-none"
                    />
                  </div>

                  <p className="mt-2 text-[13px] text-muted-foreground">Kiwango cha chini cha kutoa ni TZS 50,000.</p>
                  {wError && <p className="mt-2 text-[13px] font-semibold text-destructive">{wError}</p>}

                  <button
                    onClick={submitWithdraw}
                    className="mt-5 w-full rounded-full bg-success py-4 text-[18px] font-bold tracking-wide text-success-foreground"
                  >
                    WITHDRAWAL
                  </button>
                  <button
                    onClick={() => setWStage("closed")}
                    className="mx-auto mt-5 block text-[15px] underline text-foreground"
                  >
                    Ghairi
                  </button>
                </>
              )}

              {wStage === "processing" && (
                <div className="py-10 text-center">
                  <div className="mx-auto size-12 animate-spin rounded-full border-4 border-success-soft border-t-success" />
                  <p className="mt-4 text-[16px] font-semibold text-foreground">Inatuma pesa...</p>
                  <p className="mt-1 text-[13px] text-muted-foreground">Tafadhali subiri kidogo</p>
                </div>
              )}

              {wStage === "sent" && (
                <div className="py-10 text-center">
                  <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-success text-2xl text-success-foreground">
                    ✓
                  </div>
                  <p className="mt-4 text-[18px] font-bold text-success">
                    Withdrawal ya TZS {fmt(wSent.amount)} imetumwa!
                  </p>
                  <p className="mt-1 text-[14px] text-muted-foreground">
                    Pesa imetumwa kwenye namba ya simu {wSent.phone}.
                  </p>
                  <button
                    onClick={() => setWStage("closed")}
                    className="mt-5 w-full rounded-full bg-success py-3.5 text-[16px] font-bold text-success-foreground"
                  >
                    SAWA
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
