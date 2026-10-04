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

// Pesos colombianos: 85000 -> "$ 85.000"
export function formatoPesos(valor: number) {
  return `$ ${Math.round(valor).toLocaleString("es-CO")}`;
}

// Enlace de WhatsApp a partir de "+573001234567", con un mensaje ya escrito.
export function enlaceWhatsapp(numero: string, mensaje: string) {
  return `https://wa.me/${numero.replace(/\D/g, "")}?text=${encodeURIComponent(mensaje)}`;
}

// Abre Google Maps (o la app de mapas del celular) con la ruta hasta ese punto.
export function enlaceComoLlegar(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
