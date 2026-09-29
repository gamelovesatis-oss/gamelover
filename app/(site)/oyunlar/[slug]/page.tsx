import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { GameCard } from "@/components/Cards";
import { ShareButtons } from "@/components/ShareButtons";
import { GameShell } from "@/games/GameShell";
import { GAMES, getGame } from "@/games/registry";
import { getSettings, getTopScores } from "@/lib/data";

export const revalidate = 30;

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return GAMES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = getGame((await params).slug);
  return g ? { title: `${g.title} — Ücretsiz Oyna`, description: g.tagline } : {};
}

export default async function GamePage({ params }: Props) {
  const game = getGame((await params).slug);
  if (!game) notFound();
  const [settings, scores] = await Promise.all([getSettings(), getTopScores(game.slug)]);

  return (
    <div className="container-x pt-8">
      <Link href="/oyunlar" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Oyun salonu
      </Link>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold text-white sm:text-5xl">
            {game.emoji} {game.title}
          </h1>
          <p className="mt-2 text-slate-400">{game.tagline}</p>
        </div>
        <ShareButtons url={`/oyunlar/${game.slug}`} text={`${game.title} oynuyorum, rekorumu geçebilir misin? 🎮 Game Lover Çorum`} />
      </div>

      <GameShell game={game} rewardCode={settings.reward_code} rewardScore={settings.reward_score ?? 500} initialScores={scores} />

      <section className="mt-24">
        <h2 className="mb-8 font-display text-2xl font-bold text-white">Diğer oyunlar</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {GAMES.filter((g) => g.slug !== game.slug).map((g, i) => (
            <GameCard key={g.slug} g={g} index={i} />
          ))}
        </div>
      </section>
    </div>
  );
}
