import type { Metadata } from "next";
import { Gift } from "lucide-react";
import { AdCarousel } from "@/components/AdCarousel";
import { GameCard } from "@/components/Cards";
import { Reveal, SectionTitle } from "@/components/ui";
import { GAMES } from "@/games/registry";
import { getAds } from "@/lib/data";

export const revalidate = 60;
export const metadata: Metadata = { title: "Oyun Salonu", description: "Ücretsiz tarayıcı oyunları oyna, Çorum liderlik tablosuna gir, indirim kazan." };

export default async function GamesPage() {
  const ads = await getAds("games");
  return (
    <div className="container-x pt-10">
      <SectionTitle
        center
        kicker="Oyun Salonu"
        title={<>Bir el daha <span className="text-gradient">oynayalım mı?</span></>}
        sub="İndirme yok, üyelik yok. Tıkla ve oyna. Rekorunu liderlik tablosuna yazdır, eşiği geçersen indirim kodu senin!"
      />
      <Reveal className="mx-auto mb-12 flex max-w-xl items-center justify-center gap-3 rounded-2xl border border-neon-pink/30 bg-neon-pink/10 px-5 py-3 text-sm text-pink-200">
        <Gift className="h-5 w-5 shrink-0 text-neon-pink" /> Her oyunda yüksek skor = mağazada geçerli indirim kodu 🎁
      </Reveal>
      <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
        {GAMES.map((g, i) => (
          <GameCard key={g.slug} g={g} index={i} />
        ))}
      </div>
      {ads.length > 0 && (
        <Reveal className="mt-20">
          <AdCarousel ads={ads} className="h-[260px]" />
        </Reveal>
      )}
    </div>
  );
}
