import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { chatters, fmt, loadAccount, saveAccount, type Account } from "@/lib/data";

export const Route = createFileRoute("/chat/$slug")({
  head: ({ params }) => ({
    links: [{ rel: "canonical", href: `https://www.dollaway.site/chat/${encodeURIComponent(params.slug)}` }],
    meta: [
      { title: "Anza Chat | DolaWay" },
      { name: "description", content: "Anza mazungumzo na mgeni na ulipwe kwa muda wako kwenye DolaWay." },
      { property: "og:title", content: "Anza Chat | DolaWay" },
      { property: "og:description", content: "Anza mazungumzo na mgeni na ulipwe kwa muda wako." },
    ],
  }),
  component: ChatPage,
});

type Msg = { from: "them" | "me"; text: string };

function ChatPage() {
  const { slug } = useParams({ from: "/chat/$slug" });
  const navigate = useNavigate();
  const person = chatters.find((c) => c.slug.toLowerCase() === slug.toLowerCase());
  const [account, setAccount] = useState<Account | null>(null);

  useEffect(() => {
    setAccount(loadAccount());
  }, []);

  if (!person) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <p className="p-8 text-center text-muted-foreground">Mtumiaji hakupatikana.</p>
      </div>
    );
  }

  const unlocked = account?.activated ?? false;

  return (
    <div className="min-h-screen bg-background pb-10">
      <SiteHeader />

      <div className="flex items-center gap-3 border-b border-primary/30 bg-card px-3 py-3">
        <Link to="/" aria-label="Rudi nyuma" className="px-1 text-xl text-foreground">
          ←
        </Link>
        <img src={person.avatar} alt={person.name} className="size-12 rounded-full border-2 border-primary object-cover" />
        <div>
          <h1 className="text-[20px] font-bold text-foreground">
            {person.name} {person.emoji}
          </h1>
          <p className="text-[13px] font-semibold text-online">● online</p>
        </div>
      </div>

      <main className="mx-auto max-w-lg px-3 py-4">
        {unlocked ? (
          <LiveChat
            person={person}
            account={account!}
            onFinish={(updated) => {
              saveAccount(updated);
              navigate({ to: "/dashboard" });
            }}
          />
        ) : (
          <section className="card-soft px-4 py-6 text-center">
            <img
              src={person.avatar}
              alt={person.name}
              className="mx-auto size-28 rounded-full border-4 border-primary object-cover"
            />
            <h2 className="mt-4 text-[22px] font-semibold text-foreground">
              {person.name} {person.emoji}
            </h2>
            <span className="mt-2 inline-block rounded-full bg-muted px-4 py-1.5 text-[15px] text-foreground">
              📍 Malipo
            </span>

            <div className="mt-5 rounded-xl bg-muted/70 px-4 py-5">
              <p className="text-[15px] text-foreground">📍 Unapata kwa kuchat na {person.name}</p>
              <p className="mt-2 text-[30px] font-bold text-primary">TZS {fmt(person.tzs)}</p>
              <p className="mt-1 text-[15px] text-muted-foreground">Muda: {person.minutes} dakika</p>
            </div>

            <p className="mt-5 text-[15px] text-muted-foreground">
              {person.name} anataka: <strong className="text-foreground">{person.wants}</strong>
              <br />
              Ukichat naye kwa muda uliopangwa, utalipwa kiasi hicho.
            </p>

            <Link
              to="/register"
              search={{ chat: person.slug }}
              className="mt-5 block rounded-xl bg-primary py-3.5 text-[17px] font-bold text-primary-foreground shadow-lg shadow-primary/30"
            >
              📝 Jisajili Ili Kuendelea
            </Link>
            <Link
              to="/"
              className="mt-3 block rounded-xl border border-border bg-card py-3.5 text-[17px] font-semibold text-foreground"
            >
              🔙 Rudi Nyumbani
            </Link>
            <p className="mt-4 text-[13px] italic text-muted-foreground">
              * Unahitaji kujisajili ili kuendelea na mazungumzo
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

function LiveChat({
  person,
  account,
  onFinish,
}: {
  person: (typeof chatters)[number];
  account: Account;
  onFinish: (a: Account) => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([
    { from: "them", text: `Habari! Mimi ni ${person.name}. Tuanze kuzungumzia ${person.wants}?` },
  ]);
  const [input, setInput] = useState("");
  const [seconds, setSeconds] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const replies = [
    "Asante sana, hii inanisaidia kujifunza!",
    "Nieleze zaidi tafadhali 😊",
    "Umeeleza vizuri sana, endelea.",
    "Hii ni nzuri! Neno hilo linamaanisha nini?",
  ];

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setMessages((m) => [...m, { from: "me", text }]);
    setInput("");
    setTimeout(() => {
      setMessages((m) => [...m, { from: "them", text: replies[m.length % replies.length]! }]);
    }, 900);
  };

  const done = messages.filter((m) => m.from === "me").length >= 3;

  return (
    <section className="card-soft flex flex-col overflow-hidden">
      <div className="flex items-center justify-between bg-success-soft px-4 py-2 text-[13px] font-semibold text-success">
        <span>Muda: {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</span>
        <span>Malipo: TZS {fmt(person.tzs)}</span>
      </div>

      <div className="flex max-h-[55vh] min-h-[45vh] flex-col gap-2 overflow-y-auto p-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.from === "me"
                ? "ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-[14px] text-primary-foreground"
                : "mr-auto max-w-[80%] rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-[14px] text-foreground"
            }
          >
            {m.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="flex gap-2 border-t border-border p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Andika ujumbe..."
          className="flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-[14px] outline-none focus:border-primary"
        />
        <button onClick={send} className="rounded-full bg-primary px-4 py-2.5 text-[14px] font-bold text-primary-foreground">
          Tuma
        </button>
      </div>

      <button
        disabled={!done}
        onClick={() =>
          onFinish({
            ...account,
            balance: account.balance + person.tzs,
            completed: [...account.completed, person.slug],
          })
        }
        className="m-3 rounded-xl bg-success py-3.5 text-[16px] font-bold text-success-foreground disabled:opacity-50"
      >
        {done ? `Maliza Chat & Pokea TZS ${fmt(person.tzs)}` : "Tuma angalau ujumbe 3 ili kumaliza"}
      </button>
    </section>
  );
}
