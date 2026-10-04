import { ImageResponse } from "next/og";

// Ícono de la app (para instalarla y para las notificaciones): "PC" blanco y naranja sobre fondo oscuro.
const TAMANOS = new Set([96, 180, 192, 512]);

export async function GET(_request: Request, { params }: RouteContext<"/icono/[tamano]">) {
  const { tamano } = await params;
  const lado = Number(tamano);
  if (!TAMANOS.has(lado)) return new Response("No existe", { status: 404 });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1B1F24",
          color: "#F5F3EE",
          fontSize: lado * 0.42,
          fontWeight: 800,
          letterSpacing: -lado * 0.02,
        }}
      >
        P<span style={{ color: "#E0621B" }}>C</span>
      </div>
    ),
    { width: lado, height: lado, headers: { "Cache-Control": "public, max-age=31536000, immutable" } },
  );
}
