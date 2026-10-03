import { ImageResponse } from "next/og";
import { MODULE_BRAND } from "@/core/modules/brand";

/**
 * The home-screen icon for one place: its accent color and its mark. Drawn
 * on request so no image files need keeping. `size` 64 to 1024; `maskable`
 * leaves a safe margin for Android's shapes.
 */
export async function GET(req: Request, { params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  const brand = MODULE_BRAND[moduleId];
  if (!brand) return new Response("Not found", { status: 404 });
  const url = new URL(req.url);
  const size = Math.max(64, Math.min(1024, Number(url.searchParams.get("size") ?? 512) || 512));
  const maskable = url.searchParams.get("maskable") === "1";
  const inner = maskable ? size * 0.62 : size * 0.78;
  return new ImageResponse(
    (
      <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: brand.accent, borderRadius: maskable ? 0 : size * 0.22 }}>
        <div style={{ width: inner, height: inner, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: inner / 2, background: "rgba(255,255,255,0.14)", border: `${Math.max(2, size * 0.012)}px solid rgba(255,255,255,0.55)` }}>
          <span style={{ color: "#FFFDF7", fontSize: inner * (brand.mark.length > 1 ? 0.42 : 0.56), fontWeight: 800, letterSpacing: -inner * 0.01, fontFamily: "sans-serif" }}>{brand.mark}</span>
        </div>
      </div>
    ),
    { width: size, height: size, headers: { "cache-control": "public, max-age=86400" } },
  );
}
