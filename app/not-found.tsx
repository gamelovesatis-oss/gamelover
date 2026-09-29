import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-ink-950 p-6 text-center">
      <div>
        <div className="text-gradient font-display text-[9rem] font-bold leading-none">404</div>
        <h1 className="mt-2 font-display text-2xl font-bold text-white">GAME OVER — sayfa bulunamadı</h1>
        <p className="mt-2 text-slate-400">Ama pes etmek yok. Devam etmek için bir tuşa bas… ya da şuna tıkla:</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/" className="btn-primary">
            Ana sayfa
          </Link>
          <Link href="/oyunlar" className="btn-ghost">
            Oyun oyna
          </Link>
        </div>
      </div>
    </div>
  );
}
