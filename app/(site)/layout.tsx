import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { AuroraBackground, CursorGlow } from "@/components/ui";
import { WhatsAppButton } from "@/components/WhatsAppButton";
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
      {settings.whatsapp && <WhatsAppButton number={settings.whatsapp} />}
    </>
  );
}
