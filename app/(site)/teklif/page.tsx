import type { Metadata } from "next";
import { OfferForm } from "@/components/OfferForm";
import { Reveal, SectionTitle } from "@/components/ui";

export const metadata: Metadata = {
  title: "Takas & Teklif",
  description: "Eski konsolunu takasla, toplu alım veya kurumsal teklif iste, etkinliklere kayıt ol.",
};

export default async function OfferPage({ searchParams }: { searchParams: Promise<{ tur?: string; etkinlik?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="container-x pt-10">
      <div className="grid gap-12 lg:grid-cols-2">
        <div>
          <SectionTitle kicker="Takas & Teklif" title={<>Sen söyle, <span className="text-gradient">biz teklif verelim</span></>} sub="Eski konsolunu mu satmak istiyorsun? Okulun, kafen ya da şirketin için toplu alım mı? Bir turnuvaya mı katılacaksın? Formu doldur, en iyi teklifi hemen iletelim." />
          <Reveal className="space-y-4">
            {[
              ["🔁", "Takas", "PS4, Xbox One, Switch… Eski cihazını getir, yenisinden düş."],
              ["💰", "2. el satış", "Cihazını anında nakit değerle satın alalım."],
              ["🏢", "Toplu / kurumsal", "Oyun kafe, okul ve şirketlere özel fiyatlar."],
              ["🏆", "Etkinlik kaydı", "Turnuvalara ve etkinliklere yerini ayırt."],
            ].map(([e, t, d]) => (
              <div key={t} className="glass flex gap-4 rounded-2xl p-4">
                <div className="text-3xl">{e}</div>
                <div>
                  <div className="font-display font-semibold text-white">{t}</div>
                  <div className="text-sm text-slate-400">{d}</div>
                </div>
              </div>
            ))}
          </Reveal>
        </div>
        <Reveal delay={0.1}>
          <OfferForm defaultKind={sp.tur} defaultMessage={sp.etkinlik ? `"${sp.etkinlik}" etkinliğine kayıt olmak istiyorum.` : ""} />
        </Reveal>
      </div>
    </div>
  );
}
