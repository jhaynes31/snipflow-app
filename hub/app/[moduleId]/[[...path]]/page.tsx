import { notFound } from "next/navigation";
import { moduleById } from "@/core/modules/registry";
import { ModuleFrame } from "@/core/shell/ModuleFrame";

/**
 * Every module's screens are served from here. The manifest supplies the
 * root component; nothing in app/ needs to change when a module is added.
 */
export default async function ModulePage({ params }: { params: Promise<{ moduleId: string; path?: string[] }> }) {
  const { moduleId, path } = await params;
  const manifest = moduleById(moduleId);
  if (!manifest) notFound();
  return <ModuleFrame moduleId={manifest.id} path={path ?? []} />;
}

export async function generateMetadata({ params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  const manifest = moduleById(moduleId);
  return { title: manifest?.name ?? "Not found" };
}
