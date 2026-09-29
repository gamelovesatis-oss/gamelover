import "server-only";
import { isSupabaseConfigured } from "@/lib/env";
import { publicClient } from "@/lib/supabase/public";
import { demoAds, demoCampaigns, demoEvents, demoProducts, demoSettings } from "@/lib/demo";
import type { Ad, Campaign, GameEvent, Product, Score, Settings } from "@/lib/types";

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  if (!isSupabaseConfigured) return fallback;
  try {
    return await fn();
  } catch (e) {
    console.error("[data]", e);
    return fallback;
  }
}

const num = (v: unknown) => (v == null ? null : Number(v));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const normProduct = (p: any): Product => ({ ...p, price: Number(p.price), old_price: num(p.old_price) });

export const getSettings = () =>
  safe<Settings>(async () => {
    const { data, error } = await publicClient().from("settings").select("*").eq("id", 1).single();
    if (error) throw error;
    const filled = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== null && v !== ""));
    return { ...demoSettings, social_webhook_url: null, ...filled } as Settings;
  }, demoSettings);

export const getProducts = (opts: { featured?: boolean; category?: string } = {}) =>
  safe<Product[]>(
    async () => {
      let q = publicClient().from("products").select("*").eq("active", true).order("created_at", { ascending: false });
      if (opts.featured) q = q.eq("featured", true);
      if (opts.category) q = q.eq("category", opts.category);
      const { data, error } = await q;
      if (error) throw error;
      return data.map(normProduct);
    },
    demoProducts.filter((p) => (!opts.featured || p.featured) && (!opts.category || p.category === opts.category)),
  );

export const getProduct = (slug: string) =>
  safe<Product | null>(
    async () => {
      const { data } = await publicClient().from("products").select("*").eq("slug", slug).eq("active", true).maybeSingle();
      return data ? normProduct(data) : null;
    },
    demoProducts.find((p) => p.slug === slug) ?? null,
  );

export const getEvents = () =>
  safe<GameEvent[]>(async () => {
    const { data, error } = await publicClient()
      .from("events")
      .select("*")
      .eq("active", true)
      .gte("starts_at", new Date(Date.now() - 6 * 3600e3).toISOString())
      .order("starts_at");
    if (error) throw error;
    return data;
  }, demoEvents);

export const getCampaigns = (featuredOnly = false) =>
  safe<Campaign[]>(
    async () => {
      let q = publicClient().from("campaigns").select("*").eq("active", true).order("created_at", { ascending: false });
      if (featuredOnly) q = q.eq("featured", true);
      const { data, error } = await q;
      if (error) throw error;
      const now = Date.now();
      return data.filter((c) => !c.ends_at || new Date(c.ends_at).getTime() > now);
    },
    demoCampaigns.filter((c) => !featuredOnly || c.featured),
  );

export const getAds = (placement: string) =>
  safe<Ad[]>(async () => {
    const { data, error } = await publicClient().from("ads").select("*").eq("active", true).eq("placement", placement).order("sort");
    if (error) throw error;
    return data;
  }, demoAds.filter((a) => a.placement === placement));

export const getTopScores = (game: string, limit = 10) =>
  safe<Score[]>(async () => {
    const { data, error } = await publicClient()
      .from("scores")
      .select("*")
      .eq("game", game)
      .order("score", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  }, []);
