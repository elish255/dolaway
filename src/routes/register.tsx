import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { countries, loadAccount, saveAccount, usernameTaken } from "@/lib/data";

type Search = { chat?: string | undefined };

export const Route = createFileRoute("/register")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    chat: typeof search["chat"] === "string" ? search["chat"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Jisajili | DolaWay" },
      {
        name: "description",
        content: "Fungua akaunti ya DolaWay, hifadhi taarifa zako na endelea moja kwa moja kwenye malipo.",
      },
      { property: "og:title", content: "Jisajili | DolaWay" },
      { property: "og:description", content: "Fungua akaunti ya DolaWay na lipia activation ili kuanza kuchat na kulipwa." },
    ],
  }),
  component: RegistrationPage,
});

function RegistrationPage() {
  const { chat } = Route.useSearch();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    username: "",
    phone: "",
    email: "",
    country: "Tanzania",
    password: "",
    confirm: "",
  });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const account = loadAccount();
    if (account.username && !account.activated) {
      setForm({
        name: account.fullName,
        username: account.username,
        phone: account.phone,
        email: account.email,
        country: account.country || "Tanzania",
        password: account.password,
        confirm: account.password,
      });
    }
  }, []);

  const set = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.name.trim().length < 3) return setError("Weka jina lako kamili.");
    if (form.username.trim().length < 3) return setError("Weka username (angalau herufi 3).");
    if (!/^[a-zA-Z0-9_]+$/.test(form.username.trim())) {
      return setError("Username itumie herufi, namba au underscore pekee.");
    }
    if (usernameTaken(form.username) && loadAccount().username.trim().toLowerCase() !== form.username.trim().toLowerCase()) {
      return setError("Username hii tayari imetumika.");
    }
    if (!/^0[67]\d{8}$/.test(form.phone.trim())) {
      return setError("Namba ya simu si sahihi (mfano 0712345678).");
    }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return setError("Weka email sahihi.");
    }
    if (form.password.length < 4) return setError("Password iwe angalau herufi 4.");
    if (form.password !== form.confirm) return setError("Password hazifanani.");
    if (!form.country.trim()) return setError("Chagua nchi yako.");

    saveAccount({
      ...loadAccount(),
      fullName: form.name.trim(),
      username: form.username.trim(),
      password: form.password,
      phone: form.phone.trim(),
      email: form.email.trim(),
      country: form.country.trim(),
      activated: false,
    });

    navigate({
      to: "/payment",
      search: chat ? { chat } : {},
    });
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-3 py-5">
        <div className="card-soft overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            <aside className="hidden bg-brand-deep p-8 text-brand-foreground lg:col-span-5 lg:flex lg:flex-col">
              <p className="text-[11px] font-bold tracking-[0.25em] text-brand-foreground/70">DOLAWAY</p>
              <h1 className="mt-3 text-3xl font-black leading-tight">
                Connect, Learn, Earn.
              </h1>
              <p className="mt-4 text-sm leading-6 text-brand-foreground/75">
                Fungua akaunti yako, hifadhi taarifa zako kwenye simu yako, kisha lipia activation
                kwa Mobilipa ili kuanza kuchat na kulipwa.
              </p>
              <div className="mt-8 space-y-3 text-sm">
                {["Usajili wa haraka", "Taarifa zinahifadhiwa Local Storage", "Mobilipa USSD Push", "Dashboard baada ya malipo"].map(
                  (item) => (
                    <div key={item} className="flex items-center gap-3">
                      <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">✓</span>
                      <span>{item}</span>
                    </div>
                  ),
                )}
              </div>
              <p className="mt-auto pt-10 text-xs text-brand-foreground/50">© DolaWay</p>
            </aside>

            <section className="p-5 sm:p-8 lg:col-span-7">
              <div className="mb-6 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold tracking-[0.25em] text-muted-foreground">HATUA YA 1</p>
                  <h2 className="mt-1 text-2xl font-black text-foreground">Create Account</h2>
                </div>
                <span className="rounded-full bg-muted px-3 py-1.5 text-[11px] font-bold text-muted-foreground">
                  Jisajili
                </span>
              </div>

              {error && (
                <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
                  {error}
                </div>
              )}

              <form onSubmit={submit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Full Name">
                  <input
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-[15px] outline-none focus:border-primary"
                    placeholder="John Alex"
                    required
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                  />
                </Field>

                <Field label="Username">
                  <input
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-[15px] outline-none focus:border-primary"
                    placeholder="user_01"
                    required
                    maxLength={30}
                    value={form.username}
                    onChange={(e) => set("username", e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                  />
                </Field>

                <Field label="Phone Number">
                  <input
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-[15px] outline-none focus:border-primary"
                    placeholder="06XXXXXXXX"
                    inputMode="tel"
                    required
                    maxLength={10}
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                  />
                </Field>

                <Field label="Email Address">
                  <input
                    type="email"
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-[15px] outline-none focus:border-primary"
                    placeholder="name@mail.com"
                    required
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                  />
                </Field>

                <div className="md:col-span-2">
                  <Field label="Country">
                    <select
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-[15px] outline-none focus:border-primary"
                      value={form.country}
                      onChange={(e) => set("country", e.target.value)}
                    >
                      {countries.map((country) => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                <Field label="Password">
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-16 text-[15px] outline-none focus:border-primary"
                      placeholder="••••••••"
                      required
                      minLength={4}
                      value={form.password}
                      onChange={(e) => set("password", e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((value) => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground"
                    >
                      {showPass ? "Ficha" : "Onyesha"}
                    </button>
                  </div>
                </Field>

                <Field label="Confirm Password">
                  <input
                    type="password"
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-[15px] outline-none focus:border-primary"
                    placeholder="••••••••"
                    required
                    value={form.confirm}
                    onChange={(e) => set("confirm", e.target.value)}
                  />
                </Field>

                <div className="md:col-span-2">
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-primary py-3.5 text-[17px] font-bold text-primary-foreground shadow-lg shadow-primary/30"
                  >
                    CONTINUE TO PAYMENT
                  </button>
                  <p className="mt-4 text-center text-sm text-muted-foreground">
                    Tayari una akaunti?{" "}
                    <Link to="/signin" className="font-bold text-primary">Login</Link>
                  </p>
                </div>
              </form>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
