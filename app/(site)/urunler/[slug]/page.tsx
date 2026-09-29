import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, PackageCheck, ShieldCheck, Truck } from "lucide-react";
import { AddToCartButton, ProductCard } from "@/components/ProductCard";
import { ShareButtons } from "@/components/ShareButtons";
import { Reveal, SmartImage, TiltCard } from "@/components/ui";
import { getProduct, getProducts } from "@/lib/data";
import { discountPct, tl } from "@/lib/utils";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProduct((await params).slug);
  if (!p) return { title: "Ürün bulunamadı" };
  return { title: p.name, description: p.description, openGraph: { images: p.image_url ? [p.image_url] : [] } };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();
  const related = (await getProducts({ category: product.category })).filter((p) => p.id !== product.id).slice(0, 4);
  const pct = discountPct(product.price, product.old_price);

  return (
    <div className="container-x pt-8">
      <Link href="/urunler" className="mb-8 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Mağazaya dön
      </Link>
      <div className="grid gap-12 lg:grid-cols-2">
        <Reveal>
          <TiltCard className="rounded-[2rem]">
            <div className="neon-border relative aspect-square overflow-hidden rounded-[2rem] bg-ink-800">
              <SmartImage src={product.image_url} alt={product.name} className="h-full w-full" />
              {pct > 0 && <div className="chip absolute left-5 top-5 bg-neon-pink px-4 py-2 text-sm text-white shadow-[0_0_20px_#f472b6]">-%{pct} İNDİRİM</div>}
            </div>
          </TiltCard>
        </Reveal>
        <Reveal delay={0.15} className="flex flex-col">
          <div className="flex gap-2">
            <span className="chip bg-neon-violet/20 text-violet-300">{product.category}</span>
            {product.platform && <span className="chip bg-neon-cyan/15 text-neon-cyan">{product.platform}</span>}
          </div>
          <h1 className="mt-4 font-display text-4xl font-bold text-white sm:text-5xl">{product.name}</h1>
          <div className="mt-6 flex items-baseline gap-4">
            <span className="font-display text-5xl font-bold text-white">{tl(product.price)}</span>
            {pct > 0 && <span className="text-xl text-slate-500 line-through">{tl(product.old_price!)}</span>}
          </div>
          {pct > 0 && <div className="mt-2 text-sm font-semibold text-neon-lime">{tl(product.old_price! - product.price)} tasarruf ediyorsun!</div>}
          <p className="mt-6 whitespace-pre-line text-lg leading-relaxed text-slate-300">{product.description}</p>
          <div className="mt-6 text-sm">
            {product.stock > 5 ? (
              <span className="text-neon-lime">● Stokta var</span>
            ) : product.stock > 0 ? (
              <span className="animate-glow text-neon-amber">● Son {product.stock} ürün!</span>
            ) : (
              <span className="text-red-400">● Stokta yok</span>
            )}
          </div>
          <div className="mt-8">
            <AddToCartButton product={product} big />
          </div>
          <div className="mt-8 grid grid-cols-3 gap-3">
            {[
              { Icon: Truck, t: "Aynı gün kurye" },
              { Icon: ShieldCheck, t: "Orijinal ürün" },
              { Icon: PackageCheck, t: "Mağazadan teslim" },
            ].map(({ Icon, t }) => (
              <div key={t} className="glass rounded-xl p-3 text-center text-xs text-slate-300">
                <Icon className="mx-auto mb-1 h-5 w-5 text-neon-cyan" />
                {t}
              </div>
            ))}
          </div>
          <div className="mt-8 flex items-center gap-3 text-sm text-slate-400">
            Paylaş: <ShareButtons url={`/urunler/${product.slug}`} text={`${product.name} — ${tl(product.price)} | Game Lover Çorum`} />
          </div>
        </Reveal>
      </div>

      {related.length > 0 && (
        <section className="mt-28">
          <h2 className="mb-8 font-display text-3xl font-bold text-white">Bunlar da ilgini çekebilir</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
