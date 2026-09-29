import type { Metadata } from "next";
import { AdCarousel } from "@/components/AdCarousel";
import { ProductGrid } from "@/components/ProductGrid";
import { Reveal, SectionTitle } from "@/components/ui";
import { getAds, getProducts } from "@/lib/data";

export const revalidate = 60;
export const metadata: Metadata = { title: "Mağaza", description: "Konsollar, oyunlar ve oyuncu aksesuarları — Çorum içi aynı gün teslimat." };

export default async function ProductsPage() {
  const [products, ads] = await Promise.all([getProducts(), getAds("products")]);
  return (
    <div className="container-x pt-10">
      <SectionTitle kicker="Mağaza" title={<>Oyun <span className="text-gradient">cephaneliği</span></>} sub="Aradığın her şey burada. Sepete ekle, Çorum içinde aynı gün kapında." />
      {ads.length > 0 && (
        <Reveal className="mb-12">
          <AdCarousel ads={ads} className="h-[260px] sm:h-[300px]" />
        </Reveal>
      )}
      <ProductGrid products={products} />
    </div>
  );
}
