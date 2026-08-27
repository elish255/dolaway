import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/SiteHeader";
import {
  ACTIVATION_FEE,
  fmt,
  loadAccount,
  saveAccount,
  type Account,
} from "@/lib/data";
import { checkPaymentStatus, createPaymentOrder } from "@/lib/mobilipa.functions";

type Search = { chat?: string | undefined };

export const Route = createFileRoute("/payment")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    chat: typeof search["chat"] === "string" ? search["chat"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Lipa | DolaWay" },
      {
        name: "description",
        content: "Lipia activation ya DolaWay kwa Mobilipa USSD Push na baada ya uthibitisho nenda dashboard.",
      },
      { property: "og:title", content: "Lipa | DolaWay" },
      { property: "og:description", content: "Lipia activation kwa Mobilipa USSD Push." },
    ],
  }),
  component: PaymentPage,
});

type Phase = "form" | "processing" | "success" | "failed";

function PaymentPage() {
  const { chat } = Route.useSearch();
  const navigate = useNavigate();
  const createOrder = useServerFn(createPaymentOrder);
  const checkStatus = useServerFn(checkPaymentStatus);
  const [account, setAccount] = useState<Account | null>(null);
  const [phone, setPhone] = useState("");
  const [phase, setPhase] = useState<Phase>("form");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [orderId, setOrderId] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopped = useRef(false);

  useEffect(() => {
    const acc = loadAccount();
    setAccount(acc);
    if (!acc.username) {
      navigate({ to: "/register", search: chat ? { chat } : {} });
      return;
    }
    if (acc.activated) {
      if (chat) navigate({ to: "/chat/$slug", params: { slug: chat } });
      else navigate({ to: "/dashboard" });
      return;
    }
    setPhone(acc.phone);
  }, [chat, navigate]);

  useEffect(() => {
    return () => {
      stopped.current = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const markPaidAndContinue = () => {
    const current = loadAccount();
    saveAccount({ ...current, activated: true });
    setPhase("success");
    setMessage("Malipo yamepokelewa! Akaunti yako imewashwa.");
    timer.current = setTimeout(() => {
      if (chat) navigate({ to: "/chat/$slug", params: { slug: chat } });
      else navigate({ to: "/dashboard" });
    }, 1200);
  };

  const poll = async (id: string) => {
    for (let attempt = 0; attempt < 60 && !stopped.current; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      if (stopped.current) return;

      const result = await checkStatus({ data: { orderId: id } });
      const status = result.status.toUpperCase();

      if (["COMPLETED", "SUCCESS", "PAID"].includes(status)) {
        markPaidAndContinue();
        return;
      }

      if (["FAILED", "CANCELLED", "USERCANCELLED", "REJECTED"].includes(status)) {
        setPhase("failed");
        setError("Malipo hayakufanikiwa. Tafadhali jaribu tena.");
        return;
      }
    }

    if (!stopped.current) {
      setPhase("failed");
      setError("Muda wa kusubiri malipo umeisha. Tafadhali jaribu tena.");
    }
  };

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, "");
    if (!/^0[67]\d{8}$/.test(cleanPhone)) {
      setError("Namba ya simu si sahihi (mfano 0712345678).");
      return;
    }

    setError("");
    setPhase("processing");
    setMessage("Tunatuma USSD Push...");
    try {
      const current = loadAccount();
      const order = await createOrder({
        data: {
          name: current.fullName,
          email: current.email || undefined,
          phone: cleanPhone,
          amount: ACTIVATION_FEE,
        },
      });

      if (!order.ok || !order.orderId) {
        setPhase("form");
        setError(order.ok ? "Imeshindikana kuanzisha malipo." : order.message);
        return;
      }

      setOrderId(order.orderId);
      setMessage(order.message || `Thibitisha USSD Push kwenye ${cleanPhone}.`);
      saveAccount({ ...current, phone: cleanPhone });
      void poll(order.orderId);
    } catch (err) {
      setPhase("form");
      setError(err instanceof Error ? err.message : "Imeshindikana kuanzisha malipo.");
    }
  };

  if (!account) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Inapakia...
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <SiteHeader />

      <main className="mx-auto max-w-lg px-3 py-5">
        <div className="rounded-2xl bg-brand-deep px-4 py-5 text-center">
          <p className="text-[11px] font-bold tracking-[0.25em] text-brand-foreground/70">HATUA YA 2</p>
          <h1 className="mt-1 text-[22px] font-black text-gold">Lipa Activation</h1>
          <p className="mt-2 text-[13px] text-brand-foreground/70">
            Kamilisha malipo ili kufungua dashboard yako.
          </p>
        </div>

        <section className="card-soft mt-4 p-4">
          <div className="rounded-2xl bg-muted py-5 text-center">
            <p className="text-[12px] font-bold tracking-[0.18em] text-muted-foreground">KIASI CHA KULIPA</p>
            <p className="mt-1 text-[40px] font-black leading-none text-gold">
              {fmt(ACTIVATION_FEE)} <span className="text-[19px] align-middle">TZS</span>
            </p>
          </div>

          {phase === "form" && (
            <form onSubmit={pay} className="mt-5">
              <label htmlFor="payphone" className="text-[14px] font-semibold text-foreground">
                Namba ya simu ya kupokea USSD Push
              </label>
              <input
                id="payphone"
                inputMode="numeric"
                autoComplete="tel"
                required
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="0712345678"
                className="mt-1.5 w-full rounded-xl border-2 border-primary bg-background px-4 py-3 text-[16px] outline-none"
              />

              <p className="mt-2 text-[13px] text-muted-foreground">
                Utapokea USSD Push kwenye namba hii. Ingiza PIN yako kwenye simu kuthibitisha.
              </p>

              {error && (
                <p className="mt-3 rounded-xl bg-destructive/10 px-4 py-3 text-[13px] font-semibold text-destructive">
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="mt-5 w-full rounded-full bg-primary py-4 text-[18px] font-bold tracking-wide text-primary-foreground shadow-lg shadow-primary/30"
              >
                🔒 LIPA SASA
              </button>
            </form>
          )}

          {phase === "processing" && (
            <div className="py-10 text-center">
              <div className="mx-auto size-12 animate-spin rounded-full border-4 border-muted border-t-primary" />
              <p className="mt-4 text-[17px] font-bold text-foreground">Inasubiri malipo...</p>
              <p className="mt-2 text-[14px] text-muted-foreground">{message}</p>
              {orderId && <p className="mt-2 text-[11px] text-muted-foreground">Order: {orderId}</p>}
            </div>
          )}

          {phase === "success" && (
            <div className="py-10 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-success text-2xl text-success-foreground">✓</div>
              <p className="mt-4 text-[19px] font-bold text-success">Malipo yamepokelewa!</p>
              <p className="mt-2 text-[14px] text-muted-foreground">
                Tunakupeleka kwenye {chat ? "chat" : "dashboard"}...
              </p>
            </div>
          )}

          {phase === "failed" && (
            <div className="py-8 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-destructive/10 text-2xl text-destructive">!</div>
              <p className="mt-4 text-[18px] font-bold text-destructive">Malipo hayajakamilika</p>
              <p className="mt-2 text-[14px] text-muted-foreground">{error}</p>
              <button
                onClick={() => {
                  setError("");
                  setMessage("");
                  setOrderId("");
                  setPhase("form");
                }}
                className="mt-5 w-full rounded-full bg-primary py-3.5 text-[16px] font-bold text-primary-foreground"
              >
                JARIBU TENA
              </button>
            </div>
          )}
        </section>

        <Link
          to="/register"
          search={chat ? { chat } : {}}
          className="mt-4 block text-center text-[14px] font-semibold text-muted-foreground underline"
        >
          ← Rudi kwenye usajili
        </Link>

        <div className="mt-5 rounded-2xl border border-border bg-card px-4 py-4 text-center">
          <p className="text-[12px] font-bold text-foreground">🔒 MALIPO SALAMA</p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Baada ya Mobilipa kuthibitisha malipo, dashboard itafunguka moja kwa moja.
          </p>
        </div>
      </main>
    </div>
  );
}
