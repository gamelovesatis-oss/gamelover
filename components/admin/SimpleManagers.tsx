"use client";

import { Download, Loader2, Phone, Send, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { deleteRow, sendBulletin, updateOfferStatus } from "@/app/admin/actions";
import { SocialIcon } from "@/components/SocialIcons";
import type { Offer, Subscriber } from "@/lib/types";
import { OFFER_KINDS, cn, tl, trDate } from "@/lib/utils";

const OFFER_STATUS: Record<string, { label: string; color: string }> = {
  yeni: { label: "Yeni", color: "bg-neon-cyan/20 text-neon-cyan" },
  gorusuldu: { label: "Görüşüldü", color: "bg-neon-amber/20 text-neon-amber" },
  anlasildi: { label: "Anlaşıldı", color: "bg-neon-lime/20 text-neon-lime" },
  kapandi: { label: "Kapandı", color: "bg-white/10 text-slate-400" },
};

export function OffersManager({ offers }: { offers: Offer[] }) {
  const [pending, start] = useTransition();
  const [filter, setFilter] = useState("hepsi");
  const list = offers.filter((o) => filter === "hepsi" || o.status === filter);
  return (
    <div>
      <h1 className="mb-6 font-display text-3xl font-bold text-white">Teklif Talepleri</h1>
      <div className="mb-6 flex flex-wrap gap-2">
        {["hepsi", ...Object.keys(OFFER_STATUS)].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={cn("rounded-xl px-4 py-2 text-sm", filter === s ? "bg-white text-ink-950" : "glass text-slate-300")}>
            {s === "hepsi" ? "Tümü" : OFFER_STATUS[s].label}
          </button>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {list.map((o) => (
          <div key={o.id} className="glass flex flex-col gap-3 rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="chip bg-neon-violet/20 text-violet-300">{OFFER_KINDS[o.kind] ?? o.kind}</span>
                <h3 className="mt-2 font-semibold text-white">{o.name}</h3>
                <p className="text-xs text-slate-500">{trDate(o.created_at)}</p>
              </div>
              {o.budget && <div className="font-display text-lg font-bold text-neon-lime">{tl(Number(o.budget))}</div>}
            </div>
            <p className="whitespace-pre-line rounded-xl bg-white/[0.03] p-3 text-sm text-slate-300">{o.message}</p>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {o.phone && (
                <>
                  <a href={`tel:${o.phone}`} className="btn-ghost px-3 py-1.5">
                    <Phone className="h-3.5 w-3.5" /> {o.phone}
                  </a>
                  <a href={`https://wa.me/${o.phone.replace(/\D/g, "").replace(/^0/, "90")}`} target="_blank" rel="noopener noreferrer" className="btn bg-green-600 px-3 py-1.5 text-white">
                    <SocialIcon name="whatsapp" className="h-3.5 w-3.5" />
                  </a>
                </>
              )}
              {o.email && (
                <a href={`mailto:${o.email}`} className="text-neon-cyan">
                  {o.email}
                </a>
              )}
            </div>
            <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
              {Object.entries(OFFER_STATUS).map(([k, v]) => (
                <button
                  key={k}
                  disabled={pending}
                  onClick={() => start(async () => void (await updateOfferStatus(o.id, k)))}
                  className={cn("rounded-lg px-2.5 py-1 text-xs font-semibold", o.status === k ? `${v.color} ring-1 ring-current` : "bg-white/5 text-slate-400 hover:bg-white/10")}
                >
                  {v.label}
                </button>
              ))}
              <button
                onClick={() => confirm("Talep silinsin mi?") && start(async () => void (await deleteRow("offers", o.id)))}
                className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-red-500/20 hover:text-red-300"
                aria-label="Sil"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {list.length === 0 && <div className="glass rounded-2xl p-10 text-center text-slate-400 lg:col-span-2">Talep yok.</div>}
      </div>
    </div>
  );
}

export function SubscribersManager({ subscribers, emailReady }: { subscribers: Subscriber[]; emailReady: boolean }) {
  const [pending, start] = useTransition();
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const active = subscribers.filter((s) => s.active);

  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!confirm(`Bülten ${active.length} aboneye gönderilecek. Emin misin?`)) return;
    setSending(true);
    const r = await sendBulletin(new FormData(e.currentTarget));
    setResult({ ok: r.ok, text: r.ok ? r.message! : r.error! });
    setSending(false);
  }

  function exportCsv() {
    const csv = "﻿E-posta;Ad;Durum;Kayıt\n" + subscribers.map((s) => `${s.email};${s.name ?? ""};${s.active ? "Aktif" : "Çıktı"};${new Date(s.created_at).toLocaleDateString("tr-TR")}`).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = "aboneler.csv";
    a.click();
  }

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl font-bold text-white">Bülten & Aboneler</h1>

      <form onSubmit={send} className="neon-border space-y-4 rounded-3xl bg-ink-900/80 p-6">
        <div>
          <h2 className="font-display text-xl font-bold text-white">Fırsat bülteni gönder</h2>
          <p className="text-sm text-slate-400">
            Öne çıkan kampanyalar, vitrin ürünleri ve yaklaşan etkinlikler otomatik olarak şık bir e-postaya dönüştürülür. Ayrıca her pazartesi 10:00&apos;da otomatik gönderilir ve sana haftalık rapor gelir.
          </p>
        </div>
        {!emailReady && (
          <p className="rounded-xl bg-neon-amber/10 px-4 py-2 text-sm text-amber-200">
            E-posta gönderimi için <code>SMTP_USER</code> ve <code>SMTP_PASS</code> (Gmail uygulama şifresi) tanımlayın (README).
          </p>
        )}
        <input name="subject" className="input" placeholder="Konu (boşsa: Çorum'un bu haftaki en büyük oyun fırsatları)" />
        <textarea name="intro" rows={3} className="input" placeholder="Giriş mesajı (ops.) — ör. Bu hafta sonu mağazada PS5 turnuvası var, herkesi bekliyoruz!" />
        <div className="flex items-center gap-4">
          <button className="btn-primary" disabled={sending || !emailReady || active.length === 0}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {active.length} aboneye gönder
          </button>
          {result && <span className={result.ok ? "text-sm text-neon-lime" : "text-sm text-red-400"}>{result.text}</span>}
        </div>
      </form>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-white">
            Aboneler <span className="text-slate-500">({active.length} aktif / {subscribers.length})</span>
          </h2>
          <button onClick={exportCsv} className="btn-ghost">
            <Download className="h-4 w-4" /> CSV
          </button>
        </div>
        <div className="glass divide-y divide-white/5 rounded-2xl">
          {subscribers.map((s) => (
            <div key={s.id} className={cn("flex items-center gap-4 px-4 py-3 text-sm", !s.active && "opacity-40")}>
              <span className="flex-1 truncate text-slate-200">{s.email}</span>
              <span className="hidden text-slate-500 sm:block">{s.name}</span>
              <span className="text-xs text-slate-500">{new Date(s.created_at).toLocaleDateString("tr-TR")}</span>
              <button
                onClick={() => confirm("Abone silinsin mi?") && start(async () => void (await deleteRow("subscribers", s.id)))}
                disabled={pending}
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-red-500/20 hover:text-red-300"
                aria-label="Sil"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {subscribers.length === 0 && <p className="p-8 text-center text-slate-400">Henüz abone yok.</p>}
        </div>
      </div>
    </div>
  );
}
