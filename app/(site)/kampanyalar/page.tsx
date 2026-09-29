import type { Metadata } from "next";
import { CampaignCard } from "@/components/Cards";
import { NewsletterForm } from "@/components/NewsletterForm";
import { Reveal, SectionTitle } from "@/components/ui";
import { getCampaigns } from "@/lib/data";

export const revalidate = 60;
export const metadata: Metadata = { title: "Kampanyalar", description: "Çorum'un en büyük oyun kampanyaları, kupon kodları ve indirimler." };

export default async function CampaignsPage() {
  const campaigns = await getCampaigns();
  return (
    <div className="container-x pt-10">
      <SectionTitle kicker="Kampanyalar" title={<>Kaçırılmayacak <span className="text-gradient">fırsatlar</span></>} sub="Kupon kodunu kopyala, sepette ya da mağazada kullan. Süre dolmadan yetiş!" />
      {campaigns.length === 0 ? (
        <p className="py-20 text-center text-slate-400">Şu an aktif kampanya yok. Bültene abone ol, ilk sen haberdar ol!</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {campaigns.map((c, i) => (
            <CampaignCard key={c.id} c={c} index={i} large={i === 0} />
          ))}
        </div>
      )}
      <Reveal className="glass mx-auto mt-20 max-w-2xl rounded-3xl p-8 text-center">
        <h3 className="font-display text-2xl font-bold text-white">Yeni kampanyalar e-postana gelsin</h3>
        <p className="mb-6 mt-2 text-slate-400">Abonelere özel ekstra indirim kodları da cabası.</p>
        <NewsletterForm />
      </Reveal>
    </div>
  );
}
