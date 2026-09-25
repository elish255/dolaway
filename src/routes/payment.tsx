import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, CheckCircle2, Loader2, Smartphone, Copy, ShieldCheck, Clock3 } from "lucide-react";
import { createAutomaticPayment, checkAutomaticPayment } from "@/lib/automatic-payment.functions";
import { getMe, submitManualPayment } from "@/lib/app.functions";

export const Route = createFileRoute("/payment")({
  component: Lipa,
  head: () => ({ meta: [
    { title: "Activation Payment — DOLAWAY" },
    { name: "description", content: `Lipa activation fee ya TZS ${ACTIVATION_FEE.toLocaleString()} kupitia malipo ya moja kwa moja au Lipa Namba.` },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
});

function normalize(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.startsWith("255")) return d;
  if (d.startsWith("0")) return `255${d.slice(1)}`;
  return d.length === 9 ? `255${d}` : d;
}

const ACTIVATION_FEE = Number(import.meta.env.VITE_ACTIVATION_FEE || "15000");
const LIPA_NUMBER = import.meta.env.VITE_LIPA_NUMBER || "251161660";
const LIPA_BUSINESS = import.meta.env.VITE_LIPA_BUSINESS || "DOLAWAY";

function Lipa() {
  const navigate = useNavigate();
  const createPayment = useServerFn(createAutomaticPayment);
  const checkPayment = useServerFn(checkAutomaticPayment);
  const manualPayment = useServerFn(submitManualPayment);
  const me = useServerFn(getMe);
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState<"automatic" | "lipa_namba">("automatic");
  const [orderId, setOrderId] = useState("");
  const [status, setStatus] = useState("PENDING");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [manualSent, setManualSent] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void me().then((res) => {
        if (res.user?.status === "active") void navigate({ to: "/dashboard" });
      }).catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [me, navigate]);

  useEffect(() => {
    void me().then((res) => { if (res.user?.status === "active") void navigate({ to: "/dashboard" }); if (res.user?.phone) setPhone(String(res.user.phone)); }).catch(() => undefined);
  }, [me, navigate]);

  useEffect(() => {
    if (!orderId) return;
    let tries = 0;
    const poll = async () => {
      tries += 1;
      try {
        const res = await checkPayment({ data: { orderId } });
        setStatus(res.status);
        if (res.status === "SUCCESS") { if (timer.current) clearInterval(timer.current); await navigate({ to: "/dashboard" }); }
        if (res.status === "FAILED") { if (timer.current) clearInterval(timer.current); setError("Malipo hayajakamilika. Jaribu tena."); }
      } catch { /* subiri poll inayofuata */ }
      if (tries >= 60 && timer.current) clearInterval(timer.current);
    };
    timer.current = setInterval(poll, 5000);
    void poll();
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [orderId, checkPayment, navigate]);

  async function startAutomaticPayment(e: React.FormEvent) {
    e.preventDefault(); setError(""); setMessage("");
    const msisdn = normalize(phone);
    if (!/^255\d{9}$/.test(msisdn)) { setError("Weka namba sahihi, mfano 0712345678."); return; }
    setLoading(true);
    try {
      const res = await createPayment({ data: { phone: msisdn } });
      if (res.orderId === "already-active") { await navigate({ to: "/dashboard" }); return; }
      setOrderId(res.orderId); setStatus("PENDING"); setMessage(res.message);
    } catch (err) { setError(err instanceof Error ? err.message : "Imeshindwa kuanzisha malipo."); }
    finally { setLoading(false); }
  }

  async function submitManual(e: React.FormEvent) {
    e.preventDefault(); setError(""); setMessage("");
    const msisdn = normalize(phone);
    if (!/^255\d{9}$/.test(msisdn)) { setError("Weka namba sahihi, mfano 0712345678."); return; }
    setLoading(true);
    try { await manualPayment({ data: { phone: msisdn } }); setManualSent(true); setMessage("Taarifa imetumwa kwa admin. Subiri uthibitisho wa muamala."); }
    catch (err) { setError(err instanceof Error ? err.message : "Imeshindikana kutuma taarifa."); }
    finally { setLoading(false); }
  }

  async function copyNumber() { try { await navigator.clipboard.writeText(LIPA_NUMBER); setMessage("Lipa Namba ime-copyiwa."); } catch { /* ignore */ } }

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto w-full max-w-xl">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-primary"><ArrowLeft className="h-4 w-4" /> Rudi mwanzo</Link>
        <div className="mt-4 rounded-3xl bg-card p-5 shadow-card sm:p-6">
          <img src="/logo.png" alt="DOLAWAY" className="mx-auto h-20 w-full object-contain" />
          <h1 className="mt-2 text-center text-2xl font-extrabold text-foreground">Activation Fee TZS {ACTIVATION_FEE.toLocaleString()}</h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">Chagua njia moja ya malipo hapa chini.</p>

          <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-secondary p-1">
            <button type="button" onClick={() => setMethod("automatic")} className={`rounded-xl px-3 py-3 text-sm font-extrabold ${method === "automatic" ? "bg-card text-primary shadow-card" : "text-muted-foreground"}`}>Malipo ya Moja kwa Moja</button>
            <button type="button" onClick={() => setMethod("lipa_namba")} className={`rounded-xl px-3 py-3 text-sm font-extrabold ${method === "lipa_namba" ? "bg-card text-primary shadow-card" : "text-muted-foreground"}`}>Lipa Namba</button>
          </div>

          {method === "automatic" ? (
            <form onSubmit={startAutomaticPayment} className="mt-5 space-y-4">
              <div><label className="text-sm font-semibold text-foreground">Namba ya simu</label><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712345678" className="mt-1 w-full rounded-xl bg-secondary px-4 py-3 text-sm text-foreground outline-none" /></div>
              <div className="rounded-2xl bg-secondary p-4 text-sm text-muted-foreground"><strong className="text-foreground">Malipo ya moja kwa moja:</strong> bonyeza LIPA SASA, kisha thibitisha push kwenye simu yako. Mfumo utaangalia order status na account ita-activate moja kwa moja ikipatikana malipo yaliyofanikiwa.</div>
              {error && <p className="rounded-xl bg-destructive/10 p-3 text-sm font-semibold text-destructive">{error}</p>}
              {message && <p className="rounded-xl bg-success/10 p-3 text-sm font-semibold text-success">{message}</p>}
              <button type="submit" disabled={loading || !!orderId} className="flex w-full items-center justify-center gap-2 rounded-full gradient-success py-3.5 font-bold text-success-foreground shadow-cta disabled:opacity-60">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}{orderId ? "INASUBIRI UTHIBITISHO..." : "LIPA SASA"}</button>
              {orderId && <div className="rounded-2xl border border-border p-4 text-center"><Clock3 className="mx-auto h-7 w-7 animate-pulse text-primary" /><p className="mt-2 text-sm font-bold text-foreground">Subiri uthibitisho wa malipo</p><p className="mt-1 text-xs text-muted-foreground">Order: {orderId} · Status: {status}</p></div>}
            </form>
          ) : (
            <div className="mt-5 space-y-4">
              <div className="rounded-3xl gradient-blue p-5 text-center text-primary-foreground shadow-cta"><p className="text-xs font-bold uppercase tracking-widest opacity-80">LIPA NAMBA</p><div className="mt-1 text-3xl font-black tracking-wider">{LIPA_NUMBER}</div><p className="mt-1 text-sm font-semibold">{LIPA_BUSINESS}</p><button type="button" onClick={copyNumber} className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-bold"><Copy className="h-4 w-4" /> Copy</button></div>
              <div className="rounded-2xl bg-secondary p-4"><p className="font-extrabold text-foreground">Kiasi: TZS {ACTIVATION_FEE.toLocaleString()}</p><p className="mt-2 text-sm text-muted-foreground">Lipa kwa M-Pesa, Mixx by Yas, Airtel Money au HaloPesa kwa kutumia Lipa Namba hapo juu.</p></div>
              <div className="space-y-2">{[
                [`Vodacom M-Pesa`, `*150*00# → Lipa kwa M-PESA → Lipa kwa simu → weka ${LIPA_NUMBER} → ${ACTIVATION_FEE.toLocaleString()}`],
                [`Mixx by Yas`, `*150*01# → Lipa kwa simu → mitandao mingine → HaloPesa → ${LIPA_NUMBER} → ${ACTIVATION_FEE.toLocaleString()}`],
                [`Airtel Money`, `*150*60# → Lipia Bili → Lipa kwa simu → HaloPesa → kumbukumbu ${LIPA_NUMBER} → ${ACTIVATION_FEE.toLocaleString()}`],
                [`HaloPesa`, `*150*88# → Lipia Bidhaa → HaloPesa → ${LIPA_NUMBER} → ${ACTIVATION_FEE.toLocaleString()}`],
              ].map(([name, steps]) => <div key={name} className="rounded-2xl border border-border bg-card p-4"><p className="font-bold text-foreground">{name}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{steps}</p></div>)}</div>
              <form onSubmit={submitManual} className="space-y-3 rounded-2xl border border-border p-4"><label className="text-sm font-semibold text-foreground">Baada ya kulipa, weka namba uliyotumia</label><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712345678" className="w-full rounded-xl bg-secondary px-4 py-3 text-sm text-foreground outline-none" />{error && <p className="text-sm font-semibold text-destructive">{error}</p>}{message && <p className="text-sm font-semibold text-success">{message}</p>}<button type="submit" disabled={loading || manualSent} className="w-full rounded-full gradient-success py-3.5 font-bold text-success-foreground shadow-cta disabled:opacity-60">{manualSent ? "IMETUMWA KWA ADMIN" : loading ? "INATUMA..." : "NIMELIPIA"}</button></form>
              <div className="flex items-start gap-2 rounded-2xl bg-secondary p-4 text-xs text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" /> Admin atathibitisha muamala. Baada ya approval, utaweza kuingia Dashboard moja kwa moja.</div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
