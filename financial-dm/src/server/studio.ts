import { createServerFn } from "@tanstack/react-start";
import { sql } from "~/db";
import { requireAdmin } from "~/server/auth";
import type { BrollShot } from "~/lib/brollUtils";
import { defaultTitle, isStudioSource, isStudioStatus, isStudioStep, normalizeBackground, normalizeScript, type StudioHandoff, type StudioStatus, type StudioStep, type VideoProject } from "~/lib/studio";

/**
 * The Recording Studio, server side (Recording Studio spec). One row per
 * video project; takes get their own table in the next checkpoint. Every
 * save bumps a version so a stale tab cannot overwrite a newer save.
 * Videos are private to John: everything here sits behind requireAdmin,
 * and nothing reads a lead or a recruit.
 */

const text = (v: unknown, max: number) => String(v ?? "").replace(/\r\n?/g, "\n").trim().slice(0, max);
const idOrNull = (v: unknown) => (Number(v) > 0 ? Number(v) : null);
const isTrue = (v: unknown) => v === true || v === "t" || v === "true";

let ready: Promise<void> | null = null;
export function ensureStudioTables(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql()`
        CREATE TABLE IF NOT EXISTS studio_videos (
          id SERIAL PRIMARY KEY,
          source TEXT NOT NULL DEFAULT 'freestyle',
          recruiting BOOLEAN NOT NULL DEFAULT FALSE,
          title TEXT NOT NULL DEFAULT '',
          topic TEXT NOT NULL DEFAULT '',
          pain_point TEXT NOT NULL DEFAULT '',
          tone TEXT NOT NULL DEFAULT '',
          script TEXT NOT NULL DEFAULT '{}',
          no_script BOOLEAN NOT NULL DEFAULT FALSE,
          script_id INTEGER,
          broll_id INTEGER,
          guild_output_id INTEGER,
          shots TEXT NOT NULL DEFAULT '[]',
          status TEXT NOT NULL DEFAULT 'draft',
          step TEXT NOT NULL DEFAULT 'script',
          background TEXT NOT NULL DEFAULT '{"mode":"none"}',
          chosen_take_id INTEGER,
          duration_sec REAL,
          export_url TEXT,
          thumbnail_url TEXT,
          caption_text TEXT NOT NULL DEFAULT '',
          hashtags TEXT NOT NULL DEFAULT '',
          version INTEGER NOT NULL DEFAULT 1,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )`;
      await sql()`
        CREATE TABLE IF NOT EXISTS studio_takes (
          id SERIAL PRIMARY KEY,
          video_id INTEGER NOT NULL,
          section TEXT NOT NULL DEFAULT 'all',
          number INTEGER NOT NULL DEFAULT 1,
          url TEXT,
          pathname TEXT,
          content_type TEXT,
          size_bytes BIGINT,
          duration_sec REAL,
          kept BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )`;
    })().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

const parseJson = <T,>(raw: unknown, fallback: T): T => {
  try {
    const v = JSON.parse(String(raw ?? ""));
    return (v ?? fallback) as T;
  } catch {
    return fallback;
  }
};

function rowToVideo(r: Record<string, unknown>): VideoProject {
  return {
    id: Number(r.id),
    source: isStudioSource(r.source) ? r.source : "freestyle",
    recruiting: isTrue(r.recruiting),
    title: String(r.title ?? ""),
    topic: String(r.topic ?? ""),
    painPoint: String(r.pain_point ?? ""),
    tone: String(r.tone ?? ""),
    script: normalizeScript(parseJson(r.script, {})),
    noScript: isTrue(r.no_script),
    scriptId: idOrNull(r.script_id),
    brollId: idOrNull(r.broll_id),
    guildOutputId: idOrNull(r.guild_output_id),
    shots: parseJson<BrollShot[]>(r.shots, []).filter((s) => s && typeof s === "object"),
    status: isStudioStatus(r.status) ? r.status : "draft",
    step: isStudioStep(r.step) ? r.step : "script",
    background: normalizeBackground(parseJson(r.background, {})),
    chosenTakeId: idOrNull(r.chosen_take_id),
    durationSec: r.duration_sec == null ? null : Number(r.duration_sec),
    exportUrl: r.export_url ? String(r.export_url) : null,
    thumbnailUrl: r.thumbnail_url ? String(r.thumbnail_url) : null,
    captionText: String(r.caption_text ?? ""),
    hashtags: String(r.hashtags ?? "").split(/\s+/).filter(Boolean),
    version: Number(r.version) || 1,
    createdAt: String(r.created_at ?? ""),
    updatedAt: String(r.updated_at ?? ""),
  };
}

