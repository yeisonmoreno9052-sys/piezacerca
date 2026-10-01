import { leerUbicacion } from "@/lib/ubicacion";

// TEMPORAL: prueba la lectura de ubicación en los servidores de Vercel. Borrar después.
export async function GET() {
  const enlace = "https://maps.app.goo.gl/zj4ZBP7TFbyNR4XL7?g_st=ac";
  return Response.json({
    soloEnlace: await leerUbicacion(enlace),
    conTexto: await leerUbicacion(`Cl. 64f #97A-28, Pajarito, Medellín ${enlace}`),
  });
}
