import clsx, { type ClassValue } from "clsx";

export const cn = (...v: ClassValue[]) => clsx(v);

export const tl = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(n);

export const trDate = (d: string | Date, withTime = true) =>
  new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    weekday: withTime ? "long" : undefined,
    hour: withTime ? "2-digit" : undefined,
    minute: withTime ? "2-digit" : undefined,
    timeZone: "Europe/Istanbul",
  }).format(new Date(d));

export function slugify(s: string) {
  const map: Record<string, string> = { ç: "c", ğ: "g", ı: "i", İ: "i", ö: "o", ş: "s", ü: "u" };
  return s
    .toLowerCase()
    .replace(/[çğıİöşü]/g, (c) => map[c] ?? c)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const discountPct = (price: number, old?: number | null) =>
  old && old > price ? Math.round(((old - price) / old) * 100) : 0;

export const ORDER_STATUSES: Record<string, { label: string; color: string }> = {
  yeni: { label: "Yeni", color: "bg-neon-cyan/20 text-neon-cyan" },
  hazirlaniyor: { label: "Hazırlanıyor", color: "bg-neon-amber/20 text-neon-amber" },
  yolda: { label: "Yolda", color: "bg-neon-violet/20 text-violet-300" },
  teslim: { label: "Teslim edildi", color: "bg-neon-lime/20 text-neon-lime" },
  iptal: { label: "İptal", color: "bg-red-500/20 text-red-300" },
};

export const DELIVERY: Record<string, string> = { magaza: "Mağazadan teslim", kurye: "Çorum içi kurye", kargo: "Kargo" };
export const PAYMENT: Record<string, string> = { kapida: "Kapıda ödeme", havale: "Havale / EFT", magaza: "Mağazada ödeme" };

export const OFFER_KINDS: Record<string, string> = {
  takas: "Takas",
  satis: "2. el satış",
  toplu: "Toplu / kurumsal alım",
  etkinlik: "Etkinlik kaydı",
  diger: "Diğer",
};

/** Teslimat ücreti — sepet ve sunucu aynı kuralı kullanır. */
export const FREE_SHIPPING_LIMIT = 1500;
export function shippingFee(delivery: string, subtotal: number) {
  if (subtotal >= FREE_SHIPPING_LIMIT || delivery === "magaza") return 0;
  return delivery === "kargo" ? 120 : 75;
}
