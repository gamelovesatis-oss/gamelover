"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Send } from "lucide-react";
import { useState } from "react";
import { OFFER_KINDS, cn } from "@/lib/utils";


export function OfferForm({ defaultKind, defaultMessage }: { defaultKind?: string; defaultMessage?: string }) {
  const [kind, setKind] = useState(defaultKind && OFFER_KINDS[defaultKind] ? defaultKind : "takas");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("loading");
    const f = Object.fromEntries(new FormData(e.currentTarget));
    const res = await fetch("/api/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, kind }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (res?.ok) setState("done");
    else {
      setErr(data?.error ?? "Gönderilemedi, tekrar dene.");
      setState("error");
    }
  }

  return (
    <div className="neon-border rounded-[2rem] bg-ink-900/80 p-6 backdrop-blur sm:p-8">
      <AnimatePresence mode="wait">
        {state === "done" ? (
          <motion.div key="ok" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-16 text-center">
            <div className="mb-4 text-6xl">🚀</div>
            <h3 className="font-display text-2xl font-bold text-white">Talebin bize ulaştı!</h3>
            <p className="mt-2 text-slate-400">En geç 24 saat içinde sana dönüş yapacağız.</p>
          </motion.div>
        ) : (
          <motion.form key="f" onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Talep türü</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(OFFER_KINDS).map(([k, v]) => (
                  <button
                    type="button"
                    key={k}
                    onClick={() => setKind(k)}
                    className={cn("rounded-xl border px-3 py-2 text-sm transition", kind === k ? "border-neon-cyan bg-neon-cyan/15 text-white" : "border-white/10 text-slate-400 hover:border-white/30")}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Ad Soyad *</label>
                <input name="name" required className="input" autoComplete="name" />
              </div>
              <div>
                <label className="label">Telefon *</label>
                <input name="phone" required type="tel" className="input" autoComplete="tel" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">E-posta</label>
                <input name="email" type="email" className="input" autoComplete="email" />
              </div>
              <div>
                <label className="label">Bütçe / beklenen fiyat (₺)</label>
                <input name="budget" type="number" min="0" className="input" />
              </div>
            </div>
            <div>
              <label className="label">Detaylar *</label>
              <textarea
                name="message"
                required
                rows={5}
                defaultValue={defaultMessage}
                className="input"
                placeholder="Cihaz modeli, durumu, aksesuarları, adet vb."
              />
            </div>
            {state === "error" && <p className="text-sm text-red-400">{err}</p>}
            <button className="btn-primary w-full py-4" disabled={state === "loading"}>
              {state === "loading" ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                <>
                  <Send className="h-4 w-4" /> Teklif İste
                </>
              )}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
