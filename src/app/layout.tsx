import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { obtenerSesion } from "@/lib/sesion";
import { AvisoTienda } from "./aviso-tienda";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PiezaCerca",
  description:
    "Encuentra repuestos de moto en tiendas cercanas de Medellín sin llamar a cada una.",
};

export const viewport: Viewport = {
  themeColor: "#F5F3EE",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { tiendaId } = await obtenerSesion();

  return (
    <html
      lang="es-CO"
      className={`${bricolage.variable} ${figtree.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {tiendaId && <AvisoTienda tiendaId={tiendaId} />}
        {children}
      </body>
    </html>
  );
}
