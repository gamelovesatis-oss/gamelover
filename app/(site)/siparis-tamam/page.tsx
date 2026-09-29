import Link from "next/link";
import { Confetti } from "@/components/Confetti";

export const metadata = { title: "Siparişin alındı" };

export default async function OrderDone({ searchParams }: { searchParams: Promise<{ no?: string }> }) {
  const { no } = await searchParams;
  return (
    <div className="container-x grid min-h-[70vh] place-items-center pt-10 text-center">
      <Confetti />
      <div className="neon-border relative max-w-lg rounded-[2rem] bg-ink-900/80 p-10 backdrop-blur">
        <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-neon-lime to-emerald-500 text-4xl shadow-[0_0_50px_rgba(163,230,53,0.6)]">✓</div>
        <h1 className="font-display text-3xl font-bold text-white">Siparişin alındı!</h1>
        {no && (
          <p className="mt-3 text-slate-300">
            Sipariş numaran: <span className="font-display text-xl font-bold text-neon-cyan">#{no}</span>
          </p>
        )}
        <p className="mt-4 text-slate-400">En kısa sürede seni arayarak siparişini onaylayacağız. E-posta verdiysen detaylar gelen kutunda.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/oyunlar" className="btn-primary">
            Beklerken oyna 🎮
          </Link>
          <Link href="/" className="btn-ghost">
            Ana sayfa
          </Link>
        </div>
      </div>
    </div>
  );
}
