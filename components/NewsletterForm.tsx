"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, Mail } from "lucide-react";
import { useState } from "react";

export function NewsletterForm({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    const res = await fetch("/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (res?.ok) {
      setState("done");
      setMsg(data?.message ?? "Aramıza hoş geldin!");
    } else {
      setState("error");
      setMsg(data?.error ?? "Bir hata oluştu, tekrar dene.");
    }
  }

  return (
    <form onSubmit={submit} className="w-full">
      <AnimatePresence mode="wait">
        {state === "done" ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3 rounded-xl border border-neon-lime/30 bg-neon-lime/10 px-4 py-3 text-sm text-neon-lime"
          >
            <Check className="h-5 w-5" /> {msg}
          </motion.div>
        ) : (
          <motion.div key="form" className={compact ? "flex gap-2" : "flex flex-col gap-3 sm:flex-row"}>
            <div className="relative flex-1">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-posta adresin"
                className="input pl-11"
                aria-label="E-posta adresi"
              />
            </div>
            <button className="btn-primary whitespace-nowrap" disabled={state === "loading"}>
              {state === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Fırsatları Kap"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      {state === "error" && <p className="mt-2 text-sm text-red-400">{msg}</p>}
    </form>
  );
}
