export type GameMeta = {
  slug: string;
  title: string;
  tagline: string;
  controls: string;
  gradient: string;
  emoji: string;
  maxScore: number; // basit hile koruması
  rewardFactor: number; // ayarlardaki ödül puanı × bu katsayı = bu oyunun eşiği
};

export const GAMES: GameMeta[] = [
  { slug: "uzay-savasi", title: "Uzay Savaşı", tagline: "Galaksiyi istilacılardan koru!", controls: "Fare / parmak ile hareket et, ateş otomatik.", gradient: "from-indigo-600 via-violet-600 to-fuchsia-600", emoji: "🚀", maxScore: 200000, rewardFactor: 4 },
  { slug: "neon-yilan", title: "Neon Yılan", tagline: "Klasik yılan, neon ışıklar altında.", controls: "Yön tuşları / WASD veya kaydır.", gradient: "from-emerald-500 via-teal-500 to-cyan-500", emoji: "🐍", maxScore: 50000, rewardFactor: 0.4 },
  { slug: "2048", title: "2048", tagline: "Sayıları birleştir, 2048'e ulaş.", controls: "Yön tuşları veya kaydır.", gradient: "from-amber-500 via-orange-500 to-rose-500", emoji: "🔢", maxScore: 1000000, rewardFactor: 4 },
  { slug: "tugla-kirici", title: "Tuğla Kırıcı", tagline: "Topu sektir, tüm tuğlaları yık.", controls: "Fare / parmak veya ← → tuşları.", gradient: "from-pink-500 via-rose-500 to-red-500", emoji: "🧱", maxScore: 100000, rewardFactor: 1 },
  { slug: "neon-kus", title: "Neon Kuş", tagline: "Borulardan geç, ne kadar uzağa gidebilirsin?", controls: "Tıkla / dokun / Boşluk ile zıpla.", gradient: "from-sky-500 via-cyan-500 to-blue-600", emoji: "🐦", maxScore: 5000, rewardFactor: 0.04 },
  { slug: "hafiza", title: "Oyuncu Hafızası", tagline: "Eşleri bul, hafızanı test et.", controls: "Kartlara tıkla, eşleri bul.", gradient: "from-violet-500 via-purple-500 to-indigo-500", emoji: "🧠", maxScore: 5000, rewardFactor: 2.4 },
];

export const getGame = (slug: string) => GAMES.find((g) => g.slug === slug);
