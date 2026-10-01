// TEMPORAL: para ver qué responde Google a los servidores de Vercel. Borrar después.
export async function GET() {
  const pasos: { status: number; location: string | null }[] = [];
  let url = "https://maps.app.goo.gl/zj4ZBP7TFbyNR4XL7?g_st=ac";
  for (let i = 0; i < 4; i++) {
    const r = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(5000) });
    const location = r.headers.get("location");
    pasos.push({ status: r.status, location: location?.slice(0, 300) ?? null });
    if (!location) break;
    url = new URL(location, url).toString();
  }
  return Response.json(pasos);
}
