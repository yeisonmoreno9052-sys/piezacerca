"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PESTANAS = [
  { href: "/admin/motos", texto: "Motos" },
  { href: "/admin/piezas", texto: "Piezas" },
  { href: "/admin/tiendas", texto: "Tiendas" },
  { href: "/admin/numeros", texto: "Números" },
  { href: "/admin/preguntas", texto: "Preguntas" },
];

export function Pestanas() {
  const ruta = usePathname();

  return (
    <nav className="mt-5 flex gap-1">
      {PESTANAS.map(({ href, texto }) => {
        const activa = ruta.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={activa ? "page" : undefined}
            className={`flex min-h-11 flex-1 items-center justify-center rounded-xl text-xs font-medium sm:text-sm ${
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
