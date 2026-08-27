import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { chatters, fmt } from "@/lib/data";

export const Route = createFileRoute("/")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://www.dollaway.site/" }],
    meta: [
      { title: "DolaWay – Lipwa kwa Kuchat na Wageni" },
      {
        name: "description",
        content:
          "Chat na wageni kutoka duniani kote na upate hadi TZS 100,000 kwa siku. Jisajili, lipa activation, anza kuchat na kulipwa.",
      },
      { property: "og:title", content: "DolaWay – Lipwa kwa Kuchat na Wageni" },
      {
        property: "og:description",
        content: "Chat na wageni duniani kote na upate hadi TZS 100,000 kwa siku.",
      },
    ],
  }),
  component: Index,
});

const today = "August, 26";

function Index() {
  return (
    <div className="min-h-screen bg-background pb-16">
      <SiteHeader />

      <section className="bg-brand-deep px-4 py-5 text-center">
        <p className="text-[13px] font-bold text-brand-foreground">
          🌍 Foreigners are ready to pay for your time
        </p>
        <h1 className="mt-1 text-[22px] font-black leading-tight text-gold">
          make atleast TZS 50,000 up to TZS 100,000 per day
        </h1>
      </section>

      <main className="mx-auto max-w-lg space-y-4 px-3 py-4">
        {chatters.map((c) => (
          <article key={c.slug} className="card-soft p-4">
            <div className="flex items-start gap-3">
              <img
                src={c.avatar}
                alt={`Picha ya ${c.name}`}
                loading="lazy"
                className="size-12 rounded-full border-2 border-primary object-cover"
              />
              <div className="min-w-0 flex-1">
                <h2 className="text-[16px] font-bold text-foreground">
                  {c.name} {c.emoji}
                </h2>
                <p className="text-[12px] font-semibold text-online">● online</p>
                <p className="text-[12px] font-semibold text-foreground">★ {c.rating}</p>
              </div>
              <div className="text-right">
                <span className="inline-flex size-6 items-center justify-center rounded-full bg-muted text-[11px] text-muted-foreground">
                  ✓
                </span>
                <p className="mt-1 text-[11px] text-muted-foreground">{today}</p>
              </div>
            </div>

            <dl className="mt-3 space-y-1 text-[13px]">
              <div className="flex gap-1">
                <dt className="font-bold text-foreground">CHAT TIME :</dt>
                <dd className="text-muted-foreground">{c.minutes} minutes</dd>
              </div>
              <div className="flex gap-1">
                <dt className="font-bold text-foreground">WANTS :</dt>
                <dd className="text-muted-foreground">{c.wants}</dd>
              </div>
            </dl>

            <div className="mt-3 flex items-end justify-between border-t border-border pt-3">
              <Link
                to="/chat/$slug"
                params={{ slug: c.slug }}
                className="rounded-full bg-primary px-4 py-2.5 text-[13px] font-bold text-primary-foreground shadow-lg shadow-primary/30"
              >
                💬 START CHAT
              </Link>
              <div className="text-right">
                <span className="inline-block rounded-md bg-brand-deep px-3 py-1.5 text-[13px] font-black text-brand-foreground">
                  TZS {fmt(c.tzs)}
                </span>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Earn USD {(c.tzs / 2500).toFixed(2)}
                </p>
              </div>
            </div>
          </article>
        ))}
      </main>
    </div>
  );
}
