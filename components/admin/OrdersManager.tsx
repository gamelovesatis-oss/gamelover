"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Download, Loader2, Phone, Search } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { updateOrderStatus } from "@/app/admin/actions";
import { SocialIcon } from "@/components/SocialIcons";
import type { Order } from "@/lib/types";
import { DELIVERY, ORDER_STATUSES, PAYMENT, cn, tl, trDate } from "@/lib/utils";

export function OrdersManager({ orders, initialQuery }: { orders: Order[]; initialQuery: string }) {
  const [filter, setFilter] = useState("hepsi");
  const [q, setQ] = useState(initialQuery);
  const [open, setOpen] = useState<string | null>(null);
  const [notify, setNotify] = useState(true);
  const [pending, start] = useTransition();

  const list = useMemo(() => {
    const t = q.trim().toLocaleLowerCase("tr");
    return orders.filter(
      (o) =>
        (filter === "hepsi" || o.status === filter) &&
        (!t || `${o.order_no} ${o.customer_name} ${o.phone} ${o.email ?? ""}`.toLocaleLowerCase("tr").includes(t)),
    );
  }, [orders, filter, q]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { hepsi: orders.length };
    orders.forEach((o) => (c[o.status] = (c[o.status] ?? 0) + 1));
    return c;
  }, [orders]);

  function exportCsv() {
    const rows = [
      ["No", "Tarih", "Müşteri", "Telefon", "E-posta", "Teslimat", "Ödeme", "Adres", "Ürünler", "Kupon", "Toplam", "Durum"],
      ...list.map((o) => [
        o.order_no,
        new Date(o.created_at).toLocaleString("tr-TR"),
        o.customer_name,
        o.phone,
        o.email ?? "",
        DELIVERY[o.delivery],
        PAYMENT[o.payment],
        o.address ?? "",
        o.items.map((i) => `${i.name} x${i.qty}`).join(" | "),
        o.coupon ?? "",
        o.total,
        ORDER_STATUSES[o.status]?.label,
      ]),
    ];
    const csv = "﻿" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `siparisler-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-bold text-white">Siparişler</h1>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="No, isim, telefon…" className="input w-56 py-2.5 pl-9" />
          </div>
          <button onClick={exportCsv} className="btn-ghost">
            <Download className="h-4 w-4" /> Excel (CSV)
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {["hepsi", ...Object.keys(ORDER_STATUSES)].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn("rounded-xl px-4 py-2 text-sm font-medium transition", filter === s ? "bg-white text-ink-950" : "glass text-slate-300 hover:text-white")}
          >
            {s === "hepsi" ? "Tümü" : ORDER_STATUSES[s].label} <span className="opacity-60">({counts[s] ?? 0})</span>
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-sm text-slate-400">
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="accent-neon-cyan" />
          Durum değişince müşteriye e-posta at
        </label>
      </div>

      <div className="space-y-3">
        {list.map((o) => (
          <div key={o.id} className="glass overflow-hidden rounded-2xl">
            <button onClick={() => setOpen(open === o.id ? null : o.id)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 p-4 text-left">
              <span className="font-display text-lg font-bold text-white">#{o.order_no}</span>
              <span className="min-w-0 flex-1 truncate text-slate-200">{o.customer_name}</span>
              <span className="hidden text-sm text-slate-400 md:block">{trDate(o.created_at)}</span>
              <span className="text-sm text-slate-400">{DELIVERY[o.delivery]}</span>
              <span className={cn("chip", ORDER_STATUSES[o.status]?.color)}>{ORDER_STATUSES[o.status]?.label}</span>
              <span className="w-24 text-right font-display font-bold text-white">{tl(Number(o.total))}</span>
              <ChevronDown className={cn("h-4 w-4 text-slate-400 transition", open === o.id && "rotate-180")} />
            </button>
            <AnimatePresence>
              {open === o.id && (
                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                  <div className="grid gap-6 border-t border-white/10 p-5 md:grid-cols-2">
                    <div className="space-y-2 text-sm">
                      {o.items.map((i) => (
                        <div key={i.id} className="flex justify-between text-slate-300">
                          <span>
                            {i.name} <span className="text-slate-500">×{i.qty}</span>
                          </span>
                          <span>{tl(i.price * i.qty)}</span>
                        </div>
                      ))}
                      {Number(o.shipping) > 0 && (
                        <div className="flex justify-between text-slate-400">
                          <span>Teslimat</span>
                          <span>{tl(Number(o.shipping))}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-white/10 pt-2 font-bold text-white">
                        <span>Toplam</span>
                        <span>{tl(Number(o.total))}</span>
                      </div>
                      {o.coupon && (
                        <div className="rounded-lg bg-neon-pink/10 px-3 py-2 text-neon-pink">
                          Kupon: <b>{o.coupon}</b> — indirimi fiyata uygulamayı unutmayın.
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 text-sm text-slate-300">
                      <div className="flex flex-wrap gap-2">
                        <a href={`tel:${o.phone}`} className="btn-ghost px-3 py-2">
                          <Phone className="h-4 w-4" /> {o.phone}
                        </a>
                        <a href={`https://wa.me/${o.phone.replace(/\D/g, "").replace(/^0/, "90")}`} target="_blank" rel="noopener noreferrer" className="btn px-3 py-2 bg-green-600 text-white hover:bg-green-500">
                          <SocialIcon name="whatsapp" className="h-4 w-4" /> WhatsApp
                        </a>
                      </div>
                      {o.email && <div>✉️ {o.email}</div>}
                      <div>💳 {PAYMENT[o.payment]}</div>
                      {o.address && <div>📍 {o.address}</div>}
                      {o.note && <div>📝 {o.note}</div>}
                      <div className="pt-3">
                        <div className="label">Durumu değiştir</div>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(ORDER_STATUSES).map(([k, v]) => (
                            <button
                              key={k}
                              disabled={pending || o.status === k}
                              onClick={() => start(async () => void (await updateOrderStatus(o.id, k, notify)))}
                              className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-100", o.status === k ? `${v.color} ring-1 ring-current` : "bg-white/5 text-slate-300 hover:bg-white/10")}
                            >
                              {v.label}
                            </button>
                          ))}
                          {pending && <Loader2 className="h-4 w-4 animate-spin text-neon-cyan" />}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
        {list.length === 0 && <div className="glass rounded-2xl p-10 text-center text-slate-400">Sipariş bulunamadı.</div>}
      </div>
    </div>
  );
}
