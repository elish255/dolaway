import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { loadAccount } from "@/lib/data";

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

type Operator = {
  id: string;
  name: string;
  ussd: string;
  logo: string;
  steps: string[];
  highlightStep: number;
  highlightLabel: string;
};

const operators: Operator[] = [
  {
    id: "voda",
    name: "Vodacom M-Pesa",
    ussd: "*150*00#",
    logo: "https://brandlogos.net/wp-content/uploads/2025/04/vodacom-logo_brandlogos.net_4uzfe.png",
    steps: [
      "Bonyeza *150*00#",
      "Chagua Lipa kwa M-PESA",
      "Chagua LIPA KWA SIMU HALOPESA",
      "Weka LIPA NAMBA",
      `Weka kiasi ${PAYMENT_AMOUNT.toLocaleString()} TZS`,
      "Weka namba ya siri",
    ],
    highlightStep: 4,
    highlightLabel: "LIPA NAMBA",
  },
  {
    id: "mixx",
    name: "Mixx by Yas",
    ussd: "*150*01#",
    logo: "https://www.uminolan.co.tz/assets/images/supa-agent/mixx-by-yas-seeklogo2.png",
    steps: [
      "Bonyeza *150*01#",
      "Chagua Lipa kwa simu",
      "Chagua Kwenda mitandao mingine",
      "Chagua HALOPESA",
      "Weka LIPA NAMBA",
      `Weka kiasi ${PAYMENT_AMOUNT.toLocaleString()} TZS`,
      "Weka namba ya siri",
    ],
    highlightStep: 5,
    highlightLabel: "LIPA NAMBA",
  },
  {
    id: "airtel",
    name: "Airtel Money",
    ussd: "*150*60#",
    logo: "https://nikulipe.com/wp-content/uploads/2022/09/Airtel_logo_PNG1.png",
    steps: [
      "Bonyeza *150*60#",
      "Chagua Lipia Bili",
      "Chagua LIPA KWA SIMU (MITANDAO YOTE)",
      "Chagua LIPA KWA HALOPESA",
      `Weka kiasi ${PAYMENT_AMOUNT.toLocaleString()} TZS`,
      "Ingiza kumbukumbu ya malipo",
      "Ingiza namba ya siri kuruhusu muamala",
    ],
    highlightStep: 6,
    highlightLabel: "KUMBUKUMBU YA MALIPO",
  },
  {
    id: "halo",
    name: "Halopesa",
    ussd: "*150*88#",
    logo: "https://halopesa.co.tz/images/applications-system.png",
    steps: [
      "Bonyeza *150*88#",
      "Chagua namba (5) Lipia Bidhaa",
      "Chagua HALOPESA",
      "Weka namba ya malipo",
      `Weka kiasi ${PAYMENT_AMOUNT.toLocaleString()} TZS`,
      "Ingiza namba ya siri",
      "Bonyeza 1 kuruhusu muamala",
    ],
    highlightStep: 4,
    highlightLabel: "NAMBA YA MALIPO",
  },
];

function PaymentPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [openOperator, setOpenOperator] = useState<string | null>(null);
  const [showRetryPopup, setShowRetryPopup] = useState(false);

  useEffect(() => {
    const account = loadAccount();

    if (!account.username) {
      navigate({ to: "/register" });
      return;
    }

    // Never automatically unlock the dashboard from this page.
    // Payment confirmation must happen through a real verification flow.
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
    setShowRetryPopup(true);
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

      <main className="mx-auto max-w-xl px-4 pb-16 pt-5">
        <div className="mb-4 flex gap-3 rounded-2xl border-[1.5px] border-k-red-300 bg-k-red-50 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-k-red-100 text-k-red-600">
            🛡
          </div>
          <div>
            <h2 className="text-xs font-bold tracking-widest text-k-red-600">LINDA PESA YAKO</h2>
            <p className="mt-1 text-sm leading-relaxed text-k-red-900">
              Lipia kupitia mtandao wako wa simu. Malipo nje ya mfumo huu ni batili na hayatahakikishwa.
            </p>
          </div>
        </div>

        <div className="mb-3 flex">
          <span className="flex items-center gap-2 rounded-full bg-k-green-800 px-4 py-2 text-[13px] text-white">
            🇹🇿 Tanzania
          </span>
        </div>

        <div className="mb-4 rounded-2xl border-[1.5px] border-k-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-k-green-50">💳</div>
            <div>
              <p className="text-sm font-semibold text-k-slate-800">Tanzania</p>
              <p className="text-xs text-k-slate-500">Lipa kwa Lipa Namba</p>
            </div>
          </div>

          <div className="mb-3 flex items-center justify-between rounded-xl bg-k-green-50 px-4 py-3">
            <span className="text-sm text-k-green-700">Kiasi cha kulipa</span>
            <strong className="text-lg text-k-green-900">{PAYMENT_AMOUNT.toLocaleString()} TZS</strong>
          </div>

          <button type="button" onClick={copyLipaNumber} className="k-btn-green">
            🔒 LIPA NAMBA {LIPA_NUMBER} {copied ? "✓" : ""}
          </button>
        </div>

        <section className="overflow-hidden rounded-3xl border-[1.5px] border-k-slate-200 bg-white">
          <div className="px-4 pb-2 pt-5">
            <h3 className="text-lg font-bold text-k-green-900">Lipa namba hizi</h3>
            <p className="text-xs text-k-slate-500">Chagua mtandao wako</p>
          </div>

          <div className="px-3 pb-3">
            {operators.map((operator) => {
              const isOpen = openOperator === operator.id;

              return (
                <div key={operator.id} className="border-b border-k-slate-100 last:border-b-0">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenOperator(isOpen ? null : operator.id)}
                    className="flex w-full items-center gap-3 px-2 py-4 text-left"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-k-slate-100 bg-white p-2">
                      <img src={operator.logo} alt={operator.name} className="max-h-full max-w-full object-contain" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-k-slate-800">{operator.name}</div>
                      <div className="text-xs text-k-slate-500">{operator.ussd}</div>
                    </div>
                    <svg
                      className={`h-5 w-5 shrink-0 text-k-slate-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isOpen && (
                    <div className="mb-3 rounded-2xl bg-k-slate-50 px-3 py-3">
                      <ol className="space-y-2">
                        {operator.steps.map((step, index) => {
                          const stepNumber = index + 1;
                          const highlighted = stepNumber === operator.highlightStep;
                          const isAmount = step.includes("15,000");

                          return (
                            <li
                              key={`${operator.id}-${stepNumber}`}
                              className={`flex items-start gap-3 rounded-xl px-2 py-2 text-sm ${highlighted ? "bg-k-green-50" : ""}`}
                            >
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-k-green-800 text-xs font-bold text-white">
                                {stepNumber}
                              </span>
                              <span className="flex-1 leading-relaxed text-k-slate-700">
                                {highlighted ? (
                                  <>
                                    <span>{operator.highlightLabel}: </span>
                                    <strong className="text-k-green-900">{LIPA_NUMBER}</strong>
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        copyLipaNumber();
                                      }}
                                      className="ml-2 rounded-lg bg-white px-2 py-1 text-[10px] font-bold text-k-green-800 shadow-sm"
                                    >
                                      Copy
                                    </button>
                                  </>
                                ) : isAmount ? (
                                  <>Weka kiasi <strong>{PAYMENT_AMOUNT.toLocaleString()} TZS</strong></>
                                ) : (
                                  step
                                )}
                              </span>
                            </li>
                          );
                        })}
                      </ol>

                      <div className="mt-3 rounded-xl bg-white px-3 py-2 text-xs text-k-slate-600">
                        Jina la Biashara: <strong className="text-k-green-900">{BUSINESS_NAME}</strong>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="border-t border-k-slate-100 px-5 py-5">
            <button type="button" onClick={completePayment} className="k-btn-green hover:opacity-90">
              ✓ NIMEKAMILISHA MALIPO
            </button>
            <p className="mt-3 text-center text-xs leading-relaxed text-k-slate-500">
              Baada ya kufanya malipo, gusa kitufe hapo juu. Mfumo utakuthibitishia malipo kabla ya kuendelea.
            </p>
          </div>
        </section>
      </main>

      {showRetryPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-5 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowRetryPopup(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-k-amber-100 text-3xl">⚠️</div>
            <h2 className="mt-4 text-xl font-extrabold text-k-slate-900">Fanya malipo Kisha Jaribu tena!</h2>
            <p className="mt-2 text-sm leading-relaxed text-k-slate-500">
              Tafadhali kamilisha malipo ya <strong>{PAYMENT_AMOUNT.toLocaleString()} TZS</strong> kwa LIPA NAMBA <strong>{LIPA_NUMBER}</strong>, kisha bonyeza kitufe tena.
            </p>
            <button
              type="button"
              onClick={() => setShowRetryPopup(false)}
              className="mt-5 w-full rounded-xl bg-k-green-800 px-4 py-3 font-bold text-white"
            >
              Sawa, Nimeelewa
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
