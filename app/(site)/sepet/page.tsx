"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/components/CartProvider";
import { SmartImage } from "@/components/ui";
import { DELIVERY, PAYMENT, cn, shippingFee, tl } from "@/lib/utils";

export default function CartPage() {
  const { items, total, setQty, remove, clear } = useCart();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [delivery, setDelivery] = useState("kurye");
  const [payment, setPayment] = useState("kapida");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_name: f.get("name"),
        phone: f.get("phone"),
        email: f.get("email"),
        address: f.get("address"),
        note: f.get("note"),
        coupon: f.get("coupon"),
        delivery,
        payment,
        items: items.map((i) => ({ id: i.id, qty: i.qty })),
        subscribe: f.get("subscribe") === "on",
      }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setLoading(false);
    if (!res?.ok) return setError(data?.error ?? "Sipariş oluşturulamadı. Lütfen tekrar deneyin.");
    clear();
    router.push(`/siparis-tamam?no=${data.order_no}`);
  }

  if (items.length === 0)
    return (
      <div className="container-x grid min-h-[60vh] place-items-center pt-10 text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
          <motion.div animate={{ rotate: [0, -10, 10, 0] }} transition={{ duration: 2, repeat: Infinity }} className="mx-auto mb-6 grid h-24 w-24 place-items-center rounded-3xl glass">
            <ShoppingBag className="h-10 w-10 text-neon-cyan" />
          </motion.div>
          <h1 className="font-display text-3xl font-bold text-white">Sepetin boş</h1>
          <p className="mt-2 text-slate-400">Hadi birkaç harika ürünle dolduralım!</p>
          <Link href="/urunler" className="btn-primary mt-8">
            Mağazaya git
          </Link>
        </motion.div>
      </div>
    );

  const shipping = shippingFee(delivery, total);

  return (
    <div className="container-x pt-10">
      <h1 className="mb-10 font-display text-4xl font-bold text-white">Sepetim</h1>
      <div className="grid gap-10 lg:grid-cols-[1fr_440px]">
        <div className="space-y-4">
          <AnimatePresence>
            {items.map((i) => (
              <motion.div key={i.id} layout exit={{ opacity: 0, x: -100 }} className="glass flex items-center gap-4 rounded-2xl p-4">
                <SmartImage src={i.image_url} alt={i.name} className="h-20 w-20 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold text-white">{i.name}</h3>
                  <div className="text-sm text-slate-400">{tl(i.price)}</div>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-white/5 p-1">
                  <button onClick={() => setQty(i.id, i.qty - 1)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/10" aria-label="Azalt">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-6 text-center font-semibold tabular-nums">{i.qty}</span>
                  <button onClick={() => setQty(i.id, i.qty + 1)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/10" aria-label="Arttır">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="hidden w-24 text-right font-display font-bold text-white sm:block">{tl(i.price * i.qty)}</div>
                <button onClick={() => remove(i.id)} className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-red-500/20 hover:text-red-300" aria-label="Kaldır">
                  <Trash2 className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <form onSubmit={submit} className="neon-border h-fit space-y-4 rounded-3xl bg-ink-900/80 p-6 backdrop-blur">
          <h2 className="font-display text-xl font-bold text-white">Siparişi Tamamla</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Ad Soyad *</label>
              <input name="name" required className="input" autoComplete="name" />
            </div>
            <div>
              <label className="label">Telefon *</label>
              <input name="phone" required type="tel" className="input" autoComplete="tel" placeholder="05xx xxx xx xx" />
            </div>
          </div>
          <div>
            <label className="label">E-posta</label>
            <input name="email" type="email" className="input" autoComplete="email" placeholder="Sipariş bilgilendirmesi için" />
          </div>

          <div>
            <label className="label">Teslimat</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(DELIVERY).map(([k, v]) => (
                <button type="button" key={k} onClick={() => setDelivery(k)} className={cn("rounded-xl border px-2 py-2.5 text-xs font-semibold transition", delivery === k ? "border-neon-cyan bg-neon-cyan/15 text-white" : "border-white/10 text-slate-400 hover:border-white/30")}>
                  {v}
                </button>
              ))}
            </div>
          </div>
          {delivery !== "magaza" && (
            <div>
              <label className="label">Adres *</label>
              <textarea name="address" required rows={2} className="input" autoComplete="street-address" />
            </div>
          )}
          <div>
            <label className="label">Ödeme</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(PAYMENT).map(([k, v]) => (
                <button type="button" key={k} onClick={() => setPayment(k)} className={cn("rounded-xl border px-2 py-2.5 text-xs font-semibold transition", payment === k ? "border-neon-violet bg-neon-violet/15 text-white" : "border-white/10 text-slate-400 hover:border-white/30")}>
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Kupon kodu</label>
              <input name="coupon" className="input uppercase" placeholder="ör. OYUNCU10" />
            </div>
            <div>
              <label className="label">Not</label>
              <input name="note" className="input" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-400">
            <input type="checkbox" name="subscribe" defaultChecked className="accent-neon-violet" /> Kampanyalardan e-posta ile haberdar olmak istiyorum
          </label>

          <div className="space-y-2 border-t border-white/10 pt-4 text-sm">
            <div className="flex justify-between text-slate-400">
              <span>Ara toplam</span>
              <span>{tl(total)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Teslimat</span>
              <span>{shipping ? tl(shipping) : "Ücretsiz"}</span>
            </div>
            <div className="flex justify-between font-display text-xl font-bold text-white">
              <span>Toplam</span>
              <span className="text-neon-cyan">{tl(total + shipping)}</span>
            </div>
            <p className="text-xs text-slate-500">Kupon indirimi siparişiniz onaylanırken uygulanır.</p>
          </div>
          {error && <p className="rounded-xl bg-red-500/10 px-4 py-2 text-sm text-red-300">{error}</p>}
          <button className="btn-primary w-full py-4 text-base" disabled={loading}>
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Siparişi Gönder"}
          </button>
        </form>
      </div>
    </div>
  );
}
