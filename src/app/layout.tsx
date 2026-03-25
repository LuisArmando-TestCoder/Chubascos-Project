import type { Metadata } from "next";
import "@/styles/globals.scss";
import { LenisProvider } from "@/components/organisms/LenisProvider";
import { Header } from "@/components/organisms/Header/Header";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <LenisProvider>
          <Header />
          {children}
        </LenisProvider>
      </body>
    </html>
  );
}
