import Link from "next/link";
import { ArrowRight, Bell, Gamepad2, Repeat, ShieldCheck, Truck } from "lucide-react";
import { AdCarousel, Marquee } from "@/components/AdCarousel";
import { CampaignCard, EventCard, GameCard } from "@/components/Cards";
import { Hero } from "@/components/Hero";
import { NewsletterForm } from "@/components/NewsletterForm";
import { ProductCard } from "@/components/ProductCard";
import { SocialLinks } from "@/components/SocialIcons";
import { Reveal, SectionTitle } from "@/components/ui";
import { GAMES } from "@/games/registry";
import { getAds, getCampaigns, getEvents, getProducts, getSettings } from "@/lib/data";

export const revalidate = 60;

export default async function Home() {
  const [products, featured, campaigns, events, ads, settings] = await Promise.all([
    getProducts(),
    getProducts({ featured: true }),
    getCampaigns(true),
    getEvents(),
    getAds("home"),
    getSettings(),
  ]);

  return (
    <>
      <Hero stats={{ products: products.length, events: events.length, campaigns: campaigns.length }} />

      <div className="relative z-10 -mt-6 mb-24">
        <Marquee items={["Yeni Nesil Konsollar", "Çorum İçi Aynı Gün Teslimat", "Turnuvalar", "Takas Fırsatı", "Oyna & Kazan", "Orijinal Ürün Garantisi"]} />
      </div>

      {ads.length > 0 && (
        <section className="container-x mb-28">
          <Reveal>
            <AdCarousel ads={ads} />
          </Reveal>
        </section>
      )}

      {campaigns.length > 0 && (
        <section className="container-x mb-32">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionTitle kicker="Sıcak fırsatlar" title={<>Çorum&apos;un <span className="text-gradient">en büyük</span> kampanyaları</>} />
            <Link href="/kampanyalar" className="btn-ghost mb-10">
              Tümü <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {campaigns.slice(0, 3).map((c, i) => (
              <div key={c.id} className={i === 0 ? "lg:row-span-2" : ""}>
                <CampaignCard c={c} index={i} large={i === 0} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="container-x mb-32">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionTitle kicker="Vitrin" title={<>Öne çıkan <span className="text-gradient">ürünler</span></>} sub="Konsoldan kulaklığa, oyuncuların en çok sevdiği ürünler — stoklar sınırlı." />
          <Link href="/urunler" className="btn-ghost mb-10">
            Mağazaya git <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {(featured.length ? featured : products).slice(0, 8).map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      </section>

      <section className="container-x mb-32">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { Icon: Truck, t: "Aynı gün teslimat", d: "Çorum içi kurye ile kapına kadar." },
            { Icon: ShieldCheck, t: "Orijinal & garantili", d: "Tüm ürünler resmi distribütör garantili." },
            { Icon: Repeat, t: "Takas imkânı", d: "Eski konsolunu getir, yeniye geç." },
            { Icon: Gamepad2, t: "Dene, sonra al", d: "Mağazada ürünleri deneyimle." },
          ].map(({ Icon, t, d }, i) => (
            <Reveal key={t} delay={i * 0.08}>
              <div className="glass group h-full rounded-2xl p-6 transition hover:-translate-y-1 hover:border-neon-violet/40">
                <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-neon-violet/30 to-neon-cyan/30 transition group-hover:scale-110 group-hover:rotate-6">
                  <Icon className="h-6 w-6 text-neon-cyan" />
                </div>
                <h3 className="font-display text-lg font-semibold text-white">{t}</h3>
                <p className="mt-1 text-sm text-slate-400">{d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="relative mb-32 overflow-hidden py-24">
        <div className="absolute inset-0 -skew-y-3 bg-gradient-to-br from-neon-violet/15 via-ink-900 to-neon-cyan/10" />
        <div className="container-x relative">
          <SectionTitle
            center
            kicker="Oyun Salonu"
            title={<>Oyna, rekor kır, <span className="text-gradient">indirim kazan</span></>}
            sub="Tarayıcında anında oynanan ücretsiz mini oyunlar. Çorum liderlik tablosuna adını yazdır, yüksek skora özel indirim kodunu kap!"
          />
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {GAMES.map((g, i) => (
              <GameCard key={g.slug} g={g} index={i} featured={i === 0} />
            ))}
          </div>
        </div>
      </section>

      {events.length > 0 && (
        <section className="container-x mb-32">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionTitle kicker="Etkinlikler" title={<>Yaklaşan <span className="text-gradient">turnuvalar</span></>} />
            <Link href="/etkinlikler" className="btn-ghost mb-10">
              Tüm etkinlikler <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-6">
            {events.slice(0, 2).map((e, i) => (
              <EventCard key={e.id} e={e} index={i} />
            ))}
          </div>
        </section>
      )}

      <section className="container-x">
        <Reveal>
          <div className="neon-border relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-ink-800 to-ink-900 p-8 sm:p-14">
            <div className="absolute -right-20 -top-20 h-72 w-72 animate-blob rounded-full bg-neon-pink/30 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-72 w-72 animate-blob rounded-full bg-neon-violet/30 blur-3xl [animation-delay:-8s]" />
            <div className="relative grid items-center gap-10 lg:grid-cols-2">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-neon-pink/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-neon-pink">
                  <Bell className="h-3.5 w-3.5" /> Fırsat Bülteni
                </div>
                <h2 className="font-display text-3xl font-bold text-white sm:text-5xl">
                  Çorum&apos;un en büyük fırsatları <span className="text-gradient">e-postana</span> gelsin
                </h2>
                <p className="mt-4 text-slate-300">Haftalık kampanyalar, erken turnuva kaydı ve sadece abonelere özel indirim kodları.</p>
              </div>
              <div className="space-y-6">
                <NewsletterForm />
                <div>
                  <p className="mb-3 text-sm text-slate-400">Bizi sosyal medyada takip et:</p>
                  <SocialLinks settings={settings} />
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
