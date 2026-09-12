import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { loadAccount, saveAccount } from "@/lib/data";

export const Route = createFileRoute("/payment")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://www.dollaway.site/payment" }],
    meta: [
      { title: "Lipa — DolaWay" },
      {
        name: "description",
        content:
          "Lipia ada ya DolaWay kwa LIPA NAMBA. Tumia namba 251161660 na kiasi cha 15,000 TZS.",
      },
      { property: "og:title", content: "Lipa — DolaWay" },
      {
        property: "og:description",
        content: "Lipia kwa LIPA NAMBA 251161660 — 15,000 TZS.",
      },
    ],
  }),
  component: PaymentPage,
});

const LIPA_NUMBER = "251161660";
const PAYMENT_AMOUNT = 15000;
const BUSINESS_NAME = "ASSET BRIDGE";

function PaymentPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const account = loadAccount();

    if (!account.username) {
      navigate({ to: "/register" });
      return;
    }

    if (account.activated) {
      navigate({ to: "/dashboard" });
      return;
    }

    setReady(true);
  }, [navigate]);

  async function copyLipaNumber() {
    try {
      await navigator.clipboard.writeText(LIPA_NUMBER);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  function completePayment() {
    setError(null);
    const account = loadAccount();

    if (!account.username) {
      navigate({ to: "/register" });
      return;
    }

    saveAccount({ ...account, activated: true });
    navigate({ to: "/dashboard" });
  }

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-k-slate-50 font-jost text-k-slate-500">
        Inapakia...
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-k-slate-50 font-jost text-k-slate-800">
      <header className="flex items-center justify-between bg-k-green-900 px-6 py-4">
        <span className="text-lg font-extrabold tracking-tight text-white">
          DOLAWAY <span className="text-k-amber-400">SITE</span>
        </span>
        <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] tracking-wide text-k-green-100">
          MALIPO SALAMA
        </span>
      </header>

      <main className="mx-auto max-w-xl px-4 pb-16 pt-7">
        <div className="mb-6 flex gap-3 rounded-2xl border-[1.5px] border-k-red-300 bg-k-red-50 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-k-red-100 text-k-red-600">
            🛡
          </div>
          <div>
            <h2 className="text-xs font-bold tracking-widest text-k-red-600">
              LINDA PESA YAKO
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-k-red-900">
              Tumia LIPA NAMBA iliyoonyeshwa hapa chini pekee. Hakikisha jina
              la biashara ni <strong>{BUSINESS_NAME}</strong> kabla ya kuthibitisha malipo.
            </p>
          </div>
        </div>

        <div className="mb-5 flex gap-2">
          <span className="flex items-center gap-2 rounded-full border-[1.5px] border-k-green-800 bg-k-green-800 px-4 py-2 text-[13px] text-white">
            🇹🇿 Tanzania
          </span>
        </div>

        <div className="mb-5 rounded-2xl border-[1.5px] border-k-green-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold tracking-widest text-k-green-700">
                LIPA NAMBA
              </p>
              <p className="mt-1 text-2xl font-black tracking-wide text-k-green-900">
                {LIPA_NUMBER}
              </p>
            </div>
            <button
              type="button"
              onClick={copyLipaNumber}
              className="rounded-xl bg-k-green-100 px-4 py-2 text-xs font-bold text-k-green-900 hover:bg-k-green-200"
            >
              {copied ? "✓ Imekopiwa" : "Copy"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-k-green-50 px-4 py-3">
              <p className="text-xs text-k-slate-500">Kiasi cha kulipa</p>
              <p className="mt-1 text-lg font-black text-k-green-900">
                {PAYMENT_AMOUNT.toLocaleString()} TZS
              </p>
            </div>
            <div className="rounded-xl bg-k-green-50 px-4 py-3">
              <p className="text-xs text-k-slate-500">Jina la Biashara</p>
              <p className="mt-1 text-sm font-black text-k-green-900">
                {BUSINESS_NAME}
              </p>
            </div>
          </div>
        </div>

        <section className="overflow-hidden rounded-3xl border-[1.5px] border-k-slate-200 bg-white">
          <div className="flex items-center gap-3 border-b border-k-slate-100 px-5 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-k-green-50 text-k-green-700">
              💳
            </div>
            <div>
              <h3 className="font-semibold">Lipa kwa simu</h3>
              <p className="text-xs text-k-slate-500">Tumia LIPA NAMBA 251161660</p>
            </div>
          </div>

          <div className="px-5 py-5">
            <div className="mb-5 rounded-2xl bg-k-green-50 px-4 py-4">
              <p className="mb-3 text-sm font-bold text-k-green-900">
                Hatua za malipo
              </p>
              <ol className="space-y-3 text-sm text-k-slate-700">
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-k-green-800 text-xs font-bold text-white">1</span>
                  <span>Fungua huduma ya pesa kwenye simu yako.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-k-green-800 text-xs font-bold text-white">2</span>
                  <span>Chagua <strong>Lipa kwa Simu / Lipa Bill</strong>.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-k-green-800 text-xs font-bold text-white">3</span>
                  <span>Ingiza LIPA NAMBA <strong>{LIPA_NUMBER}</strong>.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-k-green-800 text-xs font-bold text-white">4</span>
                  <span>Ingiza kiasi cha <strong>{PAYMENT_AMOUNT.toLocaleString()} TZS</strong>.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-k-green-800 text-xs font-bold text-white">5</span>
                  <span>Hakikisha jina ni <strong>{BUSINESS_NAME}</strong>, kisha thibitisha kwa PIN yako.</span>
                </li>
              </ol>
            </div>

            <div className="mb-4 rounded-xl border border-k-amber-300 bg-k-amber-50 px-4 py-3 text-sm text-k-slate-700">
              <strong>Muhimu:</strong> Usithibitishe malipo kama jina la biashara
              halionyeshi <strong>{BUSINESS_NAME}</strong>.
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-k-red-300 bg-k-red-50 px-4 py-3 text-sm text-k-red-900">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={completePayment}
              className="k-btn-green hover:opacity-90"
            >
              ✓ NIMEKAMILISHA MALIPO
            </button>

            <p className="mt-3 text-center text-xs leading-relaxed text-k-slate-500">
              Baada ya kufanya malipo, gusa kitufe hapo juu ili kuendelea kwenye dashboard.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
