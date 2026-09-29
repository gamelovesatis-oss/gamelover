"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Gamepad2, Loader2, Lock } from "lucide-react";
import { useState } from "react";
import { isSupabaseConfigured } from "@/lib/env";
import { browserClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email"));
    const supabase = browserClient();
    if (mode === "magic") {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/admin/auth/callback`, shouldCreateUser: false },
      });
      setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Giriş bağlantısı e-postana gönderildi." });
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password: String(f.get("password")) });
      if (error) setMsg({ ok: false, text: "E-posta veya şifre hatalı." });
      else {
        router.replace("/admin");
        router.refresh();
      }
    }
    setLoading(false);
  }

  return (
    <div className="grid min-h-screen place-items-center bg-ink-950 p-4">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 animate-blob rounded-full bg-neon-violet/20 blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 animate-blob rounded-full bg-neon-cyan/15 blur-[100px] [animation-delay:-8s]" />
      </div>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="neon-border relative w-full max-w-md rounded-3xl bg-ink-900/90 p-8 backdrop-blur">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-neon-violet to-neon-cyan shadow-[0_0_30px_rgba(139,92,246,0.6)]">
            <Gamepad2 className="h-7 w-7 text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold text-white">Yönetim Paneli</h1>
          <p className="text-sm text-slate-400">Game Lover Çorum</p>
        </div>

        {!isSupabaseConfigured ? (
          <div className="rounded-xl border border-neon-amber/30 bg-neon-amber/10 p-4 text-sm text-amber-200">
            Supabase henüz bağlanmadı. <code>.env.local</code> dosyasına <code>NEXT_PUBLIC_SUPABASE_URL</code> ve <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> ekleyin (README&apos;ye bakın).
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">E-posta</label>
              <input name="email" type="email" required className="input" autoComplete="email" />
            </div>
            {mode === "password" && (
              <div>
                <label className="label">Şifre</label>
                <input name="password" type="password" required className="input" autoComplete="current-password" />
              </div>
            )}
            {msg && <p className={msg.ok ? "text-sm text-neon-lime" : "text-sm text-red-400"}>{msg.text}</p>}
            <button className="btn-primary w-full py-3.5" disabled={loading}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Lock className="h-4 w-4" /> {mode === "password" ? "Giriş yap" : "Bağlantı gönder"}</>}
            </button>
            <button type="button" onClick={() => setMode(mode === "password" ? "magic" : "password")} className="w-full text-center text-xs text-slate-400 hover:text-white">
              {mode === "password" ? "Şifresiz, e-posta bağlantısı ile gir" : "Şifre ile gir"}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
