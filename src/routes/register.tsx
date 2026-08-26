import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/SiteHeader";
import { ACTIVATION_FEE, fmt, loadAccount, saveAccount } from "@/lib/data";
import { checkPaymentStatus, createPaymentOrder } from "@/lib/mobilipa.functions";

type Search = { chat?: string | undefined };

export const Route = createFileRoute("/register")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    chat: typeof search["chat"] === "string" ? (search["chat"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Jisajili | DolaWay" },
      { name: "description", content: "Jaza fomu ya usajili wa DolaWay kisha lipa ada ya uanzishaji ili kuanza kuchat na kulipwa." },
      { property: "og:title", content: "Jisajili | DolaWay" },
      { property: "og:description", content: "Jaza fomu ya usajili kisha lipa ada ya uanzishaji ili kuanza kulipwa." },
    ],
  }),
  component: RegisterPage,
});

type Stage = "form" | "pay" | "processing" | "done";

function RegisterPage() {
  const { chat } = Route.useSearch();
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>("form");
  const [fullName, setFullName] = useState("");
  const [region, setRegion] = useState("");
  const [phone, setPhone] = useState("");
  const [payPhone, setPayPhone] = useState("");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (fullName.trim().length < 3) return setError("Weka jina lako kamili.");
    if (!/^0[67]\d{8}$/.test(phone.trim())) return setError("Namba ya simu si sahihi (mfano 0712345678).");
    if (!region.trim()) return setError("Chagua mkoa wako.");
    setError("");
    setPayPhone(phone.trim());
    setStage("pay");
  };

  const pay = () => {
    if (!/^0[67]\d{8}$/.test(payPhone.trim())) return setError("Namba ya simu si sahihi.");
    setError("");
    setStage("processing");
    setTimeout(() => {
      const acc = loadAccount();
      saveAccount({
        ...acc,
        fullName: fullName.trim(),
        phone: phone.trim(),
        region: region.trim(),
        activated: true,
      });
      setStage("done");
      setTimeout(() => {
        if (chat) navigate({ to: "/chat/$slug", params: { slug: chat } });
        else navigate({ to: "/dashboard" });
      }, 1400);
    }, 2600);
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      <SiteHeader />

      <main className="mx-auto max-w-lg px-3 py-5">
        <div className="rounded-2xl bg-brand-deep px-4 py-5 text-center">
          <p className="text-[11px] font-bold tracking-[0.25em] text-brand-foreground/70">HATUA YA 1</p>
          <h1 className="mt-1 text-[22px] font-black text-gold">Jisajili Ili Kuanza Kulipwa</h1>
        </div>

        <form onSubmit={submit} className="card-soft mt-4 space-y-4 p-4">
          <div>
            <label htmlFor="name" className="text-[14px] font-semibold text-foreground">
              Jina kamili
            </label>
            <input
              id="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Mfano: Asha Juma"
              maxLength={60}
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-[15px] outline-none focus:border-primary"
            />
          </div>

          <div>
            <label htmlFor="phone" className="text-[14px] font-semibold text-foreground">
              Namba ya simu
            </label>
            <input
              id="phone"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0712345678"
              maxLength={10}
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-[15px] outline-none focus:border-primary"
            />
          </div>

          <div>
            <label htmlFor="region" className="text-[14px] font-semibold text-foreground">
              Mkoa
            </label>
            <select
              id="region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-[15px] outline-none focus:border-primary"
            >
              <option value="">Chagua mkoa</option>
              {["Dar es Salaam", "Arusha", "Mwanza", "Dodoma", "Mbeya", "Tanga", "Morogoro", "Zanzibar", "Nyingine"].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {error && stage === "form" && <p className="text-[13px] font-semibold text-destructive">{error}</p>}

          <button
            type="submit"
            className="w-full rounded-xl bg-primary py-3.5 text-[17px] font-bold text-primary-foreground shadow-lg shadow-primary/30"
          >
            SIGN UP
          </button>
          <Link to="/" className="block text-center text-[14px] underline text-muted-foreground">
            Rudi nyumbani
          </Link>
        </form>
      </main>

      {stage !== "form" && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/50 px-3 py-6 sm:items-center">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-gradient-to-r from-success to-gold">
            <div className="px-6 pb-4 pt-6">
              <p className="text-[12px] font-bold tracking-[0.3em] text-success-foreground">HATUA YA 2</p>
            </div>
            <div className="rounded-3xl bg-card px-5 py-6">
              {stage === "pay" && (
                <>
                  <div className="rounded-2xl bg-success-soft py-5 text-center">
                    <p className="text-[13px] font-bold tracking-[0.15em] text-success/80">KIASI CHA KULIPA</p>
                    <p className="mt-1 text-[40px] font-black leading-none text-success">
                      {fmt(ACTIVATION_FEE)} <span className="text-[20px] align-middle">TZS</span>
                    </p>
                  </div>

                  <label htmlFor="payphone" className="mt-5 block text-[16px] font-semibold text-foreground">
                    Namba ya simu
                  </label>
                  <div className="mt-2 flex items-center gap-2 rounded-full border-2 border-success px-4 py-3">
                    <span aria-hidden>📱</span>
                    <input
                      id="payphone"
                      inputMode="numeric"
                      maxLength={10}
                      value={payPhone}
                      onChange={(e) => setPayPhone(e.target.value)}
                      placeholder="0712345678"
                      className="w-full bg-transparent text-[17px] outline-none"
                    />
                  </div>
                  <p className="mt-2 text-[13px] text-muted-foreground">
                    Utapokea USSD push ya kuthibitisha malipo kwenye namba hii.
                  </p>
                  {error && <p className="mt-2 text-[13px] font-semibold text-destructive">{error}</p>}

                  <button
                    onClick={pay}
                    className="mt-5 w-full rounded-full bg-success py-4 text-[18px] font-bold tracking-wide text-success-foreground"
                  >
                    LIPA SASA
                  </button>
                  <button
                    onClick={() => setStage("form")}
                    className="mx-auto mt-5 block text-[15px] underline text-foreground"
                  >
                    Rudi kwenye usajili
                  </button>
                </>
              )}

              {stage === "processing" && (
                <div className="py-10 text-center">
                  <div className="mx-auto size-12 animate-spin rounded-full border-4 border-success-soft border-t-success" />
                  <p className="mt-4 text-[16px] font-semibold text-foreground">Inasubiri malipo...</p>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    Thibitisha USSD push kwenye {payPhone}
                  </p>
                </div>
              )}

              {stage === "done" && (
                <div className="py-10 text-center">
                  <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-success text-2xl text-success-foreground">
                    ✓
                  </div>
                  <p className="mt-4 text-[18px] font-bold text-success">Malipo yamepokelewa!</p>
                  <p className="mt-1 text-[14px] text-muted-foreground">Akaunti yako imewashwa. Tunakupeleka kwenye dashboard...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
