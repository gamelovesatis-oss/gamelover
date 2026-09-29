import { NextResponse } from "next/server";
import { ADMIN_NOTIFY, mailLayout, sendMail } from "@/lib/email";
import { SITE_URL, isSupabaseConfigured } from "@/lib/env";
import { serviceClient } from "@/lib/supabase/admin";
import { OFFER_KINDS, escapeHtml, tl } from "@/lib/utils";

const str = (v: unknown, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const name = str(b.name, 120);
  const phone = str(b.phone, 30);
  const email = str(b.email, 160).toLowerCase();
  const message = str(b.message, 3000);
  const kind = OFFER_KINDS[b.kind] ? b.kind : "diger";
  const budget = Number(b.budget) > 0 ? Math.min(Number(b.budget), 10_000_000) : null;

  if (name.length < 2 || message.length < 5) return NextResponse.json({ error: "Lütfen adınızı ve detayları girin." }, { status: 400 });
  if (phone.replace(/\D/g, "").length < 10) return NextResponse.json({ error: "Lütfen geçerli bir telefon girin." }, { status: 400 });

  if (isSupabaseConfigured && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { error } = await serviceClient().from("offers").insert({ name, phone, email: email || null, message, kind, budget });
    if (error) return NextResponse.json({ error: "Kaydedilemedi." }, { status: 500 });
  }

  if (ADMIN_NOTIFY)
    await sendMail({
      to: ADMIN_NOTIFY,
      subject: `💬 Yeni ${OFFER_KINDS[kind]} talebi — ${name}`,
      reply_to: email || undefined,
      html: mailLayout(
        `Yeni teklif talebi: ${OFFER_KINDS[kind]}`,
        `<p><b>${escapeHtml(name)}</b> · ${escapeHtml(phone)}${email ? ` · ${escapeHtml(email)}` : ""}</p>
         ${budget ? `<p>Bütçe / beklenen: <b>${tl(budget)}</b></p>` : ""}
         <p style="white-space:pre-line;background:#1c1836;padding:14px;border-radius:12px">${escapeHtml(message)}</p>
         <p><a href="${SITE_URL}/admin/teklifler" style="color:#22d3ee">Panelde görüntüle →</a></p>`,
      ),
    });

  return NextResponse.json({ ok: true });
}
