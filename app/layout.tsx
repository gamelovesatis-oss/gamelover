import type { Metadata, Viewport } from "next";
import { Chakra_Petch, Inter } from "next/font/google";
import { CartProvider } from "@/components/CartProvider";
import { SITE_URL } from "@/lib/env";
import "./globals.css";

const display = Chakra_Petch({ subsets: ["latin", "latin-ext"], weight: ["500", "600", "700"], variable: "--font-display" });
const sans = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Game Lover · Çorum'un Oyun Dünyası", template: "%s · Game Lover Çorum" },
  description: "Çorum'un en büyük oyun mağazası: konsollar, oyunlar, aksesuarlar, turnuvalar, kampanyalar ve tarayıcıda oynanan ücretsiz mini oyunlar.",
  keywords: ["Çorum oyun mağazası", "PS5 Çorum", "Xbox Çorum", "oyun turnuvası Çorum", "Game Lover"],
  openGraph: { type: "website", locale: "tr_TR", siteName: "Game Lover", images: ["/og.svg"] },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#05040b" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${display.variable} ${sans.variable}`}>
      <body className="noise">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
