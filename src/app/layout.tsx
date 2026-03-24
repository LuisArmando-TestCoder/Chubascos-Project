import type { Metadata } from "next";
import "@/styles/globals.scss";
import { LenisProvider } from "@/components/organisms/LenisProvider";
import { Header } from "@/components/organisms/Header/Header";

export const metadata: Metadata = {
  title: "Chubascos | Lluvias repentinas dejando charcos",
  description: "Plataforma para poetas, artistas y alquimistas digitales.",
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
