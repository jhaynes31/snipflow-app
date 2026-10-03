import type { Metadata } from "next";
import { MODULE_BRAND } from "@/core/modules/brand";
import { MODULE_NAMES } from "@/core/modules/names";

/**
 * Each place's pages carry their own manifest and icon (2026-10-03), so
 * "Add to Home Screen" from inside a place puts that place on the phone as
 * its own app. The Shire's own manifest still serves the home page.
 */
export async function generateMetadata({ params }: { params: Promise<{ moduleId: string }> }): Promise<Metadata> {
  const { moduleId } = await params;
  const name = MODULE_NAMES[moduleId];
  if (!name || !MODULE_BRAND[moduleId]) return { title: "Not found" };
  return {
    title: name,
    manifest: `/m/${moduleId}/manifest.webmanifest`,
    appleWebApp: { capable: true, title: name, statusBarStyle: "default" },
    icons: { icon: `/m/${moduleId}/icon?size=192`, apple: `/m/${moduleId}/icon?size=180` },
  };
}

export default function ModuleLayout({ children }: { children: React.ReactNode }) {
  return children;
}
