import "server-only";
import { SITE_URL } from "@/lib/env";

export type SocialPost = {
  type: "urun" | "etkinlik" | "kampanya";
  title: string;
  text: string;
  image_url: string | null;
  url: string;
};

/**
 * Ayarlardaki webhook adresine (Make.com / Zapier / n8n) yeni içeriği gönderir.
 * Orada bir senaryo kurarak Instagram, Facebook, X, TikTok, Telegram vb.
 * hesaplarınıza otomatik gönderi atabilirsiniz.
 */
export async function pushToSocial(webhook: string | null | undefined, post: SocialPost) {
  if (!webhook) return { ok: false, skipped: true };
  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...post,
        url: post.url.startsWith("http") ? post.url : SITE_URL + post.url,
        caption: `${post.title}\n\n${post.text}\n\n👉 ${SITE_URL}${post.url}\n#GameLover #Çorum #oyun`,
        site: SITE_URL,
        sent_at: new Date().toISOString(),
      }),
    });
    return { ok: res.ok };
  } catch (e) {
    console.error("[social]", e);
    return { ok: false };
  }
}

/** Unsubscribe linkleri için basit imza (CRON_SECRET ile). */
export async function signEmail(email: string) {
  const secret = process.env.CRON_SECRET ?? "game-lover";
  const data = new TextEncoder().encode(`${secret}:${email.toLowerCase()}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .slice(0, 12)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
