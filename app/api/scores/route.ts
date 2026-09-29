import { NextResponse } from "next/server";
import { getGame } from "@/games/registry";
import { isSupabaseConfigured } from "@/lib/env";
import { serviceClient } from "@/lib/supabase/admin";

const BAD = /(http|www\.|\.com|<|>)/i;

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const game = getGame(String(b.game ?? ""));
  const player = String(b.player ?? "").trim().slice(0, 20);
  const score = Math.floor(Number(b.score));
  if (!game || player.length < 2 || BAD.test(player) || !Number.isFinite(score) || score <= 0 || score > game.maxScore)
    return NextResponse.json({ error: "Geçersiz skor." }, { status: 400 });

  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    return NextResponse.json({ scores: [{ id: "demo", game: game.slug, player, score, created_at: new Date().toISOString() }] });

  const db = serviceClient();
  await db.from("scores").insert({ game: game.slug, player, score });
  const { data } = await db.from("scores").select("*").eq("game", game.slug).order("score", { ascending: false }).limit(10);
  return NextResponse.json({ scores: data ?? [] });
}
