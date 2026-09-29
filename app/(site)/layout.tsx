import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { AuroraBackground, CursorGlow } from "@/components/ui";
import { SocialIcon } from "@/components/SocialIcons";
import { getSettings } from "@/lib/data";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <>
      <AuroraBackground />
      <CursorGlow />
      <Navbar announcement={settings.announcement} />
      <main className="relative z-10">{children}</main>
      <Footer settings={settings} />
      {settings.whatsapp && (
        <a
          href={`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent("Merhaba Game Lover! ")}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp ile yaz"
          className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-green-500 text-white shadow-[0_0_30px_rgba(34,197,94,0.6)] transition hover:scale-110"
        >
          <span className="absolute inset-0 animate-ping rounded-full bg-green-500 opacity-30" />
          <SocialIcon name="whatsapp" className="relative h-7 w-7" />
        </a>
      )}
    </>
  );
}
