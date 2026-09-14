import { createServerFn } from "@tanstack/react-start";
import { sql } from "~/db";
import { requireAdmin } from "~/server/auth";
import { DM_SCREEN_CONFIG, normalizeSections, outlineToSections, sameSections, type DmScript, type ScriptAudience, type ScriptSection, type ScriptVersion } from "~/lib/dmScreen";
import { text } from "~/lib/practiceInput";
import { JOHN_RECRUITING_PRESENTATION, normalizeSections as normalizeOutline } from "~/lib/practicePresentation";

/**
 * The DM Screen, server side (presentation script spec, Phase 1). Scripts
 * live in their own tables. Every save keeps a version row so John can
 * restore an earlier one; nothing is ever hard-deleted (Section 4.1). No AI
 * is involved anywhere in this file (Rule 2.2), and nothing here reads a
 * lead or recruit.
 */

const audienceOf = (v: unknown): ScriptAudience => (v === "recruit" ? "recruit" : "client");

let ready: Promise<void> | null = null;
export function ensureDmScreenTables(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql()`
        CREATE TABLE IF NOT EXISTS dm_scripts (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          audience TEXT NOT NULL DEFAULT 'client',
          version INTEGER NOT NULL DEFAULT 1,
          is_default BOOLEAN NOT NULL DEFAULT FALSE,
          archived BOOLEAN NOT NULL DEFAULT FALSE,
          sections TEXT NOT NULL DEFAULT '[]',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )`;
      await sql()`
        CREATE TABLE IF NOT EXISTS dm_script_versions (
          id SERIAL PRIMARY KEY,
          script_id INTEGER NOT NULL,
          version INTEGER NOT NULL,
          name TEXT NOT NULL,
          sections TEXT NOT NULL DEFAULT '[]',
          saved_at TIMESTAMPTZ DEFAULT NOW()
        )`;
      await carryOverOutline();
    })().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

const isTrue = (v: unknown) => v === true || v === "t" || v === "true";

/**
 * Phase 3 (Section 6): the Sparring Dummy now reads DM Screen scripts. John's
 * recruiting outline, as he last edited it in the practice tool, becomes his
 * first recruit script once, so nothing he set up is lost. Runs only while
 * there is no recruit script at all.
 */
async function carryOverOutline(): Promise<void> {
  const [{ n }] = (await sql()`SELECT count(*)::int AS n FROM dm_scripts WHERE audience = 'recruit'`) as Array<{ n: number }>;
  if (Number(n) > 0) return;
  let name = JOHN_RECRUITING_PRESENTATION.name;
  let outline = JOHN_RECRUITING_PRESENTATION.sections;
  try {
    const rows = (await sql()`SELECT name, sections FROM practice_presentations WHERE conversation = 'recruiting' ORDER BY id LIMIT 1`) as Array<Record<string, unknown>>;
    if (rows.length) {
      name = String(rows[0].name ?? name) || name;
      const parsed = normalizeOutline(JSON.parse(String(rows[0].sections ?? "[]")));
      if (parsed.length) outline = parsed;
    }
  } catch {
    /* the practice tables may not exist yet; the built-in outline is the same content */
  }
  const sections = outlineToSections(outline);
  // One statement, so two cold starts at the same moment cannot both insert it.
  const rows = (await sql()`INSERT INTO dm_scripts (name, audience, is_default, sections) SELECT ${name}, 'recruit', TRUE, ${JSON.stringify(sections)} WHERE NOT EXISTS (SELECT 1 FROM dm_scripts WHERE audience = 'recruit') RETURNING *`) as Array<Record<string, unknown>>;
  if (rows.length) await sql()`INSERT INTO dm_script_versions (script_id, version, name, sections) VALUES (${Number(rows[0].id)}, 1, ${name}, ${JSON.stringify(sections)})`;
}

function rowToScript(r: Record<string, unknown>): DmScript {
  return {
    id: Number(r.id),
    name: String(r.name ?? ""),
    audience: audienceOf(r.audience),
    version: Number(r.version) || 1,
    isDefault: isTrue(r.is_default),
    archived: isTrue(r.archived),
    sections: normalizeSections(r.sections),
    createdAt: String(r.created_at ?? ""),
    updatedAt: String(r.updated_at ?? ""),
  };
}

export async function loadScript(id: number): Promise<DmScript | null> {
  await ensureDmScreenTables();
  const rows = (await sql()`SELECT * FROM dm_scripts WHERE id = ${id}`) as Array<Record<string, unknown>>;
  return rows.length ? rowToScript(rows[0]) : null;
}

/** Read interface (Section 6): live scripts for one audience, default first. The Sparring Dummy reads through this and never writes. */
export async function loadScriptsByAudience(audience: ScriptAudience): Promise<DmScript[]> {
  await ensureDmScreenTables();
  const rows = (await sql()`SELECT * FROM dm_scripts WHERE archived = FALSE AND audience = ${audience} ORDER BY is_default DESC, name`) as Array<Record<string, unknown>>;
  return rows.map(rowToScript);
}

async function recordVersion(s: DmScript): Promise<void> {
  await sql()`INSERT INTO dm_script_versions (script_id, version, name, sections) VALUES (${s.id}, ${s.version}, ${s.name}, ${JSON.stringify(s.sections)})`;
  // Keep only the newest versionsKept rows for this script.
  await sql()`DELETE FROM dm_script_versions WHERE script_id = ${s.id} AND id NOT IN (SELECT id FROM dm_script_versions WHERE script_id = ${s.id} ORDER BY version DESC, id DESC LIMIT ${DM_SCREEN_CONFIG.versionsKept})`;
}

export interface ScriptListItem {
  id: number;
  name: string;
  audience: ScriptAudience;
  version: number;
  isDefault: boolean;
  archived: boolean;
  sectionCount: number;
  updatedAt: string;
}

export const listScripts = createServerFn()
  .middleware([requireAdmin])
  .handler(async (): Promise<ScriptListItem[]> => {
    await ensureDmScreenTables();
    const rows = (await sql()`SELECT * FROM dm_scripts ORDER BY audience, archived, is_default DESC, updated_at DESC`) as Array<Record<string, unknown>>;
    return rows.map(rowToScript).map((s) => ({ id: s.id, name: s.name, audience: s.audience, version: s.version, isDefault: s.isDefault, archived: s.archived, sectionCount: s.sections.length, updatedAt: s.updatedAt }));
  });

export const getScript = createServerFn()
  .middleware([requireAdmin])
  .validator((d: { id: number }) => ({ id: Number(d?.id) }))
  .handler(async ({ data }): Promise<DmScript | null> => loadScript(data.id));

