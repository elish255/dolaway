import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { adminPayments, adminUsers, approvePayment, rejectPayment, adminWithdrawals, loadAccount, fmt, type Account } from "@/lib/data";

export const Route = createFileRoute("/admin")({ component: AdminPage });

type Payment = Record<string, unknown>;
type Withdrawal = Record<string, unknown>;

function AdminPage() {
  const navigate = useNavigate();
  const [me, setMe] = useState<Account | null>(null);
  const [users, setUsers] = useState<Payment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const refresh = async () => {
    try { setError(""); const [u,p,w] = await Promise.all([adminUsers(), adminPayments(), adminWithdrawals()]); setUsers(u); setPayments(p); setWithdrawals(w); }
    catch (e) { setError(e instanceof Error ? e.message : "Imeshindikana kupakia admin panel"); }
  };
  useEffect(() => { loadAccount().then((a) => { setMe(a); if (a.role !== "admin") navigate({to:"/dashboard"}); else void refresh(); }); }, [navigate]);

  const act = async (id: string, action: "approve" | "reject") => { setBusy(id); try { if (action === "approve") await approvePayment(id); else await rejectPayment(id); await refresh(); } catch(e) { setError(e instanceof Error ? e.message : "Action failed"); } finally { setBusy(""); } };

  if (!me || me.role !== "admin") return <main className="min-h-screen flex items-center justify-center">Inapakia...</main>;
  const pending = payments.filter((p) => p.status === "pending");
  return <div className="min-h-screen bg-background pb-16"><SiteHeader /><main className="mx-auto max-w-5xl px-3 py-6">
    <div className="mb-5 flex items-center justify-between"><div><h1 className="text-2xl font-black">Admin Panel</h1><p className="text-sm text-muted-foreground">Approve accounts, payments na withdrawals.</p></div><Link to="/dashboard" className="rounded-xl border px-4 py-2 text-sm font-bold">Dashboard</Link></div>
    {error && <div className="mb-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
    <section className="card-soft p-4"><h2 className="text-lg font-bold">Pending Activation Payments ({pending.length})</h2><div className="mt-3 space-y-3">{pending.map((p) => { const profile = p.profiles as Record<string,unknown> | null; return <div key={String(p.id)} className="flex flex-col gap-3 rounded-xl border p-3 md:flex-row md:items-center"><div className="flex-1"><b>{String(profile?.full_name ?? "User")}</b><p className="text-sm text-muted-foreground">@{String(profile?.username ?? "")} • {String(profile?.email ?? "")}</p><p className="text-sm font-bold">TZS {fmt(Number(p.amount))}</p></div><div className="flex gap-2"><button disabled={busy===String(p.id)} onClick={() => void act(String(p.id),"approve")} className="rounded-lg bg-success px-4 py-2 text-sm font-bold text-success-foreground">{busy===String(p.id)?"...":"Approve"}</button><button disabled={busy===String(p.id)} onClick={() => void act(String(p.id),"reject")} className="rounded-lg border px-4 py-2 text-sm font-bold">Reject</button></div></div>})}{pending.length===0&&<p className="py-5 text-sm text-muted-foreground">Hakuna payment inayosubiri.</p>}</div></section>
    <section className="mt-5 card-soft p-4"><h2 className="text-lg font-bold">Users ({users.length})</h2><div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-2">User</th><th className="p-2">Status</th><th className="p-2">Balance</th><th className="p-2">Phone</th></tr></thead><tbody>{users.map(u=><tr key={String(u.id)} className="border-b last:border-0"><td className="p-2"><b>{String(u.full_name)}</b><div className="text-xs text-muted-foreground">@{String(u.username)}</div></td><td className="p-2">{String(u.status)}</td><td className="p-2 font-bold">TZS {fmt(Number(u.balance))}</td><td className="p-2">{String(u.phone)}</td></tr>)}</tbody></table></div></section>
    <section className="mt-5 card-soft p-4"><h2 className="text-lg font-bold">Withdrawals ({withdrawals.length})</h2><div className="mt-3 space-y-2">{withdrawals.map(w=><div key={String(w.id)} className="flex justify-between rounded-xl border p-3 text-sm"><span>{String(w.phone)} • {String(w.status)}</span><b>TZS {fmt(Number(w.amount))}</b></div>)}</div></section>
  </main></div>;
}
