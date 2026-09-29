"use client";

import { usePathname } from "next/navigation";
import { SocialIcon } from "@/components/SocialIcons";

/** Sabit WhatsApp butonu — oyun sayfalarında oyun tuşlarının üstüne binmemesi için gizlenir. */
export function WhatsAppButton({ number }: { number: string }) {
  const path = usePathname();
  if (path.startsWith("/oyunlar/")) return null;
  return (
    <a
      href={`https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent("Merhaba Game Lover! ")}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp ile yaz"
      className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-green-500 text-white shadow-[0_0_30px_rgba(34,197,94,0.6)] transition hover:scale-110"
    >
      <span className="absolute inset-0 animate-ping rounded-full bg-green-500 opacity-30" />
      <SocialIcon name="whatsapp" className="relative h-7 w-7" />
    </a>
  );
}
