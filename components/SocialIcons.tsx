import type { Settings } from "@/lib/types";
import { cn } from "@/lib/utils";

const paths: Record<string, string> = {
  instagram:
    "M12 2.2c3.2 0 3.6 0 4.8.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-3.3-.1-4.8-1.7-4.9-4.9C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8C2.4 3.9 3.9 2.4 7.2 2.3 8.4 2.2 8.8 2.2 12 2.2zm0 4.9a4.9 4.9 0 100 9.8 4.9 4.9 0 000-9.8zm0 8.1a3.2 3.2 0 110-6.4 3.2 3.2 0 010 6.4zm5.1-9.4a1.2 1.2 0 100 2.3 1.2 1.2 0 000-2.3z",
  facebook:
    "M22 12a10 10 0 10-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7A10 10 0 0022 12z",
  tiktok:
    "M19.6 6.7a4.8 4.8 0 01-3.8-4.2V2h-3.4v13.7a2.9 2.9 0 11-2-2.7V9.5a6.3 6.3 0 105.4 6.2V8.8a8.2 8.2 0 004.8 1.5V6.9a4.8 4.8 0 01-1-.2z",
  youtube:
    "M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 00.5 6.2 31 31 0 000 12a31 31 0 00.5 5.8 3 3 0 002.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 002.1-2.1A31 31 0 0024 12a31 31 0 00-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z",
  x: "M18.2 2.3h3.4l-7.4 8.4 8.7 11.5h-6.8l-5.3-7-6.1 7H1.3l7.9-9L.9 2.3h7l4.8 6.4 5.5-6.4zm-1.2 17.9h1.9L7.1 4.2H5.1l11.9 16z",
  whatsapp:
    "M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5 2.5 1 3 .8 3.6.8.6-.1 1.8-.7 2-1.5.2-.7.2-1.4.2-1.5-.1-.2-.3-.3-.6-.4zM12 21.8a9.8 9.8 0 01-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 1112 21.8zM12 0a12 12 0 00-10.3 18.1L0 24l6.1-1.6A12 12 0 1012 0z",
};

export function SocialIcon({ name, className }: { name: keyof typeof paths | string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={cn("h-5 w-5", className)} aria-hidden>
      <path d={paths[name]} />
    </svg>
  );
}

export function SocialLinks({ settings, className }: { settings: Settings; className?: string }) {
  const links = [
    { key: "instagram", href: settings.instagram, label: "Instagram", hover: "hover:bg-gradient-to-tr hover:from-amber-500 hover:via-pink-500 hover:to-purple-600" },
    { key: "facebook", href: settings.facebook, label: "Facebook", hover: "hover:bg-blue-600" },
    { key: "tiktok", href: settings.tiktok, label: "TikTok", hover: "hover:bg-black hover:shadow-[3px_3px_0_#22d3ee,-3px_-3px_0_#f472b6]" },
    { key: "youtube", href: settings.youtube, label: "YouTube", hover: "hover:bg-red-600" },
    { key: "x", href: settings.x, label: "X", hover: "hover:bg-black" },
    { key: "whatsapp", href: settings.whatsapp ? `https://wa.me/${settings.whatsapp.replace(/\D/g, "")}` : null, label: "WhatsApp", hover: "hover:bg-green-500" },
  ].filter((l) => l.href);

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {links.map((l) => (
        <a
          key={l.key}
          href={l.href!}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={l.label}
          className={cn("glass grid h-10 w-10 place-items-center rounded-xl text-slate-300 transition-all duration-300 hover:-translate-y-1 hover:text-white", l.hover)}
        >
          <SocialIcon name={l.key} />
        </a>
      ))}
    </div>
  );
}
