"use server";

import { revalidatePath } from "next/cache";
import { TABLES } from "@/lib/adminConfig";
import { requireAdmin } from "@/lib/auth";
import { sendDigest } from "@/lib/digest";
import { isMailConfigured, mailLayout, orderTable, sendMail } from "@/lib/email";
import { pushToSocial } from "@/lib/social";
import { serviceClient } from "@/lib/supabase/admin";
import type { Order } from "@/lib/types";
import { ORDER_STATUSES, escapeHtml, slugify } from "@/lib/utils";

type Result = { ok: boolean; error?: string; message?: string };

const refresh = () => revalidatePath("/", "layout");

async function uploadImage(file: File) {
  const db = serviceClient();
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
  const { error } = await db.storage.from("media").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(`Görsel yüklenemedi: ${error.message}`);
  return db.storage.from("media").getPublicUrl(path).data.publicUrl;
}

export async function saveItem(key: string, formData: FormData): Promise<Result> {
  try {
    await requireAdmin();
    const cfg = TABLES[key];
    if (!cfg) return { ok: false, error: "Bilinmeyen tablo" };
    const id = String(formData.get("id") || "");
    const row: Record<string, unknown> = {};

    for (const f of cfg.fields) {
      const raw = formData.get(f.name);
      switch (f.type) {
        case "checkbox":
          row[f.name] = raw === "on";
          break;
        case "number":
        case "money": {
          const s = String(raw ?? "").replace(",", ".").trim();
          row[f.name] = s === "" ? (f.name === "stock" || f.name === "sort" ? 0 : null) : Number(s);
          break;
        }
        case "datetime": {
          const s = String(raw ?? "").trim();
          // Form Türkiye saatinde gelir (UTC+3, yaz saati yok).
          row[f.name] = s ? new Date(`${s}:00+03:00`).toISOString() : null;
          break;
        }
        case "image": {
          const file = formData.get(`${f.name}__file`);
          if (file instanceof File && file.size > 0) row[f.name] = await uploadImage(file);
          else row[f.name] = String(raw ?? "").trim() || null;
          break;
        }
        default:
          row[f.name] = String(raw ?? "").trim() || null;
      }
      if (f.required && (row[f.name] === null || row[f.name] === "")) return { ok: false, error: `"${f.label}" zorunlu.` };
    }

    if (cfg.table === "products") row.slug = slugify(String(row.slug || row.name)) || crypto.randomUUID().slice(0, 8);
    if (cfg.table === "events" && !row.location) row.location = "Game Lover Çorum";

    const db = serviceClient();
    const q = id ? db.from(cfg.table).update(row).eq("id", id) : db.from(cfg.table).insert(row);
    const { data, error } = await q.select("*").single();
    if (error) return { ok: false, error: error.code === "23505" ? "Bu URL (slug) zaten kullanılıyor." : error.message };

    let message = id ? "Güncellendi." : "Eklendi.";
    if (cfg.share && formData.get("__share") === "on") {
      const { data: s } = await db.from("settings").select("social_webhook_url").eq("id", 1).single();
      const title = String(data[cfg.titleField]);
      const r = await pushToSocial(s?.social_webhook_url, {
        type: cfg.share,
        title,
        text: String(data.description ?? ""),
        image_url: data.image_url,
        url: cfg.publicPath(data),
      });
      message += r.skipped ? " (Sosyal medya webhook'u ayarlı değil.)" : r.ok ? " Sosyal medyaya gönderildi 🚀" : " Sosyal medya gönderimi başarısız.";
    }
    refresh();
    return { ok: true, message };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function deleteItem(key: string, id: string): Promise<Result> {
  try {
    await requireAdmin();
    const cfg = TABLES[key];
    if (!cfg) return { ok: false, error: "Bilinmeyen tablo" };
    const { error } = await serviceClient().from(cfg.table).delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function toggleField(key: string, id: string, field: "active" | "featured", value: boolean): Promise<Result> {
  try {
    await requireAdmin();
    const cfg = TABLES[key];
    if (!cfg || !cfg.fields.some((f) => f.name === field)) return { ok: false, error: "Geçersiz alan" };
    const { error } = await serviceClient().from(cfg.table).update({ [field]: value }).eq("id", id);
    if (error) return { ok: false, error: error.message };
    refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function updateOrderStatus(id: string, status: string, notify: boolean): Promise<Result> {
  try {
    await requireAdmin();
    if (!ORDER_STATUSES[status]) return { ok: false, error: "Geçersiz durum" };
    const db = serviceClient();
    const { data: order, error } = await db.from("orders").update({ status }).eq("id", id).select("*").single<Order>();
    if (error) return { ok: false, error: error.message };

    // İptal edilen siparişin stoğunu geri ekle
    if (status === "iptal") {
      for (const i of order.items) {
        const { data: p } = await db.from("products").select("stock").eq("id", i.id).maybeSingle();
        if (p) await db.from("products").update({ stock: p.stock + i.qty }).eq("id", i.id);
      }
    }

    if (notify && order.email) {
      const texts: Record<string, string> = {
        hazirlaniyor: "Siparişin hazırlanıyor! Kısa süre içinde yola çıkacak. 📦",
        yolda: "Siparişin yola çıktı! Çok yakında sende. 🚀",
        teslim: "Siparişin teslim edildi. İyi oyunlar! 🎮 Bizi değerlendirmeyi unutma.",
        iptal: "Siparişin iptal edildi. Bir sorun olduğunu düşünüyorsan bize ulaş.",
        yeni: "Siparişin alındı.",
      };
      await sendMail({
        to: order.email,
        subject: `Sipariş #${order.order_no}: ${ORDER_STATUSES[status].label}`,
        html: mailLayout(
          `Sipariş #${order.order_no} — ${ORDER_STATUSES[status].label}`,
          `<p>Merhaba ${escapeHtml(order.customer_name)},</p><p>${texts[status]}</p>${orderTable(order)}`,
        ),
      });
    }
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function updateOfferStatus(id: string, status: string): Promise<Result> {
  try {
    await requireAdmin();
    const { error } = await serviceClient().from("offers").update({ status }).eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function deleteRow(table: "offers" | "subscribers" | "scores", id: string): Promise<Result> {
  try {
    await requireAdmin();
    if (!["offers", "subscribers", "scores"].includes(table)) return { ok: false, error: "Geçersiz" };
    const { error } = await serviceClient().from(table).delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

const SETTINGS_FIELDS = [
  "store_name", "tagline", "phone", "whatsapp", "email", "address", "map_url",
  "instagram", "facebook", "tiktok", "youtube", "x", "announcement", "social_webhook_url", "reward_code",
] as const;

export async function saveSettings(formData: FormData): Promise<Result> {
  try {
    await requireAdmin();
    const row: Record<string, unknown> = { id: 1, updated_at: new Date().toISOString() };
    for (const k of SETTINGS_FIELDS) row[k] = String(formData.get(k) ?? "").trim() || null;
    row.reward_score = Number(formData.get("reward_score")) || 500;
    if (row.reward_code) row.reward_code = String(row.reward_code).toUpperCase();
    const { error } = await serviceClient().from("settings").upsert(row);
    if (error) return { ok: false, error: error.message };
    refresh();
    return { ok: true, message: "Ayarlar kaydedildi." };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function testWebhook(): Promise<Result> {
  try {
    await requireAdmin();
    const { data } = await serviceClient().from("settings").select("social_webhook_url").eq("id", 1).single();
    const r = await pushToSocial(data?.social_webhook_url, {
      type: "kampanya",
      title: "Test gönderisi 🎮",
      text: "Game Lover sosyal medya bağlantısı çalışıyor!",
      image_url: null,
      url: "/",
    });
    if (r.skipped) return { ok: false, error: "Önce webhook adresini kaydedin." };
    return r.ok ? { ok: true, message: "Test gönderildi!" } : { ok: false, error: "Webhook yanıt vermedi." };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function sendBulletin(formData: FormData): Promise<Result> {
  try {
    await requireAdmin();
    if (!isMailConfigured()) return { ok: false, error: "SMTP_USER / SMTP_PASS tanımlı değil (ortam değişkenleri)." };
    const r = await sendDigest({
      subject: String(formData.get("subject") || "").trim() || undefined,
      intro: String(formData.get("intro") || "").trim() || undefined,
    });
    return { ok: true, message: `${r.sent ?? 0} / ${r.recipients} aboneye gönderildi.` };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
