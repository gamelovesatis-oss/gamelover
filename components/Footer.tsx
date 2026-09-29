import Link from "next/link";
import { Gamepad2, MapPin, Phone, Mail } from "lucide-react";
import { NewsletterForm } from "@/components/NewsletterForm";
import { SocialLinks } from "@/components/SocialIcons";
import type { Settings } from "@/lib/types";

export function Footer({ settings }: { settings: Settings }) {
  return (
    <footer className="relative mt-32 border-t border-white/10 bg-ink-900/60">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-neon-violet to-transparent" />
      <div className="container-x grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-neon-violet to-neon-cyan">
              <Gamepad2 className="h-5 w-5 text-white" />
            </div>
            <span className="font-display text-xl font-bold text-white">
              GAME<span className="text-neon-cyan">LOVER</span>
            </span>
          </div>
          <p className="text-sm text-slate-400">{settings.tagline}. Konsollar, oyunlar, aksesuarlar, turnuvalar ve çok daha fazlası.</p>
          <SocialLinks settings={settings} />
        </div>

        <div>
          <h4 className="mb-4 font-display font-semibold text-white">Keşfet</h4>
          <ul className="space-y-2.5 text-sm text-slate-400">
            {[
              ["/urunler", "Mağaza"],
              ["/kampanyalar", "Kampanyalar"],
              ["/etkinlikler", "Etkinlikler & Turnuvalar"],
              ["/oyunlar", "Oyun Salonu"],
              ["/teklif", "Takas & Teklif"],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="transition hover:text-neon-cyan">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-4 font-display font-semibold text-white">İletişim</h4>
          <ul className="space-y-3 text-sm text-slate-400">
            {settings.address && (
              <li className="flex gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-neon-pink" />
                {settings.map_url ? (
                  <a href={settings.map_url} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                    {settings.address}
                  </a>
                ) : (
                  settings.address
                )}
              </li>
            )}
            {settings.phone && (
              <li className="flex gap-2">
                <Phone className="h-4 w-4 shrink-0 text-neon-cyan" />
                <a href={`tel:${settings.phone.replace(/\s|\(|\)/g, "")}`} className="hover:text-white">
                  {settings.phone}
                </a>
              </li>
            )}
            {settings.email && (
              <li className="flex gap-2">
                <Mail className="h-4 w-4 shrink-0 text-neon-violet" />
                <a href={`mailto:${settings.email}`} className="hover:text-white">
                  {settings.email}
                </a>
              </li>
            )}
          </ul>
        </div>

        <div>
          <h4 className="mb-2 font-display font-semibold text-white">Fırsatları kaçırma</h4>
          <p className="mb-4 text-sm text-slate-400">Çorum&apos;un en büyük kampanyaları her hafta e-postana gelsin.</p>
          <NewsletterForm />
        </div>
      </div>
      <div className="border-t border-white/5 py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} {settings.store_name} · Tüm hakları saklıdır ·{" "}
        <Link href="/admin" className="hover:text-slate-300">
          Yönetim
        </Link>
      </div>
    </footer>
  );
}
