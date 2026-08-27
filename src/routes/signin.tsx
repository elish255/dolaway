import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { signIn } from "@/lib/data";

export const Route = createFileRoute("/signin")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://www.dollaway.site/signin" }],
    meta: [
      { title: "Ingia | DolaWay" },
      { name: "description", content: "Ingia kwenye akaunti yako ya DolaWay kwa username na password ili kuendelea kuchat na kulipwa." },
      { property: "og:title", content: "Ingia | DolaWay" },
      { property: "og:description", content: "Ingia kwa username na password ili kuendelea kuchat na kulipwa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SignInPage,
});

function SignInPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const acc = signIn(username, password);
    if (!acc) return setError("Username au password si sahihi.");
    setError("");
    navigate({ to: acc.activated ? "/dashboard" : "/payment" });
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      <SiteHeader />

      <main className="mx-auto max-w-lg px-3 py-5">
        <div className="rounded-2xl bg-brand-deep px-4 py-5 text-center">
          <p className="text-[11px] font-bold tracking-[0.25em] text-brand-foreground/70">KARIBU TENA</p>
          <h1 className="mt-1 text-[22px] font-black text-gold">Ingia Kwenye Akaunti Yako</h1>
        </div>

        <form onSubmit={submit} className="card-soft mt-4 space-y-4 p-4">
          <div>
            <label htmlFor="su" className="text-[14px] font-semibold text-foreground">
              Username
            </label>
            <input
              id="su"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username yako"
              maxLength={30}
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-[15px] outline-none focus:border-primary"
            />
          </div>

          <div>
            <label htmlFor="sp" className="text-[14px] font-semibold text-foreground">
              Password
            </label>
            <input
              id="sp"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              maxLength={40}
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-[15px] outline-none focus:border-primary"
            />
          </div>

          {error && <p className="text-[13px] font-semibold text-destructive">{error}</p>}

          <button
            type="submit"
            className="w-full rounded-xl bg-primary py-3.5 text-[17px] font-bold text-primary-foreground shadow-lg shadow-primary/30"
          >
            SIGN IN
          </button>
          <Link to="/register" className="block text-center text-[14px] underline text-muted-foreground">
            Huna akaunti? Jisajili sasa
          </Link>
        </form>
      </main>
    </div>
  );
}
