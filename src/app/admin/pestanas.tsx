"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PESTANAS = [
  { href: "/admin/motos", texto: "Motos" },
  { href: "/admin/piezas", texto: "Piezas" },
  { href: "/admin/tiendas", texto: "Tiendas" },
];

export function Pestanas() {
  const ruta = usePathname();

  return (
    <nav className="mt-5 flex gap-2">
      {PESTANAS.map(({ href, texto }) => {
        const activa = ruta.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={activa ? "page" : undefined}
            className={`flex min-h-11 flex-1 items-center justify-center rounded-xl text-sm font-medium ${
              activa ? "bg-tinta text-white" : "bg-white"
            }`}
          >
            {texto}
          </Link>
        );
      })}
    </nav>
  );
}
