import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { SITE_URL } from "@/lib/env";
import { escapeHtml, tl } from "@/lib/utils";
import type { Campaign, GameEvent, Order, Product } from "@/lib/types";

const SMTP_USER = process.env.SMTP_USER ?? "";
const FROM = process.env.EMAIL_FROM || `Game Lover <${SMTP_USER}>`;
export const ADMIN_NOTIFY = process.env.ADMIN_NOTIFY_EMAIL || SMTP_USER;

/** SMTP (Gmail uygulama şifresi) ayarlı mı? */
export const isMailConfigured = () => Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

type Mail = { to: string | string[]; subject: string; html: string; reply_to?: string };

let transporter: Transporter | null = null;
function getTransport() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT ?? 465);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? "smtp.gmail.com",
      port,
      secure: port === 465,
      pool: true,
      maxConnections: 3,
      auth: { user: process.env.SMTP_USER, pass: (process.env.SMTP_PASS ?? "").replace(/\s/g, "") },
    });
  }
  return transporter;
}

export async function sendMail(mail: Mail) {
  if (!isMailConfigured()) {
    console.warn("[email] SMTP_USER / SMTP_PASS yok, e-posta atlanıyor:", mail.subject);
    return { ok: false, skipped: true };
  }
  try {
    await getTransport().sendMail({ from: FROM, to: mail.to, subject: mail.subject, html: mail.html, replyTo: mail.reply_to });
    return { ok: true };
  } catch (e) {
    console.error("[email]", e);
    return { ok: false };
  }
}

/**
 * Her aboneye ayrı e-posta gider (adresler birbirini görmez).
 * Not: Gmail günde ~500 alıcı sınırı uygular.
 */
export async function sendBulk(recipients: string[], subject: string, html: (email: string) => string) {
  if (!isMailConfigured()) return { sent: 0, skipped: true };
  let sent = 0;
  for (let i = 0; i < recipients.length; i += 5) {
    const results = await Promise.all(recipients.slice(i, i + 5).map((to) => sendMail({ to, subject, html: html(to) })));
    sent += results.filter((r) => r.ok).length;
  }
  return { sent };
}

export function mailLayout(title: string, body: string, footer = "") {
  return `<!doctype html><html><body style="margin:0;background:#07060d;font-family:Segoe UI,Arial,sans-serif;color:#e5e7eb">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#07060d;padding:24px 0"><tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#120f24;border-radius:18px;overflow:hidden;border:1px solid #2a2450">
    <tr><td style="padding:28px 28px 20px;background:#8b5cf6;background-image:linear-gradient(135deg,#8b5cf6,#22d3ee);">
      <div style="font-size:26px;font-weight:800;color:#fff;letter-spacing:1px">🎮 GAME LOVER</div>
      <div style="color:#f0f9ff;font-size:14px;margin-top:4px">${escapeHtml(title)}</div>
    </td></tr>
    <tr><td style="padding:28px;font-size:15px;line-height:1.6;color:#e5e7eb">${body}</td></tr>
    <tr><td style="padding:18px 28px;font-size:12px;color:#8b8aa3;border-top:1px solid #2a2450">
      Game Lover · Çorum · <a href="${SITE_URL}" style="color:#22d3ee">${SITE_URL.replace(/^https?:\/\//, "")}</a>${footer}
    </td></tr>
  </table></td></tr></table></body></html>`;
}

export function orderTable(o: Pick<Order, "items" | "total">) {
  const rows = o.items
    .map(
      (i) => `<tr><td style="padding:8px 0;border-bottom:1px solid #2a2450;color:#e5e7eb">${escapeHtml(i.name)} × ${i.qty}</td>
      <td align="right" style="padding:8px 0;border-bottom:1px solid #2a2450;color:#e5e7eb">${tl(i.price * i.qty)}</td></tr>`,
    )
    .join("");
  return `<table width="100%" cellpadding="0" cellspacing="0">${rows}
  <tr><td style="padding-top:12px;font-weight:700;color:#fff">Toplam</td><td align="right" style="padding-top:12px;font-weight:700;color:#22d3ee">${tl(o.total)}</td></tr></table>`;
}

const card = (img: string | null, title: string, text: string, href: string, badge?: string | null) => `
  <a href="${href}" style="display:block;text-decoration:none;color:#e5e7eb;background:#1c1836;border-radius:14px;overflow:hidden;margin-bottom:14px">
    ${img ? `<img src="${escapeHtml(img)}" width="544" style="width:100%;height:auto;display:block" alt="">` : ""}
    <div style="padding:14px 16px">
      ${badge ? `<span style="background:#f472b6;color:#fff;font-size:11px;font-weight:700;padding:3px 8px;border-radius:99px">${escapeHtml(badge)}</span>` : ""}
      <div style="font-size:17px;font-weight:700;margin-top:6px;color:#fff">${escapeHtml(title)}</div>
      <div style="font-size:14px;color:#b6b4cc">${escapeHtml(text)}</div>
    </div></a>`;

export function digestHtml(
  campaigns: Campaign[],
  products: Product[],
  events: GameEvent[],
  unsubscribeUrl: string,
  intro = "",
) {
  const parts: string[] = [];
  if (intro) parts.push(`<p style="white-space:pre-line">${escapeHtml(intro)}</p>`);
  if (campaigns.length) {
    parts.push(`<h2 style="color:#f472b6;font-size:18px">🔥 Çorum'un En Büyük Fırsatları</h2>`);
    campaigns.forEach((c) =>
      parts.push(card(c.image_url, c.title, `${c.description}${c.code ? ` — Kod: ${c.code}` : ""}`, `${SITE_URL}/kampanyalar`, c.badge)),
    );
  }
  if (products.length) {
    parts.push(`<h2 style="color:#22d3ee;font-size:18px">⭐ Öne Çıkan Ürünler</h2>`);
    products.forEach((p) =>
      parts.push(
        card(
          p.image_url,
          p.name,
          `${tl(p.price)}${p.old_price ? ` (yerine ${tl(p.old_price)})` : ""}`,
          `${SITE_URL}/urunler/${p.slug}`,
          p.old_price ? "İNDİRİM" : null,
        ),
      ),
    );
  }
  if (events.length) {
    parts.push(`<h2 style="color:#a3e635;font-size:18px">🏆 Yaklaşan Etkinlikler</h2>`);
    events.forEach((e) =>
      parts.push(
        card(
          e.image_url,
          e.title,
          `${new Date(e.starts_at).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}${e.prize ? ` · Ödül: ${e.prize}` : ""}`,
          `${SITE_URL}/etkinlikler`,
        ),
      ),
    );
  }
  return mailLayout("Haftanın fırsatları", parts.join(""), ` · <a href="${unsubscribeUrl}" style="color:#8b8aa3">Abonelikten çık</a>`);
}
