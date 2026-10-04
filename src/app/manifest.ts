import type { MetadataRoute } from "next";

// Hace que PiezaCerca se pueda instalar en el celular como una app (con su ícono y su nombre).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PiezaCerca",
    short_name: "PiezaCerca",
    description: "Repuestos de moto en tiendas cercanas de Medellín, sin llamar a cada una.",
    lang: "es-CO",
    start_url: "/",
    display: "standalone",
    background_color: "#F5F3EE",
    theme_color: "#1B1F24",
    icons: [
      { src: "/icono/192", sizes: "192x192", type: "image/png" },
      { src: "/icono/512", sizes: "512x512", type: "image/png" },
      { src: "/icono/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
