import type { MetadataRoute } from "next";
import { GAMES } from "@/games/registry";
import { getProducts } from "@/lib/data";
import { SITE_URL } from "@/lib/env";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getProducts();
  const pages = ["", "/urunler", "/kampanyalar", "/etkinlikler", "/oyunlar", "/teklif"];
  return [
    ...pages.map((p) => ({ url: SITE_URL + p, changeFrequency: "daily" as const, priority: p ? 0.8 : 1 })),
    ...products.map((p) => ({ url: `${SITE_URL}/urunler/${p.slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...GAMES.map((g) => ({ url: `${SITE_URL}/oyunlar/${g.slug}`, changeFrequency: "monthly" as const, priority: 0.5 })),
  ];
}
