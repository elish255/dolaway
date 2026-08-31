import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  checkPaymentStatus,
  createPaymentOrder,
  PAYMENT_AMOUNT,
} from "@/lib/mobilipa.functions";
import { loadAccount, saveAccount } from "@/lib/data";

export const Route = createFileRoute("/payment")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://www.dollaway.site/payment" }],
    meta: [
      { title: "Lipa — DolaWay" },
      {
        name: "description",
        content:
          "Lipia ada ya DolaWay kwa USSD Push. Weka namba yako ya simu na thibitisha malipo kwenye simu.",
      },
      {
        property: "og:title",
        content: "Lipa — DolaWay",
      },
      {
        property: "og:description",
        content:
          "Lipia kwa USSD Push moja kwa moja kwenye simu yako.",
      },
    ],
  }),
  component: PaymentPage,
});

type Phase = "form" | "waiting" | "failed";

function PaymentPage() {
  const navigate = useNavigate();

  const createOrder = useServerFn(createPaymentOrder);
  const pollStatus = useServerFn(checkPaymentStatus);

  const [ready, setReady] = useState(false);
  const [phone, setPhone] = useState("");
  const [phase, setPhase] = useState<Phase>("form");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

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

    setPhone(account.phone || "");
    setReady(true);

    return () => {
      if (timer.current) {
        clearInterval(timer.current);
      }
    };
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError(null);
    setMessage(null);
    setPhase("waiting");

    try {
      const account = loadAccount();

      const updated = {
        ...account,
        phone,
      };

      saveAccount(updated);

      const order = await createOrder({
        data: {
          name: updated.fullName,
          email: updated.email,
          phone,
        },
      });

      setMessage(order.message);

      let attempts = 0;

      timer.current = setInterval(async () => {
        attempts += 1;

        try {
          const res = await pollStatus({
            data: {
              orderId: order.order_id,
            },
          });

          if (
            ["COMPLETED", "SUCCESS", "SUCCESSFUL", "PAID"].includes(
              res.payment_status
            )
          ) {
            if (timer.current) {
              clearInterval(timer.current);
            }

            saveAccount({
              ...loadAccount(),
              phone,
              activated: true,
            });

            navigate({
              to: "/dashboard",
            });

            return;
          }

          if (
            [
              "CANCELLED",
              "USERCANCELLED",
              "REJECTED",
              "FAILED",
            ].includes(res.payment_status)
          ) {
            if (timer.current) {
              clearInterval(timer.current);
            }

            setPhase("failed");

            setError(
              "Malipo hayakukamilika. Tafadhali jaribu tena."
            );
          }
        } catch {
          // Endelea ku-check status
        }

        if (attempts >= 40) {
          if (timer.current) {
            clearInterval(timer.current);
          }

          setPhase("failed");

          setError(
            "Muda umeisha bila kupokea uthibitisho wa malipo. Jaribu tena."
          );
        }
      }, 4000);
    } catch (err) {
      setPhase("failed");

      setError(
        err instanceof Error
          ? err.message
          : "Imeshindikana kuanzisha malipo."
      );
    }
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
          DOLAWAY{" "}
          <span className="text-k-amber-400">
            SITE
          </span>
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
              Lipia kupitia mfumo huu pekee au namba ya dharura ya{" "}
              <strong>DolaWay</strong>.
              Malipo nje ya mfumo huu ni batili na hayatakubaliwa.
            </p>
          </div>
        </div>

        <div className="mb-5 flex gap-2">
          <span className="flex items-center gap-2 rounded-full border-[1.5px] border-k-green-800 bg-k-green-800 px-4 py-2 text-[13px] text-white">
            🇹🇿 Tanzania
          </span>
        </div>

        <section className="overflow-hidden rounded-3xl border-[1.5px] border-k-slate-200 bg-white">
          <div className="flex items-center gap-3 border-b border-k-slate-100 px-5 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-k-green-50 text-k-green-700">
              ⚡
            </div>

            <div>
              <h3 className="font-semibold">
                Tanzania
              </h3>

              <p className="text-xs text-k-slate-500">
                Lipia moja kwa moja kwa USSD Push
              </p>
            </div>
          </div>

          <div className="px-5 py-5">

            <div className="mb-4 flex items-center justify-between rounded-2xl bg-k-green-50 px-4 py-3">
              <span className="text-sm text-k-green-700">
                Kiasi cha kulipa
              </span>

              <span className="text-lg font-bold text-k-green-900">
                {PAYMENT_AMOUNT.toLocaleString()} TZS
              </span>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-k-red-300 bg-k-red-50 px-4 py-3 text-sm text-k-red-900">
                {error}
              </div>
            )}

            {phase === "waiting" ? (
              <div className="rounded-2xl border-[1.5px] border-k-slate-200 p-6 text-center">

                <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-k-green-100 border-t-k-green-700" />

                <p className="font-semibold text-k-green-900">
                  Subiri uthibitisho...
                </p>

                <p className="mt-1 text-sm text-k-slate-500">
                  {message ??
                    "Push USSD imetumwa kwenye simu yako."}{" "}
                  Ingiza namba yako ya siri kuthibitisha malipo.
                </p>

              </div>
            ) : (
              <form onSubmit={onSubmit}>

                <label
                  className="mb-1 block text-xs font-bold text-k-slate-500"
                  htmlFor="tz-phone"
                >
                  Namba ya simu
                </label>

                <div className="mb-4 flex items-center overflow-hidden rounded-xl border-[1.5px] border-k-slate-200 bg-k-slate-50">

                  <span className="border-r border-k-slate-200 px-3 py-3 text-sm text-k-slate-500">
                    🇹🇿 +255
                  </span>

                  <input
                    id="tz-phone"
                    type="tel"
                    required
                    maxLength={12}
                    placeholder="06XXXXXXXX"
                    value={phone}
                    onChange={(e) =>
                      setPhone(
                        e.target.value.replace(/\D/g, "")
                      )
                    }
                    className="w-full bg-transparent px-3 py-3 text-sm outline-none"
                  />

                </div>

                <button
                  type="submit"
                  className="k-btn-green hover:opacity-90"
                >
                  🔒 LIPA SASA
                </button>

              </form>
            )}

          </div>
        </section>

      </main>
    </div>
  );
}