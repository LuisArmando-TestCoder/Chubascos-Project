import type { Metadata, Viewport } from "next";
import { Newsreader, Geist, Geist_Mono } from "next/font/google";
import "@/styles/globals.scss";
import { LenisProvider } from "@/components/organisms/LenisProvider";
import { Header } from "@/components/organisms/Header/Header";
import { FluidMount } from "@/components/organisms/FluidLayer/FluidMount";
import { RainGauge } from "@/components/organisms/RainGauge/RainGauge";

// Display + poem face: an optical-size serif built for long reading.
const display = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-display",
  display: "swap",
});
const ui = Geist({ subsets: ["latin"], variable: "--font-ui", display: "swap" });
const hud = Geist_Mono({ subsets: ["latin"], variable: "--font-hud", display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "Chubascos | Lluvias repentinas dejando charcos",
    template: "%s | Chubascos",
  },
  description: "Plataforma para poetas, artistas y alquimistas digitales.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://chubascos.vercel.app"),
  openGraph: {
    siteName: "Chubascos",
    locale: "es_CR",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#06070a",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${display.variable} ${ui.variable} ${hud.variable}`}>
      <body>
        <a href="#contenido" className="skip-link">Saltar al contenido</a>
        <FluidMount />
        <LenisProvider>
          <Header />
          <div id="contenido" tabIndex={-1}>
            {children}
          </div>
          <RainGauge />
        </LenisProvider>
      </body>
    </html>
  );
}
