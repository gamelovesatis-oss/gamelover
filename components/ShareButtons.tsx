"use client";

import { Check, Link2, Share2 } from "lucide-react";
import { useState } from "react";
import { SocialIcon } from "@/components/SocialIcons";
import { SITE_URL } from "@/lib/env";
import { cn } from "@/lib/utils";

/** Ürün/etkinlik/kampanya paylaşım butonları. */
export function ShareButtons({ url, text, className }: { url: string; text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const full = url.startsWith("/") ? SITE_URL + url : url;
  const e = encodeURIComponent;

  const targets = [
    { key: "whatsapp", href: `https://wa.me/?text=${e(`${text} ${full}`)}`, cls: "hover:bg-green-500" },
    { key: "facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${e(full)}`, cls: "hover:bg-blue-600" },
    { key: "x", href: `https://twitter.com/intent/tweet?text=${e(text)}&url=${e(full)}`, cls: "hover:bg-black" },
  ];

  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: text, url: full });
      } catch {}
    } else {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {targets.map((t) => (
        <a
          key={t.key}
          href={t.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${t.key} ile paylaş`}
          className={cn("glass grid h-9 w-9 place-items-center rounded-lg text-slate-300 transition hover:-translate-y-0.5 hover:text-white", t.cls)}
        >
          <SocialIcon name={t.key} className="h-4 w-4" />
        </a>
      ))}
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(full);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        }}
        aria-label="Linki kopyala"
        className="glass grid h-9 w-9 place-items-center rounded-lg text-slate-300 transition hover:-translate-y-0.5 hover:text-white"
      >
        {copied ? <Check className="h-4 w-4 text-neon-lime" /> : <Link2 className="h-4 w-4" />}
      </button>
      <button
        type="button"
        onClick={nativeShare}
        aria-label="Paylaş"
        className="glass grid h-9 w-9 place-items-center rounded-lg text-slate-300 transition hover:-translate-y-0.5 hover:text-white sm:hidden"
      >
        <Share2 className="h-4 w-4" />
      </button>
    </div>
  );
}
