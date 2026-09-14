import type { Metadata, Viewport } from "next";
import "./everybox.css";
import { EveryBoxShell } from "@/components/everybox/EveryBoxShell";

export const metadata: Metadata = {
  title: {
    default: "Every Box",
    template: "%s · Every Box",
  },
  description:
    "A shared, ambient dashboard for couples. Every part of life has a box; Every Box shows how recently each has been tended, with no scores and no nagging.",
  manifest: "/everybox/manifest.webmanifest",
  applicationName: "Every Box",
  appleWebApp: {
    capable: true,
    title: "Every Box",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/everybox/icon-192.png",
    apple: "/everybox/apple-touch-icon.png",
  },
  robots: { index: false },
};

export const viewport: Viewport = {
  themeColor: "#f5f2e8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function EveryBoxLayout({ children }: { children: React.ReactNode }) {
  return <EveryBoxShell>{children}</EveryBoxShell>;
}
