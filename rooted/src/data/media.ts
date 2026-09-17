import type { ExerciseMedia } from '@/domain/types';

/** Optional GIF/video demos produced by scripts/fetch-exercisedb.mjs, loaded once at startup. */
let manifest: Record<string, ExerciseMedia> = {};
let loaded = false;

export async function loadMediaManifest(): Promise<void> {
  if (loaded) return;
  loaded = true;
  try {
    const res = await fetch('/media/manifest.json');
    if (res.ok) manifest = await res.json();
  } catch { /* offline first run without manifest is fine */ }
}

export function mediaOverride(exerciseId: string): ExerciseMedia | undefined {
  return manifest[exerciseId];
}