function cleanHandoff(d: Partial<StudioHandoff> | undefined): StudioHandoff {
  const script = normalizeScript(d?.script);
  const source = isStudioSource(d?.source) ? d.source : "freestyle";
  return {
    source,
    recruiting: Boolean(d?.recruiting) || source === "guild",
    title: defaultTitle({ title: text(d?.title, 120), script }),
    topic: text(d?.topic, 120),
    painPoint: text(d?.painPoint, 300),
    tone: text(d?.tone, 40),
    script,
    scriptId: idOrNull(d?.scriptId),
    brollId: idOrNull(d?.brollId),
    guildOutputId: idOrNull(d?.guildOutputId),
    shots: Array.isArray(d?.shots) ? d.shots.slice(0, 60) : [],
  };
}

export interface StartStudioResult {
  ok: boolean;
  error?: string;
  id?: number;
  /** True when an unfinished video for the same source already existed and was returned instead of a new one. */
  existing?: boolean;
  updatedAt?: string;
}

/**
 * Open the Studio for a script, a shot list, a Guild piece, or nothing at
 * all. If John already started a video from the same source and has not
 * posted it, that video comes back so he can continue where he left off;
 * `fresh` skips that and starts a new one.
 */
export const startStudioVideo = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: Partial<StudioHandoff> & { fresh?: boolean }) => ({ handoff: cleanHandoff(d), fresh: Boolean(d?.fresh) }))
  .handler(async ({ data }): Promise<StartStudioResult> => {
    try {
      await ensureStudioTables();
      const h = data.handoff;
      const ref = h.source === "script" ? h.scriptId : h.source === "broll" ? h.brollId : h.source === "guild" ? h.guildOutputId : null;
      if (!data.fresh && ref) {
        const col = h.source === "script" ? sql()`script_id` : h.source === "broll" ? sql()`broll_id` : sql()`guild_output_id`;
        const rows = (await sql()`SELECT id, updated_at FROM studio_videos WHERE source = ${h.source} AND ${col} = ${ref} AND status <> 'posted' ORDER BY updated_at DESC LIMIT 1`) as Array<Record<string, unknown>>;
        if (rows.length) return { ok: true, id: Number(rows[0].id), existing: true, updatedAt: String(rows[0].updated_at ?? "") };
      }
      const rows = (await sql()`
        INSERT INTO studio_videos (source, recruiting, title, topic, pain_point, tone, script, script_id, broll_id, guild_output_id, shots, step)
        VALUES (${h.source}, ${h.recruiting}, ${h.title}, ${h.topic}, ${h.painPoint}, ${h.tone}, ${JSON.stringify(h.script)}, ${h.scriptId}, ${h.brollId}, ${h.guildOutputId}, ${JSON.stringify(h.shots ?? [])}, 'script')
        RETURNING id`) as Array<{ id: number }>;
      return { ok: true, id: Number(rows[0].id), existing: false };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

export const getStudioVideo = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .validator((d: { id: number }) => ({ id: Number(d?.id) }))
  .handler(async ({ data }): Promise<VideoProject | null> => {
    await ensureStudioTables();
    const rows = (await sql()`SELECT * FROM studio_videos WHERE id = ${data.id}`) as Array<Record<string, unknown>>;
    return rows.length ? rowToVideo(rows[0]) : null;
  });

export const listStudioVideos = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<VideoProject[]> => {
    await ensureStudioTables();
    const rows = (await sql()`SELECT * FROM studio_videos ORDER BY updated_at DESC`) as Array<Record<string, unknown>>;
    return rows.map(rowToVideo);
  });

export interface StudioPatch {
  title?: string;
  topic?: string;
  script?: Partial<VideoProject["script"]>;
  noScript?: boolean;
  step?: StudioStep;
  status?: StudioStatus;
  background?: VideoProject["background"];
  captionText?: string;
  hashtags?: string[];
  chosenTakeId?: number | null;
  durationSec?: number | null;
}

export interface UpdateStudioResult {
  ok: boolean;
  error?: string;
  /** The tab's version was stale; `current` is the row as it stands now. */
  conflict?: boolean;
  current?: VideoProject;
  video?: VideoProject;
}

/**
 * Autosave. Only the fields sent change; the version must match the one
 * the tab last saw, otherwise nothing is written and the newer row comes
 * back so the tab can catch up.
 */
export const updateStudioVideo = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: number; version: number; patch: StudioPatch }) => ({ id: Number(d?.id), version: Number(d?.version) || 0, patch: d?.patch ?? {} }))
  .handler(async ({ data }): Promise<UpdateStudioResult> => {
    try {
      await ensureStudioTables();
      const cur = (await sql()`SELECT * FROM studio_videos WHERE id = ${data.id}`) as Array<Record<string, unknown>>;
      if (!cur.length) return { ok: false, error: "That video is gone." };
      const before = rowToVideo(cur[0]);
      if (before.version !== data.version) return { ok: false, conflict: true, current: before };
      const p = data.patch;
      const script = p.script ? normalizeScript({ ...before.script, ...p.script }) : before.script;
      const next = {
        title: p.title != null ? defaultTitle({ title: text(p.title, 120), script }) : before.title,
        topic: p.topic != null ? text(p.topic, 120) : before.topic,
        noScript: p.noScript != null ? Boolean(p.noScript) : before.noScript,
        step: isStudioStep(p.step) ? p.step : before.step,
        status: isStudioStatus(p.status) ? p.status : before.status,
        background: p.background ? normalizeBackground(p.background) : before.background,
        captionText: p.captionText != null ? text(p.captionText, 4000) : before.captionText,
        hashtags: Array.isArray(p.hashtags) ? p.hashtags.map((h) => text(h, 60)).filter(Boolean).slice(0, 30) : before.hashtags,
        chosenTakeId: p.chosenTakeId !== undefined ? idOrNull(p.chosenTakeId) : before.chosenTakeId,
        durationSec: p.durationSec !== undefined ? (p.durationSec == null ? null : Number(p.durationSec)) : before.durationSec,
      };
      const rows = (await sql()`
        UPDATE studio_videos SET
          title = ${next.title}, topic = ${next.topic}, script = ${JSON.stringify(script)}, no_script = ${next.noScript},
          step = ${next.step}, status = ${next.status}, background = ${JSON.stringify(next.background)},
          caption_text = ${next.captionText}, hashtags = ${next.hashtags.join(" ")},
          chosen_take_id = ${next.chosenTakeId}, duration_sec = ${next.durationSec},
          version = version + 1, updated_at = NOW()
        WHERE id = ${data.id} AND version = ${data.version}
        RETURNING *`) as Array<Record<string, unknown>>;
      if (!rows.length) {
        const again = (await sql()`SELECT * FROM studio_videos WHERE id = ${data.id}`) as Array<Record<string, unknown>>;
        return { ok: false, conflict: true, current: again.length ? rowToVideo(again[0]) : undefined };
      }
      return { ok: true, video: rowToVideo(rows[0]) };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

/** A copy to make a variation from. `fresh` keeps only the handoff (script, source, B roll picks), not takes or edits. */
export const duplicateStudioVideo = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: number; fresh?: boolean }) => ({ id: Number(d?.id), fresh: Boolean(d?.fresh) }))
  .handler(async ({ data }): Promise<{ ok: boolean; id?: number; error?: string }> => {
    try {
      await ensureStudioTables();
      const cur = (await sql()`SELECT * FROM studio_videos WHERE id = ${data.id}`) as Array<Record<string, unknown>>;
      if (!cur.length) return { ok: false, error: "That video is gone." };
      const v = rowToVideo(cur[0]);
      const title = data.fresh ? v.title : `${v.title} (copy)`.slice(0, 120);
      const rows = (await sql()`
        INSERT INTO studio_videos (source, recruiting, title, topic, pain_point, tone, script, no_script, script_id, broll_id, guild_output_id, shots, step, background, caption_text, hashtags)
        VALUES (${v.source}, ${v.recruiting}, ${title}, ${v.topic}, ${v.painPoint}, ${v.tone}, ${JSON.stringify(v.script)}, ${v.noScript}, ${v.scriptId}, ${v.brollId}, ${v.guildOutputId}, ${JSON.stringify(v.shots ?? [])}, ${data.fresh ? "script" : v.step}, ${JSON.stringify(data.fresh ? { mode: "none" } : v.background)}, ${data.fresh ? "" : v.captionText}, ${data.fresh ? "" : v.hashtags.join(" ")})
        RETURNING id`) as Array<{ id: number }>;
      return { ok: true, id: Number(rows[0].id) };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

export const deleteStudioVideo = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: number }) => ({ id: Number(d?.id) }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    try {
      await ensureStudioTables();
      // Takes' files in storage are removed by the take cleanup (next checkpoint); the rows go now.
      await sql()`DELETE FROM studio_takes WHERE video_id = ${data.id}`;
      await sql()`DELETE FROM studio_videos WHERE id = ${data.id}`;
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });
