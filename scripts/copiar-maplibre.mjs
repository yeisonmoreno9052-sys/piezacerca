// Copia los archivos que MapLibre usa para dibujar el mapa en segundo plano ("worker")
// a public/maplibre/, para que la app los sirva. Next.js no los incluye solo.
// Se corre antes de "dev" y de "build" (ver package.json).
import { copyFileSync, mkdirSync } from "node:fs";

const origen = "node_modules/maplibre-gl/dist";
const destino = "public/maplibre";
mkdirSync(destino, { recursive: true });
for (const archivo of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  copyFileSync(`${origen}/${archivo}`, `${destino}/${archivo}`);
}
console.log("Archivos del mapa copiados a public/maplibre/");
