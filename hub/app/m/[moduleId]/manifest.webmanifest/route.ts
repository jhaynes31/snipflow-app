import { APP_DISPLAY_NAME } from "@/core/config";
import { MODULE_BRAND } from "@/core/modules/brand";
import { MODULE_NAMES } from "@/core/modules/names";

/**
 * A web app manifest for one place on its own (2026-10-03, Jen's ask): add
 * Every Box, or Tend, or any other place to the phone's home screen as its
 * own icon that opens straight into it. The browser reads this manifest
 * from the place's own pages (app/[moduleId]/layout.tsx).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  const brand = MODULE_BRAND[moduleId];
  const name = MODULE_NAMES[moduleId];
  if (!brand || !name) return new Response("Not found", { status: 404 });
  const manifest = {
    id: `/${moduleId}`,
    name: `${name} · ${APP_DISPLAY_NAME}`,
    short_name: name,
    description: `${name}, from ${APP_DISPLAY_NAME}.`,
    start_url: `/${moduleId}`,
    scope: "/",
    display: "standalone",
    background_color: "#F6F1E7",
    theme_color: brand.accent,
    orientation: "portrait",
    icons: [
      { src: `/m/${moduleId}/icon?size=192`, sizes: "192x192", type: "image/png" },
      { src: `/m/${moduleId}/icon?size=512`, sizes: "512x512", type: "image/png" },
      { src: `/m/${moduleId}/icon?size=512&maskable=1`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return new Response(JSON.stringify(manifest), { headers: { "content-type": "application/manifest+json", "cache-control": "public, max-age=3600" } });
}
