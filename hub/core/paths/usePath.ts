"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { pathsFor, readCustomPaths, readPathState, type CustomPath, type Path, type PathState } from "@/convex/paths";
import { toolByKey, type ToolEntry } from "@/convex/toolIndex";
import { useHub } from "@/core/shell/HubContext";
import { useTools } from "@/core/tools/useTools";

/**
 * Where this person is on a path, and the moves: start, open this step, next,
 * stop. State lives in hub settings so it follows them across devices and
 * survives a trip into Heartwood or the Re-Centered app and back.
 */
export interface PathHandle {
  ready: boolean;
  paths: Path[];
  custom: CustomPath[];
  state: PathState | null;
  current: Path | null;
  step: ToolEntry | null;
  stepHref: string | null;
  nextTool: ToolEntry | null;
  start: (key: string) => Promise<void>;
  openStep: () => void;
  next: () => Promise<void>;
  stop: () => Promise<void>;
  saveCustom: (paths: CustomPath[]) => Promise<void>;
  hrefFor: (t: ToolEntry) => string;
}

export function usePath(): PathHandle {
  const { profile } = useHub();
  const tools = useTools();
  const router = useRouter();
  const setModuleSettings = useMutation(api.profiles.setModuleSettings);
  const hub = (profile.moduleSettings?.hub ?? {}) as Record<string, unknown>;
  const state = readPathState(profile.moduleSettings);
  const custom = readCustomPaths(profile.moduleSettings);
  const paths = tools ? pathsFor(tools.tools, custom) : [];
  const current = state ? paths.find((p) => p.key === state.key) ?? null : null;
  const stepKey = current && state ? current.steps[state.step] : null;
  const step = stepKey ? toolByKey(stepKey) ?? null : null;
  const nextKey = current && state ? current.steps[state.step + 1] : null;
  const nextTool = nextKey ? toolByKey(nextKey) ?? null : null;
  const hrefFor = (t: ToolEntry) => (tools ? tools.href(t) : t.href);
  const stepHref = step ? hrefFor(step) : null;

  function go(href: string) {
    if (href.includes("/app")) window.location.assign(href);
    else router.push(href);
  }

  async function write(next: PathState | null) {
    const settings = { ...hub };
    if (next) settings.path = next;
    else delete settings.path;
    await setModuleSettings({ moduleId: "hub", settings });
  }

  return {
    ready: !!tools,
    paths,
    custom,
    state,
    current,
    step,
    stepHref,
    nextTool,
    hrefFor,
    start: async (key) => {
      const p = paths.find((x) => x.key === key);
      if (!p) return;
      await write({ key, step: 0, startedAt: Date.now() });
      const first = toolByKey(p.steps[0]);
      if (first) go(hrefFor(first));
    },
    openStep: () => { if (stepHref) go(stepHref); },
    next: async () => {
      if (!current || !state) return;
      const i = state.step + 1;
      if (i >= current.steps.length) { await write(null); return; }
      await write({ ...state, step: i });
      const t = toolByKey(current.steps[i]);
      if (t) go(hrefFor(t));
    },
    stop: () => write(null),
    saveCustom: async (list) => { await setModuleSettings({ moduleId: "hub", settings: { ...hub, paths: list } }); },
  };
}
