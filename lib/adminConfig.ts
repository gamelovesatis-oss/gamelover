export type FieldType = "text" | "textarea" | "number" | "money" | "datetime" | "checkbox" | "image" | "select" | "url";

export type Field = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: Record<string, string>;
  full?: boolean; // formda tam genişlik
  help?: string;
};

export type TableConfig = {
  table: "products" | "events" | "campaigns" | "ads";
  title: string;
  singular: string;
  titleField: string;
  subtitle?: (row: Record<string, unknown>) => string;
  order: { column: string; ascending: boolean };
  share?: "urun" | "etkinlik" | "kampanya";
  publicPath: (row: Record<string, unknown>) => string;
  fields: Field[];
};

const tl = (v: unknown) => (v == null ? "" : `${Number(v).toLocaleString("tr-TR")} ₺`);
const dt = (v: unknown) => (v ? new Date(String(v)).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "medium", timeStyle: "short" }) : "");

export const TABLES: Record<string, TableConfig> = {
  urunler: {
    table: "products",
    title: "Ürünler",
    singular: "Ürün",
    titleField: "name",
    subtitle: (r) => `${tl(r.price)} · Stok: ${r.stock} · ${r.category ?? ""}`,
    order: { column: "created_at", ascending: false },
    share: "urun",
    publicPath: (r) => `/urunler/${r.slug}`,
    fields: [
      { name: "name", label: "Ürün adı", type: "text", required: true, full: true },
      { name: "image_url", label: "Fotoğraf", type: "image", full: true },
      { name: "description", label: "Açıklama", type: "textarea", full: true },
      { name: "price", label: "Fiyat (₺)", type: "money", required: true },
      { name: "old_price", label: "Eski fiyat (₺)", type: "money", help: "Doluysa indirim rozeti gösterilir." },
      { name: "category", label: "Kategori", type: "text", placeholder: "Konsol, Oyun, Aksesuar…" },
      { name: "platform", label: "Platform", type: "text", placeholder: "PS5, Xbox, Switch, PC" },
      { name: "stock", label: "Stok", type: "number" },
      { name: "slug", label: "URL (boşsa otomatik)", type: "text", placeholder: "playstation-5-slim" },
      { name: "featured", label: "Vitrinde göster", type: "checkbox" },
      { name: "active", label: "Yayında", type: "checkbox" },
    ],
  },
  kampanyalar: {
    table: "campaigns",
    title: "Kampanyalar",
    singular: "Kampanya",
    titleField: "title",
    subtitle: (r) => [r.badge, r.code && `Kod: ${r.code}`, r.ends_at && `Bitiş: ${dt(r.ends_at)}`].filter(Boolean).join(" · "),
    order: { column: "created_at", ascending: false },
    share: "kampanya",
    publicPath: () => "/kampanyalar",
    fields: [
      { name: "title", label: "Başlık", type: "text", required: true, full: true },
      { name: "image_url", label: "Görsel", type: "image", full: true },
      { name: "description", label: "Açıklama", type: "textarea", full: true },
      { name: "badge", label: "Rozet", type: "text", placeholder: "%30 İNDİRİM" },
      { name: "code", label: "Kupon kodu", type: "text", placeholder: "KONSOL30" },
      { name: "ends_at", label: "Bitiş tarihi", type: "datetime", help: "Boş bırakırsan süresiz." },
      { name: "featured", label: "Ana sayfada & bültende öne çıkar", type: "checkbox" },
      { name: "active", label: "Yayında", type: "checkbox" },
    ],
  },
  etkinlikler: {
    table: "events",
    title: "Etkinlikler",
    singular: "Etkinlik",
    titleField: "title",
    subtitle: (r) => `${dt(r.starts_at)}${r.prize ? ` · Ödül: ${r.prize}` : ""}`,
    order: { column: "starts_at", ascending: false },
    share: "etkinlik",
    publicPath: () => "/etkinlikler",
    fields: [
      { name: "title", label: "Etkinlik adı", type: "text", required: true, full: true },
      { name: "image_url", label: "Görsel", type: "image", full: true },
      { name: "description", label: "Açıklama", type: "textarea", full: true },
      { name: "starts_at", label: "Başlangıç", type: "datetime", required: true },
      { name: "location", label: "Yer", type: "text", placeholder: "Game Lover Çorum" },
      { name: "prize", label: "Ödül", type: "text" },
      { name: "capacity", label: "Kontenjan", type: "number" },
      { name: "register_url", label: "Kayıt linki (ops.)", type: "url", help: "Boşsa site içi kayıt formu kullanılır." },
      { name: "active", label: "Yayında", type: "checkbox" },
    ],
  },
  reklamlar: {
    table: "ads",
    title: "Reklamlar & Bannerlar",
    singular: "Reklam",
    titleField: "title",
    subtitle: (r) => `Konum: ${({ home: "Ana sayfa", products: "Mağaza", games: "Oyun salonu" } as Record<string, string>)[String(r.placement)] ?? r.placement} · Sıra: ${r.sort}`,
    order: { column: "sort", ascending: true },
    publicPath: (r) => String(r.link_url || "/"),
    fields: [
      { name: "title", label: "Başlık", type: "text", required: true, full: true },
      { name: "subtitle", label: "Alt başlık", type: "text", full: true },
      { name: "image_url", label: "Banner görseli (yatay, 1600px+)", type: "image", full: true },
      { name: "link_url", label: "Tıklanınca gidilecek link", type: "text", placeholder: "/urunler/playstation-5-slim veya https://…" },
      { name: "placement", label: "Nerede gösterilsin", type: "select", options: { home: "Ana sayfa", products: "Mağaza", games: "Oyun salonu" } },
      { name: "sort", label: "Sıra", type: "number" },
      { name: "active", label: "Yayında", type: "checkbox" },
    ],
  },
};
