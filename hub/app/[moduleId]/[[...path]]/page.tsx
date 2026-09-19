"use client";

import { use } from "react";
import { moduleById } from "@/core/modules/registry";
import { ModuleFrame } from "@/core/shell/ModuleFrame";
import { LinkBtn } from "@/core/ui";

/**
 * Every module's screens are served from here. The manifests are
 * browser-side files, so the lookup happens in the browser too; a server
 * file would only see hollow stand-ins for them. Adding a module needs no
 * change here.
 */
export default function ModulePage({ params }: { params: Promise<{ moduleId: string; path?: string[] }> }) {
  const { moduleId, path } = use(params);
  const manifest = moduleById(moduleId);
  if (!manifest) {
    return (
      <div className="sh-container sh-narrow sh-planned">
        <h1 className="sh-h1">There&apos;s no door here.</h1>
        <p className="sh-muted">That address doesn&apos;t match a place in the village.</p>
        <LinkBtn href="/" variant="secondary">
          Back home
        </LinkBtn>
      </div>
    );
  }
  return <ModuleFrame moduleId={manifest.id} path={path ?? []} />;
}
