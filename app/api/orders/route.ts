import { NextResponse } from "next/server";
import { ADMIN_NOTIFY, mailLayout, orderTable, sendMail } from "@/lib/email";
import { SITE_URL, isSupabaseConfigured } from "@/lib/env";
import { serviceClient } from "@/lib/supabase/admin";
import type { OrderItem } from "@/lib/types";
import { DELIVERY, PAYMENT, escapeHtml, shippingFee, tl } from "@/lib/utils";

const str = (v: unknown, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });

  const customer_name = str(body.customer_name, 120);
  const phone = str(body.phone, 30);
  const email = str(body.email, 160).toLowerCase();
  const delivery = DELIVERY[body.delivery] ? body.delivery : "magaza";
  const payment = PAYMENT[body.payment] ? body.payment : "kapida";
  const address = str(body.address, 500);
  const note = str(body.note, 500);
  const coupon = str(body.coupon, 40).toUpperCase() || null;
  const reqItems: { id: string; qty: number }[] = Array.isArray(body.items) ? body.items.slice(0, 30) : [];

  if (customer_name.length < 2) return NextResponse.json({ error: "Lütfen adınızı girin." }, { status: 400 });
  if (phone.replace(/\D/g, "").length < 10) return NextResponse.json({ error: "Lütfen geçerli bir telefon girin." }, { status: 400 });
  if (email && !EMAIL_RE.test(email)) return NextResponse.json({ error: "E-posta adresi geçersiz." }, { status: 400 });
  if (delivery !== "magaza" && address.length < 8) return NextResponse.json({ error: "Lütfen açık adres girin." }, { status: 400 });
  if (!reqItems.length) return NextResponse.json({ error: "Sepetiniz boş." }, { status: 400 });

  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // Demo mod: veritabanı yokken akışı test edebilmek için.
    return NextResponse.json({ order_no: Math.floor(1000 + Math.random() * 9000), demo: true });
  }

  const db = serviceClient();
  const ids = reqItems.map((i) => String(i.id));
  const { data: products, error: pErr } = await db.from("products").select("id,name,price,stock,image_url,active").in("id", ids);
  if (pErr) return NextResponse.json({ error: "Ürünler doğrulanamadı." }, { status: 500 });

  const items: OrderItem[] = [];
  for (const r of reqItems) {
    const p = products?.find((x) => x.id === r.id && x.active);
    const qty = Math.max(1, Math.min(20, Math.floor(Number(r.qty) || 1)));
    if (!p) return NextResponse.json({ error: "Sepetinizdeki bir ürün artık satışta değil. Lütfen sepeti güncelleyin." }, { status: 409 });
    if (p.stock < qty) return NextResponse.json({ error: `"${p.name}" için yeterli stok yok (kalan: ${p.stock}).` }, { status: 409 });
    items.push({ id: p.id, name: p.name, price: Number(p.price), qty, image_url: p.image_url });
  }
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = shippingFee(delivery, subtotal);
  const total = subtotal + shipping;

  const { data: order, error } = await db
    .from("orders")
    .insert({ customer_name, phone, email: email || null, address: address || null, note: note || null, coupon, delivery, payment, items, shipping, total })
    .select("*")
    .single();
  if (error || !order) {
    console.error(error);
    return NextResponse.json({ error: "Sipariş kaydedilemedi." }, { status: 500 });
  }

  // Stok düş (en iyi çaba)
  await Promise.all(
    items.map((i) => {
      const p = products!.find((x) => x.id === i.id)!;
      return db.from("products").update({ stock: Math.max(0, p.stock - i.qty) }).eq("id", i.id);
    }),
  );

  if (email && body.subscribe) await db.from("subscribers").upsert({ email, name: customer_name, active: true }, { onConflict: "email" });

  const info = `<p><b>${escapeHtml(customer_name)}</b> · ${escapeHtml(phone)}${email ? ` · ${escapeHtml(email)}` : ""}<br>
    ${DELIVERY[delivery]} · ${PAYMENT[payment]}${address ? `<br>${escapeHtml(address)}` : ""}${coupon ? `<br>Kupon: <b>${escapeHtml(coupon)}</b>` : ""}${note ? `<br>Not: ${escapeHtml(note)}` : ""}</p>`;
  const shipRow = shipping ? `<p style="color:#b6b4cc">Teslimat ücreti: ${tl(shipping)}</p>` : "";

  await Promise.all([
    ADMIN_NOTIFY &&
      sendMail({
        to: ADMIN_NOTIFY,
        subject: `🛒 Yeni sipariş #${order.order_no} — ${tl(total)}`,
        html: mailLayout(`Yeni sipariş #${order.order_no}`, `${info}${orderTable(order)}${shipRow}<p><a href="${SITE_URL}/admin/siparisler" style="color:#22d3ee">Panelde görüntüle →</a></p>`),
        reply_to: email || undefined,
      }),
    email &&
      sendMail({
        to: email,
        subject: `Siparişin alındı #${order.order_no} — Game Lover`,
        html: mailLayout(
          "Siparişin için teşekkürler!",
          `<p>Merhaba ${escapeHtml(customer_name)},</p><p>Siparişini aldık, en kısa sürede seni arayarak onaylayacağız.</p>${orderTable(order)}${shipRow}${info}`,
        ),
      }),
  ]);

  return NextResponse.json({ order_no: order.order_no });
}
