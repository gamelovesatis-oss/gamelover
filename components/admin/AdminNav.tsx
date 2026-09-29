"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, ExternalLink, Gamepad2, Inbox, LayoutDashboard, LogOut, Mail, Megaphone, Menu, Package, Settings, ShoppingCart, Tag, X } from "lucide-react";
import { useState } from "react";
import { browserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Genel Bakış", Icon: LayoutDashboard },
  { href: "/admin/siparisler", label: "Siparişler", Icon: ShoppingCart },
  { href: "/admin/urunler", label: "Ürünler", Icon: Package },
  { href: "/admin/kampanyalar", label: "Kampanyalar", Icon: Tag },
  { href: "/admin/etkinlikler", label: "Etkinlikler", Icon: CalendarDays },
  { href: "/admin/reklamlar", label: "Reklamlar", Icon: Megaphone },
  { href: "/admin/teklifler", label: "Teklifler", Icon: Inbox },
  { href: "/admin/aboneler", label: "Bülten & Aboneler", Icon: Mail },
  { href: "/admin/ayarlar", label: "Ayarlar & Sosyal Medya", Icon: Settings },
];

export function AdminNav({ email, onlyLogout }: { email: string | null; onlyLogout?: boolean }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await browserClient().auth.signOut();
    router.replace("/admin/giris");
    router.refresh();
  }

  if (onlyLogout)
    return (
      <button onClick={logout} className="btn-ghost mt-6">
        <LogOut className="h-4 w-4" /> Çıkış yap
      </button>
    );

  const nav = (
    <nav className="flex h-full flex-col gap-1 p-4">
      <Link href="/admin" className="mb-6 flex items-center gap-2.5 px-2">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-neon-violet to-neon-cyan">
          <Gamepad2 className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="font-display font-bold text-white">GAME LOVER</div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Yönetim</div>
        </div>
      </Link>
      {LINKS.map(({ href, label, Icon }) => {
        const active = href === "/admin" ? path === "/admin" : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
              active ? "bg-gradient-to-r from-neon-violet/30 to-neon-cyan/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white",
            )}
          >
            <Icon className={cn("h-4 w-4", active && "text-neon-cyan")} /> {label}
          </Link>
        );
      })}
      <div className="mt-auto space-y-1 border-t border-white/10 pt-4">
        <Link href="/" target="_blank" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white">
          <ExternalLink className="h-4 w-4" /> Siteyi görüntüle
        </Link>
        <button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-300">
          <LogOut className="h-4 w-4" /> Çıkış
        </button>
        {email && <div className="truncate px-3 pt-2 text-xs text-slate-600">{email}</div>}
      </div>
    </nav>
  );

  return (
    <>
      <aside className="sticky top-0 hidden h-screen border-r border-white/10 bg-ink-900/60 lg:block">{nav}</aside>
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-ink-900/90 px-4 py-3 backdrop-blur lg:hidden">
        <span className="font-display font-bold text-white">GAME LOVER · Yönetim</span>
        <button onClick={() => setOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl glass" aria-label="Menü">
          <Menu className="h-5 w-5" />
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 bg-ink-950/95 lg:hidden">
          <button onClick={() => setOpen(false)} className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-xl glass" aria-label="Kapat">
            <X className="h-5 w-5" />
          </button>
          {nav}
        </div>
      )}
    </>
  );
}
