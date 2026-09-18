import type { MetadataRoute } from "next";
import { APP_DESCRIPTION, APP_DISPLAY_NAME, APP_SHORT_NAME } from "@/core/config";
import { LIGHT } from "@/core/theme/tokens";
import { COPY } from "@/core/copy/strings";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: APP_DISPLAY_NAME,
    short_name: APP_SHORT_NAME,
    description: APP_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: LIGHT.background,
    theme_color: LIGHT.background,
    orientation: "portrait",
    categories: ["lifestyle", "health"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: COPY.checkInButton, short_name: "Check in", url: "/check-in" },
      { name: COPY.sendHeadsUp, short_name: "Heads-up", url: "/heads-up/new" },
      { name: COPY.needHelpNow, short_name: "Help now", url: "/help-now" },
    ],
  };
}
