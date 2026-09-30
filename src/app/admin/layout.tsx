import type { Metadata } from "next";
import Link from "next/link";
import { exigirAdmin } from "@/lib/admin";
import { Pestanas } from "./pestanas";

export const metadata: Metadata = {
  title: "Administrador · PiezaCerca",
};

export default async function LayoutAdmin({ children }: LayoutProps<"/admin">) {
  await exigirAdmin();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-6">
      <header className="flex items-center justify-between">
        <Link href="/" className="font-titulo text-2xl font-bold tracking-tight">
          Pieza<span className="text-naranja">Cerca</span>
        </Link>
        <span className="rounded-full bg-tienda px-3 py-1 text-xs font-medium text-white">
          Administrador
        </span>
      </header>

      <Pestanas />

      <div className="mt-6 flex-1">{children}</div>
    </main>
  );
}
