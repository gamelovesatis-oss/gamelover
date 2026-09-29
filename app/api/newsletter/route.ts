import { NextResponse } from "next/server";
import { mailLayout, sendMail } from "@/lib/email";
import { SITE_URL, isSupabaseConfigured } from "@/lib/env";
import { signEmail } from "@/lib/social";
import { serviceClient } from "@/lib/supabase/admin";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body?.email ?? "").trim().toLowerCase().slice(0, 160);
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Geçerli bir e-posta girin." }, { status: 400 });

  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ message: "Aboneliğin alındı! (demo)" });

  const db = serviceClient();
  const { data: existing } = await db.from("subscribers").select("active").eq("email", email).maybeSingle();
  if (existing?.active) return NextResponse.json({ message: "Zaten abonesin, fırsatlar yolda!" });

  const { error } = await db.from("subscribers").upsert({ email, active: true }, { onConflict: "email" });
  if (error) return NextResponse.json({ error: "Kaydedilemedi, tekrar deneyin." }, { status: 500 });

  const unsub = `${SITE_URL}/api/newsletter?e=${encodeURIComponent(email)}&s=${await signEmail(email)}`;
  await sendMail({
    to: email,
    subject: "🎮 Game Lover fırsat bültenine hoş geldin!",
    html: mailLayout(
      "Aramıza hoş geldin!",
      `<p>Artık Çorum'un en büyük oyun fırsatları, turnuva duyuruları ve abonelere özel indirim kodları ilk sana gelecek.</p>
       <p><a href="${SITE_URL}/kampanyalar" style="display:inline-block;background:#8b5cf6;color:#fff;padding:12px 22px;border-radius:12px;text-decoration:none;font-weight:700">Güncel kampanyaları gör</a></p>`,
      ` · <a href="${unsub}" style="color:#8b8aa3">Abonelikten çık</a>`,
    ),
  });
  return NextResponse.json({ message: "Aramıza hoş geldin! E-postanı kontrol et." });
}

/** Abonelikten çıkma linki: /api/newsletter?e=..&s=.. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = (url.searchParams.get("e") ?? "").toLowerCase();
  const sig = url.searchParams.get("s") ?? "";
  let ok = false;
  if (email && sig === (await signEmail(email)) && isSupabaseConfigured && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { error } = await serviceClient().from("subscribers").update({ active: false }).eq("email", email);
    ok = !error;
  }
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><body style="background:#05040b;color:#e5e7eb;font-family:sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center">
    <div><h1>${ok ? "Abonelikten çıktın" : "Bağlantı geçersiz"}</h1><p>${ok ? "Artık bülten e-postası almayacaksın." : "Lütfen e-postadaki bağlantıyı kullanın."}</p><a style="color:#22d3ee" href="${SITE_URL}">Siteye dön</a></div></body>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
