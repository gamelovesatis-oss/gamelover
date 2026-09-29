import type { Metadata } from "next";
import { EventCard } from "@/components/Cards";
import { SectionTitle } from "@/components/ui";
import { getEvents } from "@/lib/data";

export const revalidate = 60;
export const metadata: Metadata = { title: "Etkinlikler & Turnuvalar", description: "Çorum'daki oyun turnuvaları, retro geceler ve oyuncu buluşmaları." };

export default async function EventsPage() {
  const events = await getEvents();
  return (
    <div className="container-x pt-10">
      <SectionTitle kicker="Etkinlikler" title={<>Arenaya <span className="text-gradient">hazır mısın?</span></>} sub="Turnuvalar, retro geceler, lansman partileri. Yerini ayırt, arkadaşlarını getir." />
      {events.length === 0 ? (
        <p className="py-20 text-center text-slate-400">Yakında yeni etkinlikler duyurulacak!</p>
      ) : (
        <div className="relative space-y-8 before:absolute before:bottom-0 before:left-[-18px] before:top-0 before:hidden before:w-px before:bg-gradient-to-b before:from-neon-violet before:via-neon-cyan before:to-transparent xl:before:block">
          {events.map((e, i) => (
            <EventCard key={e.id} e={e} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
