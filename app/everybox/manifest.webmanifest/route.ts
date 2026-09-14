import type { MetadataRoute } from "next";

/**
 * Every Box's own web app manifest, served from its own path so it can sit
 * beside the rest of the site. Scope is limited to /everybox/.
 */
export function GET() {
  const manifest: MetadataRoute.Manifest = {
    id: "/everybox",
    name: "Every Box",
    short_name: "Every Box",
    description: "A calm, shared view of how recently each part of life has been tended.",
    start_url: "/everybox",
    scope: "/everybox/",
    display: "standalone",
    background_color: "#f5f2e8",
    theme_color: "#f5f2e8",
    orientation: "portrait",
    categories: ["lifestyle", "productivity"],
    icons: [
      { src: "/everybox/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/everybox/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/everybox/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Glance", short_name: "Glance", url: "/everybox/widget", description: "Just the state of every box" },
      { name: "Weekly review", short_name: "Review", url: "/everybox/review" },
      { name: "Commitments", short_name: "Commitments", url: "/everybox/commitments" },
    ],
  };
  return Response.json(manifest, {
    headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" },
  });
}
