// Formatos para mostrar en la app (español de Colombia).

export function formatoDistancia(metros: number) {
  if (metros < 1000) return `${Math.max(50, Math.round(metros / 50) * 50)} m`;
  return `${(metros / 1000).toLocaleString("es-CO", { maximumFractionDigits: 1 })} km`;
}

export function formatoTiempoRespuesta(segundos: number | null) {
  if (!segundos) return null;
  const minutos = Math.max(1, Math.round(segundos / 60));
  return `responde en ~${minutos} min`;
}

// Abre Google Maps (o la app de mapas del celular) con la ruta hasta ese punto.
export function enlaceComoLlegar(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
