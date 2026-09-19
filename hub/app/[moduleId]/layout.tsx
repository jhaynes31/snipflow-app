import type { Metadata } from "next";
import { MODULE_NAMES } from "@/core/modules/names";

export async function generateMetadata({ params }: { params: Promise<{ moduleId: string }> }): Promise<Metadata> {
  const { moduleId } = await params;
  return { title: MODULE_NAMES[moduleId] ?? "Not found" };
}

export default function ModuleLayout({ children }: { children: React.ReactNode }) {
  return children;
}
