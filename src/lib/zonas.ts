// Zonas del piloto, para quien no quiere (o no puede) usar el GPS.
// Las coordenadas son el centro aproximado de cada zona: confirmarlas con el dueño.
export const ZONAS = [
  { id: "robledo", nombre: "Robledo", lat: 6.279, lng: -75.596 },
  { id: "san-cristobal", nombre: "San Cristóbal", lat: 6.2785, lng: -75.637 },
] as const;

export type Ubicacion = {
  tipo: "gps" | "zona";
  nombre: string;
  lat: number;
  lng: number;
};
