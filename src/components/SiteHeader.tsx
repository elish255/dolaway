import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMe } from "@/lib/app.functions";

export function SiteHeader() {
  const [live, setLive] = useState(195841);
  const [balance, setBalance] = useState(0);
  const me = useServerFn(getMe);
  useEffect(() => {
    const sync = () => { void me().then((r) => setBalance(Number(r.user?.balance ?? 0))).catch(() => setBalance(0)); };
    sync();
    const t = setInterval(() => setLive((v) => v + Math.floor(Math.random() * 40) + 3), 4000);
    return () => clearInterval(t);
  }, [me]);
  return <header className="sticky top-0 z-40 border-b-2 border-primary bg-brand-deep"><div className="mx-auto flex max-w-lg items-center gap-2 px-3 py-2.5"><Link to="/" aria-label="DolaWay home" className="shrink-0 rounded-md bg-white/95 px-1.5 py-1"><img src="/logo.png" alt="DolaWay" className="h-9 w-[88px] object-contain"/></Link><div className="flex items-center gap-1.5 rounded-full border border-primary/50 px-2.5 py-1.5"><span className="size-1.5 animate-pulse rounded-full bg-primary"/><span className="text-[11px] font-bold text-brand-foreground">{live.toLocaleString()} live</span></div><Link to="/dashboard" className="rounded-full bg-primary px-3 py-1.5 text-[12px] font-bold text-primary-foreground shadow-lg shadow-primary/30">💰 Withdraw</Link><div className="ml-auto rounded-lg border border-primary/40 bg-brand px-2.5 py-1 text-right"><div className="text-[7px] font-bold tracking-widest text-brand-foreground/70">CURRENT BALANCE</div><div className="text-[12px] font-black text-gold">TZS {balance.toLocaleString()}</div></div></div></header>;
}
