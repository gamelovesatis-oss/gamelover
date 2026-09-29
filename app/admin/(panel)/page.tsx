import Link from "next/link";
import { ArrowRight, Inbox, Mail, Package, ShoppingCart, TrendingUp } from "lucide-react";
import { serviceClient } from "@/lib/supabase/admin";
import type { Order } from "@/lib/types";
import { ORDER_STATUSES, cn, tl } from "@/lib/utils";

export default async function Dashboard() {
  const db = serviceClient();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const [orders, recent, offers, subs, lowStock] = await Promise.all([
    db.from("orders").select("total,status,created_at").gte("created_at", monthStart.toISOString()),
    db.from("orders").select("*").order("created_at", { ascending: false }).limit(8),
    db.from("offers").select("id", { count: "exact", head: true }).eq("status", "yeni"),
    db.from("subscribers").select("id", { count: "exact", head: true }).eq("active", true),
    db.from("products").select("id,name,stock").eq("active", true).lte("stock", 3).order("stock").limit(6),
  ]);

  const month = (orders.data ?? []).filter((o) => o.status !== "iptal");
  const revenue = month.reduce((s, o) => s + Number(o.total), 0);
  const pending = (orders.data ?? []).filter((o) => o.status === "yeni").length;

  // Son 14 günün sipariş grafiği
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return d.toISOString().slice(0, 10);
  });
  const perDay = days.map((d) => month.filter((o) => o.created_at.slice(0, 10) === d).reduce((s, o) => s + Number(o.total), 0));
  const max = Math.max(1, ...perDay);

  const stats = [
    { label: "Bu ay ciro", value: tl(revenue), Icon: TrendingUp, color: "text-neon-lime" },
    { label: "Bu ay sipariş", value: month.length, Icon: ShoppingCart, color: "text-neon-cyan" },
    { label: "Bekleyen sipariş", value: pending, Icon: Package, color: "text-neon-amber", href: "/admin/siparisler" },
    { label: "Yeni teklif", value: offers.count ?? 0, Icon: Inbox, color: "text-neon-pink", href: "/admin/teklifler" },
    { label: "Bülten abonesi", value: subs.count ?? 0, Icon: Mail, color: "text-violet-300", href: "/admin/aboneler" },
  ];

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl font-bold text-white">Genel Bakış</h1>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map(({ label, value, Icon, color, href }) => {
          const inner = (
            <div className="glass h-full rounded-2xl p-5 transition hover:border-white/20">
              <Icon className={cn("mb-3 h-5 w-5", color)} />
              <div className="font-display text-2xl font-bold text-white">{value}</div>
              <div className="text-xs uppercase tracking-wider text-slate-400">{label}</div>
            </div>
          );
          return href ? (
            <Link key={label} href={href}>
              {inner}
            </Link>
          ) : (
            <div key={label}>{inner}</div>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="glass rounded-2xl p-6">
          <h2 className="mb-6 font-semibold text-white">Son 14 gün ciro</h2>
          <div className="flex h-40 items-end gap-1.5">
            {perDay.map((v, i) => (
              <div key={days[i]} className="group relative flex-1">
                <div className="rounded-t-md bg-gradient-to-t from-neon-violet to-neon-cyan transition-all group-hover:opacity-80" style={{ height: `${Math.max(3, (v / max) * 150)}px` }} />
                <div className="pointer-events-none absolute -top-8 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink-700 px-2 py-1 text-xs text-white group-hover:block">
                  {days[i].slice(5)}: {tl(v)}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="glass rounded-2xl p-6">
          <h2 className="mb-4 font-semibold text-white">Azalan stok</h2>
          {(lowStock.data ?? []).length === 0 ? (
            <p className="text-sm text-slate-400">Tüm stoklar yeterli 👍</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {lowStock.data!.map((p) => (
                <li key={p.id} className="flex justify-between">
                  <span className="truncate text-slate-300">{p.name}</span>
                  <span className={p.stock === 0 ? "font-bold text-red-400" : "font-bold text-neon-amber"}>{p.stock}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-white">Son siparişler</h2>
          <Link href="/admin/siparisler" className="flex items-center gap-1 text-sm text-neon-cyan">
            Tümü <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="divide-y divide-white/5">
          {((recent.data ?? []) as Order[]).map((o) => (
            <Link key={o.id} href={`/admin/siparisler?q=${o.order_no}`} className="flex items-center gap-4 py-3 text-sm hover:bg-white/[0.02]">
              <span className="font-display font-bold text-white">#{o.order_no}</span>
              <span className="flex-1 truncate text-slate-300">{o.customer_name}</span>
              <span className={cn("chip", ORDER_STATUSES[o.status]?.color)}>{ORDER_STATUSES[o.status]?.label}</span>
              <span className="w-24 text-right font-semibold text-white">{tl(Number(o.total))}</span>
            </Link>
          ))}
          {(recent.data ?? []).length === 0 && <p className="py-6 text-center text-sm text-slate-400">Henüz sipariş yok.</p>}
        </div>
      </div>
    </div>
  );
}
