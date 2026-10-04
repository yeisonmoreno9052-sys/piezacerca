import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El "service worker" de las notificaciones (public/sw.js) nunca se guarda en caché,
  // para que los cambios lleguen de una vez a los celulares de las tiendas.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