export const createScript = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { name: string; audience: string }) => ({ name: text(d?.name, 120), audience: audienceOf(d?.audience) }))
  .handler(async ({ data }): Promise<{ ok: boolean; id?: number; error?: string }> => {
    if (!data.name) return { ok: false, error: "Give the script a name." };
    try {
      await ensureDmScreenTables();
      // The first live script of an audience becomes its default, decided inside the insert itself.
      const rows = (await sql()`INSERT INTO dm_scripts (name, audience, is_default, sections) SELECT ${data.name}, ${data.audience}, NOT EXISTS (SELECT 1 FROM dm_scripts WHERE audience = ${data.audience} AND archived = FALSE), '[]' RETURNING *`) as Array<Record<string, unknown>>;
      const s = rowToScript(rows[0]);
      await recordVersion(s);
      return { ok: true, id: s.id };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

export interface SaveScriptResult {
  ok: boolean;
  error?: string;
  /** The script was changed elsewhere since this editor loaded it; the current copy is returned. */
  conflict?: boolean;
  script?: DmScript;
  /** True when nothing had changed, so no version was recorded. */
  unchanged?: boolean;
}

/** Section 4.2: autosave target. Bumps the version and records it; a stale editor gets a conflict instead of overwriting. */
export const saveScript = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: number; name: string; sections: unknown; baseVersion?: number }) => ({ id: Number(d?.id), name: text(d?.name, 120), sections: normalizeSections(d?.sections), baseVersion: Number(d?.baseVersion) || 0 }))
  .handler(async ({ data }): Promise<SaveScriptResult> => {
    try {
      const cur = await loadScript(data.id);
      if (!cur) return { ok: false, error: "That script is gone." };
      if (data.baseVersion && cur.version !== data.baseVersion) return { ok: false, conflict: true, script: cur };
      const name = data.name || cur.name;
      if (name === cur.name && sameSections(cur.sections, data.sections)) return { ok: true, unchanged: true, script: cur };
      // The version predicate makes the conflict check atomic: two saves from the same base cannot both land.
      const rows = (await sql()`UPDATE dm_scripts SET name = ${name}, sections = ${JSON.stringify(data.sections)}, version = version + 1, updated_at = NOW() WHERE id = ${data.id} AND version = ${cur.version} RETURNING *`) as Array<Record<string, unknown>>;
      if (!rows.length) {
        const now = await loadScript(data.id);
        return now ? { ok: false, conflict: true, script: now } : { ok: false, error: "That script is gone." };
      }
      const s = rowToScript(rows[0]);
      await recordVersion(s);
      return { ok: true, script: s };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

export const renameScript = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: number; name: string }) => ({ id: Number(d?.id), name: text(d?.name, 120) }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    if (!data.name) return { ok: false, error: "Give the script a name." };
    try {
      await ensureDmScreenTables();
      await sql()`UPDATE dm_scripts SET name = ${data.name}, updated_at = NOW() WHERE id = ${data.id}`;
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

/** Section 4.1: the main way to make a variation. The copy is never the default. */
export const duplicateScript = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: number }) => ({ id: Number(d?.id) }))
  .handler(async ({ data }): Promise<{ ok: boolean; id?: number; error?: string }> => {
    try {
      const cur = await loadScript(data.id);
      if (!cur) return { ok: false, error: "That script is gone." };
      const rows = (await sql()`INSERT INTO dm_scripts (name, audience, is_default, sections) VALUES (${`${cur.name} (copy)`}, ${cur.audience}, FALSE, ${JSON.stringify(cur.sections)}) RETURNING *`) as Array<Record<string, unknown>>;
      const s = rowToScript(rows[0]);
      await recordVersion(s);
      return { ok: true, id: s.id };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

export const setDefaultScript = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: number }) => ({ id: Number(d?.id) }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    try {
      const cur = await loadScript(data.id);
      if (!cur) return { ok: false, error: "That script is gone." };
      if (cur.archived) return { ok: false, error: "Bring it back from the archive first." };
      await sql()`UPDATE dm_scripts SET is_default = FALSE WHERE audience = ${cur.audience}`;
      await sql()`UPDATE dm_scripts SET is_default = TRUE, updated_at = NOW() WHERE id = ${data.id}`;
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

/** Section 4.1: archive instead of delete. An archived default stops being the default. */
export const archiveScript = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: number; archived: boolean }) => ({ id: Number(d?.id), archived: Boolean(d?.archived) }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    try {
      await ensureDmScreenTables();
      if (data.archived) await sql()`UPDATE dm_scripts SET archived = TRUE, is_default = FALSE, updated_at = NOW() WHERE id = ${data.id}`;
      else await sql()`UPDATE dm_scripts SET archived = FALSE, updated_at = NOW() WHERE id = ${data.id}`;
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

export const listVersions = createServerFn()
  .middleware([requireAdmin])
  .validator((d: { id: number }) => ({ id: Number(d?.id) }))
  .handler(async ({ data }): Promise<ScriptVersion[]> => {
    await ensureDmScreenTables();
    const rows = (await sql()`SELECT id, version, name, sections, saved_at FROM dm_script_versions WHERE script_id = ${data.id} ORDER BY version DESC, id DESC LIMIT ${DM_SCREEN_CONFIG.versionsKept}`) as Array<Record<string, unknown>>;
    return rows.map((r) => ({ id: Number(r.id), version: Number(r.version), name: String(r.name ?? ""), sectionCount: normalizeSections(r.sections).length, savedAt: String(r.saved_at ?? "") }));
  });

/** Restoring writes the old content as a new version, so the history keeps both. */
export const restoreVersion = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: number; versionId: number }) => ({ id: Number(d?.id), versionId: Number(d?.versionId) }))
  .handler(async ({ data }): Promise<SaveScriptResult> => {
    try {
      await ensureDmScreenTables();
      const rows = (await sql()`SELECT name, sections FROM dm_script_versions WHERE id = ${data.versionId} AND script_id = ${data.id}`) as Array<Record<string, unknown>>;
      if (!rows.length) return { ok: false, error: "That version is gone." };
      const sections: ScriptSection[] = normalizeSections(rows[0].sections);
      const upd = (await sql()`UPDATE dm_scripts SET name = ${String(rows[0].name ?? "")}, sections = ${JSON.stringify(sections)}, version = version + 1, updated_at = NOW() WHERE id = ${data.id} RETURNING *`) as Array<Record<string, unknown>>;
      if (!upd.length) return { ok: false, error: "That script is gone." };
      const s = rowToScript(upd[0]);
      await recordVersion(s);
      return { ok: true, script: s };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });
