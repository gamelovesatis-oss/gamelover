"use client";

import { Loader2, Save, Zap } from "lucide-react";
import { useState } from "react";
import { saveSettings, testWebhook } from "@/app/admin/actions";
import { SocialIcon } from "@/components/SocialIcons";
import type { Settings } from "@/lib/types";

function F({ s, name, label, placeholder, type = "text" }: { s: Settings; name: keyof Settings; label: string; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input name={name} type={type} defaultValue={(s[name] as string | number | null) ?? ""} placeholder={placeholder} className="input" />
    </div>
  );
}

export function SettingsForm({ settings }: { settings: Settings }) {
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const r = await saveSettings(new FormData(e.currentTarget));
    setMsg({ ok: r.ok, text: r.ok ? r.message! : r.error! });
    setSaving(false);
  }


  return (
    <form onSubmit={submit} className="max-w-4xl space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-white">Ayarlar & Sosyal Medya</h1>
        <button className="btn-primary" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Kaydet
        </button>
      </div>
      {msg && <p className={msg.ok ? "rounded-xl bg-neon-lime/10 px-4 py-2 text-neon-lime" : "rounded-xl bg-red-500/10 px-4 py-2 text-red-300"}>{msg.text}</p>}

      <section className="glass space-y-4 rounded-3xl p-6">
        <h2 className="font-display text-lg font-bold text-white">Mağaza bilgileri</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <F s={settings} name="store_name" label="Mağaza adı" />
          <F s={settings} name="tagline" label="Slogan" />
          <F s={settings} name="phone" label="Telefon" />
          <F s={settings} name="whatsapp" label="WhatsApp (ülke koduyla)" placeholder="905xxxxxxxxx" />
          <F s={settings} name="email" label="E-posta" type="email" />
          <F s={settings} name="address" label="Adres" />
          <F s={settings} name="map_url" label="Google Maps linki" />
        </div>
        <div>
          <label className="label">Duyuru bandı (sitenin en üstünde)</label>
          <input name="announcement" defaultValue={settings.announcement ?? ""} className="input" placeholder="🎮 Çorum içi aynı gün kurye!" />
        </div>
      </section>

      <section className="glass space-y-4 rounded-3xl p-6">
        <h2 className="font-display text-lg font-bold text-white">Sosyal medya hesapları</h2>
        <p className="text-sm text-slate-400">Profil linklerini gir — sitenin altında, bültende ve iletişim alanlarında görünür.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ["instagram", "Instagram", "https://instagram.com/gameloverCorum"],
              ["facebook", "Facebook", "https://facebook.com/…"],
              ["tiktok", "TikTok", "https://tiktok.com/@…"],
              ["youtube", "YouTube", "https://youtube.com/@…"],
              ["x", "X (Twitter)", "https://x.com/…"],
            ] as const
          ).map(([k, l, p]) => (
            <div key={k} className="flex items-end gap-3">
              <div className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-xl bg-white/5">
                <SocialIcon name={k} />
              </div>
              <div className="flex-1">
                <F s={settings} name={k} label={l} placeholder={p} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="neon-border space-y-4 rounded-3xl bg-ink-900/80 p-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white">
          <Zap className="h-5 w-5 text-neon-amber" /> Otomatik paylaşım (hesap bağlama)
        </h2>
        <div className="space-y-2 text-sm text-slate-300">
          <p>Yeni ürün, kampanya veya etkinlik eklediğinde içerik otomatik olarak bağlı hesaplarına gönderilir. Kurulum (bir kez, ~10 dk):</p>
          <ol className="list-decimal space-y-1 pl-5 text-slate-400">
            <li>
              <a href="https://www.make.com" target="_blank" rel="noopener noreferrer" className="text-neon-cyan">
                make.com
              </a>{" "}
              (veya Zapier / n8n) hesabı aç, yeni senaryo oluştur.
            </li>
            <li>
              Başlangıç modülü olarak <b>Webhooks → Custom webhook</b> seç, verdiği adresi aşağıya yapıştır.
            </li>
            <li>
              Ardına <b>Instagram for Business → Create a Photo Post</b>, <b>Facebook Pages → Create a Post</b>, <b>X → Create a Post</b> vb. modülleri ekleyip hesaplarını bağla.
            </li>
            <li>
              Görsel alanına <code>image_url</code>, açıklama alanına <code>caption</code> değişkenini eşle. Kaydet → &quot;Test gönder&quot;e bas.
            </li>
          </ol>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input name="social_webhook_url" defaultValue={settings.social_webhook_url ?? ""} className="input flex-1" placeholder="https://hook.eu2.make.com/xxxxxxxx" />
          <button
            type="button"
            className="btn-ghost"
            disabled={testing}
            onClick={async () => {
              setTesting(true);
              const r = await testWebhook();
              setMsg({ ok: r.ok, text: r.ok ? r.message! : r.error! });
              setTesting(false);
            }}
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test gönder"}
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Gönderilen veri: type, title, text, caption, image_url, url. Ayrıca her ürün/kampanya satırındaki paylaş menüsünden Facebook, X, WhatsApp, Telegram&apos;a tek tıkla paylaşabilir, Instagram için hazır metni kopyalayabilirsin.
        </p>
      </section>

      <section className="glass space-y-4 rounded-3xl p-6">
        <h2 className="font-display text-lg font-bold text-white">Oyun salonu ödülü</h2>
        <p className="text-sm text-slate-400">Oyunlarda eşik puanı geçen ziyaretçiler bu indirim kodunu görür. Eşik her oyunun zorluğuna göre otomatik ölçeklenir.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <F s={settings} name="reward_code" label="Ödül kupon kodu" placeholder="OYUNCU10" />
          <F s={settings} name="reward_score" label="Temel eşik puanı" type="number" />
        </div>
      </section>
    </form>
  );
}
