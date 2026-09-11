import { createServerFn } from "@tanstack/react-start";
import { sql } from "~/db";
import { requireAdmin } from "~/server/auth";
import { callClaude, parseJsonReply } from "~/server/contentVoice";
import { QUEST_CONFIG, generatorById, type GeneratorId, type QuizId } from "~/lib/questConfig";
import { SLOT_STATUSES, enforcePlan, normalizeSlug, scheduleDates, slugProblem, targetMix, weekdayOf, type PlannedSlot, type SlotStatus } from "~/lib/questPlan";

/**
 * Quest Board, Phase 2: quests, series (multi-part and recurring shows),
 * content slots, and the AI drafts (a plan for a quest, an outline for a
 * series). Drafts are proposals: nothing is saved until John accepts.
 * The model only ever sees profile text and plan settings, never leads.
 */

export type QuestStatus = "planning" | "active" | "complete";

export interface Quest {
  id: number;
  name: string;
  profileId: number | null;
  profileName: string;
  goal: "booked_calls";
  offerQuiz: QuizId;
  lootHighlight: string;
  testing: string;
  platforms: string[];
  postsPerWeek: number;
  startDate: string;
  endDate: string;
  slug: string;
  status: QuestStatus;
  retro: string;
  /** Recurring shows switched on for this quest. */
  showIds: number[];
  createdAt: string;
}

export type QuestInput = Omit<Quest, "id" | "profileName" | "createdAt" | "goal"> & { id?: number };

export interface Series {
  id: number;
  name: string;
  kind: "multi_part" | "recurring";
  questId: number | null;
  totalParts: number | null;
  outline: string[];
  defaultWeekday: string;
  defaultGenerator: GeneratorId;
  description: string;
  slug: string;
  active: boolean;
  example: boolean;
}

export type SeriesInput = Omit<Series, "id" | "example"> & { id?: number };

export interface ContentSlot {
  id: number;
  questId: number;
  date: string;
  platform: string;
  generator: GeneratorId;
  generatorReason: string;
  seriesId: number | null;
  seriesName: string | null;
  seriesKind: "multi_part" | "recurring" | null;
  partNumber: number | null;
  totalParts: number | null;
  madeElsewhere: boolean;
  topic: string;
  painPoint: string;
  hookAngle: string;
  generatorOutputRef: string;
  status: SlotStatus;
  postUrl: string;
  postSlug: string;
  stats: Partial<Record<"views" | "likes" | "comments" | "shares" | "saves", number>>;
  flags: string[];
  /** John has seen the flagged words on the current draft. */
  flagsAcknowledged: boolean;
  /** Earlier drafts' output refs, newest first. */
  outputHistory: string[];
  notes: string;
}

export type SlotInput = Omit<ContentSlot, "id" | "seriesName" | "seriesKind" | "totalParts" | "flagsAcknowledged" | "outputHistory"> & { id?: number };

const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const int = (v: unknown, lo: number, hi: number, dflt: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, Math.round(n))) : dflt;
};
const isoDate = (v: unknown): string => {
  const s = text(v, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
};
const strList = (v: unknown, max: number, itemMax = 200): string[] => (Array.isArray(v) ? v.map((x) => text(x, itemMax)).filter(Boolean).slice(0, max) : []);
const parseJson = <T,>(v: unknown, fallback: T): T => {
  try {
    const p = JSON.parse(String(v ?? ""));
    return (p ?? fallback) as T;
  } catch {
    return fallback;
  }
};
const genId = (v: unknown): GeneratorId => (generatorById(String(v)) ? (String(v) as GeneratorId) : "script");

// ── Tables ──────────────────────────────────────────────────────────

let ready: Promise<void> | null = null;
function ensureTables(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql()`
        CREATE TABLE IF NOT EXISTS quests (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          profile_id INTEGER,
          goal TEXT DEFAULT 'booked_calls',
          offer_quiz TEXT DEFAULT 'life_insurance',
          loot_highlight TEXT DEFAULT '',
          testing TEXT DEFAULT '',
          platforms TEXT DEFAULT '["tiktok"]',
          posts_per_week INTEGER DEFAULT 3,
          start_date TEXT DEFAULT '',
          end_date TEXT DEFAULT '',
          slug TEXT DEFAULT '',
          status TEXT DEFAULT 'planning',
          retro TEXT DEFAULT '',
          show_ids TEXT DEFAULT '[]',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      await sql()`
        CREATE TABLE IF NOT EXISTS quest_series (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          kind TEXT DEFAULT 'recurring',
          quest_id INTEGER,
          total_parts INTEGER,
          outline TEXT DEFAULT '[]',
          default_weekday TEXT DEFAULT '',
          default_generator TEXT DEFAULT 'script',
          description TEXT DEFAULT '',
          slug TEXT DEFAULT '',
          active BOOLEAN DEFAULT TRUE,
          example BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;
      await sql()`
        CREATE TABLE IF NOT EXISTS content_slots (
          id SERIAL PRIMARY KEY,
          quest_id INTEGER NOT NULL,
          date TEXT NOT NULL,
          platform TEXT DEFAULT 'tiktok',
          generator TEXT DEFAULT 'script',
          generator_reason TEXT DEFAULT '',
          series_id INTEGER,
          part_number INTEGER,
          made_elsewhere BOOLEAN DEFAULT FALSE,
          topic TEXT DEFAULT '',
          pain_point TEXT DEFAULT '',
          hook_angle TEXT DEFAULT '',
          generator_output_ref TEXT DEFAULT '',
          status TEXT DEFAULT 'idea',
          post_url TEXT DEFAULT '',
          post_slug TEXT DEFAULT '',
          stats TEXT DEFAULT '{}',
          flags TEXT DEFAULT '[]',
          notes TEXT DEFAULT '',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      await sql()`CREATE TABLE IF NOT EXISTS quest_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`;
      await sql()`ALTER TABLE content_slots ADD COLUMN IF NOT EXISTS output_history TEXT DEFAULT '[]'`;
      await sql()`ALTER TABLE content_slots ADD COLUMN IF NOT EXISTS flags_acknowledged BOOLEAN DEFAULT FALSE`;
      await seedShowsOnce();
    })().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

/** Two example recurring shows (Section 6.3), seeded once. */
async function seedShowsOnce() {
  const flag = (await sql()`SELECT value FROM quest_settings WHERE key = 'shows_seeded'`) as Array<{ value: string }>;
  if (flag.length) return;
  await sql()`
    INSERT INTO quest_series (name, kind, default_weekday, default_generator, description, example)
    VALUES ('Trap or Treasure Tuesday', 'recurring', 'Tuesday', 'insight_card', 'A myth vs. fact post. John reads a common belief and calls it a trap or a treasure.', TRUE),
           ('Last Call', 'recurring', 'Friday', 'social_card', 'One quick, useful tip to end the week. Short, warm, and worth saving.', TRUE)
  `;
  await sql()`INSERT INTO quest_settings (key, value) VALUES ('shows_seeded', '1') ON CONFLICT (key) DO NOTHING`;
}

// ── Row mappers ─────────────────────────────────────────────────────

function rowToQuest(r: Record<string, unknown>, profileName = ""): Quest {
  return {
    id: Number(r.id),
    name: String(r.name ?? ""),
    profileId: r.profile_id == null ? null : Number(r.profile_id),
    profileName,
    goal: "booked_calls",
    offerQuiz: r.offer_quiz === "financial" ? "financial" : "life_insurance",
    lootHighlight: String(r.loot_highlight ?? ""),
    testing: String(r.testing ?? ""),
    platforms: parseJson<string[]>(r.platforms, ["tiktok"]),
    postsPerWeek: Number(r.posts_per_week ?? QUEST_CONFIG.defaultPostsPerWeek),
    startDate: String(r.start_date ?? ""),
    endDate: String(r.end_date ?? ""),
    slug: String(r.slug ?? ""),
    status: r.status === "active" || r.status === "complete" ? r.status : "planning",
    retro: String(r.retro ?? ""),
    showIds: parseJson<number[]>(r.show_ids, []).map(Number),
    createdAt: String(r.created_at ?? ""),
  };
}

function rowToSeries(r: Record<string, unknown>): Series {
  return {
    id: Number(r.id),
    name: String(r.name ?? ""),
    kind: r.kind === "multi_part" ? "multi_part" : "recurring",
    questId: r.quest_id == null ? null : Number(r.quest_id),
    totalParts: r.total_parts == null ? null : Number(r.total_parts),
    outline: parseJson<string[]>(r.outline, []),
    defaultWeekday: String(r.default_weekday ?? ""),
    defaultGenerator: genId(r.default_generator),
    description: String(r.description ?? ""),
    slug: String(r.slug ?? ""),
    active: r.active !== false,
    example: Boolean(r.example),
  };
}

function rowToSlot(r: Record<string, unknown>, series?: Series): ContentSlot {
  const st = String(r.status ?? "idea") as SlotStatus;
  return {
    id: Number(r.id),
    questId: Number(r.quest_id),
    date: String(r.date ?? ""),
    platform: String(r.platform ?? "tiktok"),
    generator: genId(r.generator),
    generatorReason: String(r.generator_reason ?? ""),
    seriesId: r.series_id == null ? null : Number(r.series_id),
    seriesName: series?.name ?? null,
    seriesKind: series?.kind ?? null,
    partNumber: r.part_number == null ? null : Number(r.part_number),
    totalParts: series?.totalParts ?? null,
    madeElsewhere: Boolean(r.made_elsewhere),
    topic: String(r.topic ?? ""),
    painPoint: String(r.pain_point ?? ""),
    hookAngle: String(r.hook_angle ?? ""),
    generatorOutputRef: String(r.generator_output_ref ?? ""),
    status: SLOT_STATUSES.includes(st) ? st : "idea",
    postUrl: String(r.post_url ?? ""),
    postSlug: String(r.post_slug ?? ""),
    stats: parseJson(r.stats, {}),
    flags: parseJson<string[]>(r.flags, []),
    flagsAcknowledged: Boolean(r.flags_acknowledged),
    outputHistory: parseJson<string[]>(r.output_history, []),
    notes: String(r.notes ?? ""),
  };
}

// ── Quests ──────────────────────────────────────────────────────────

function cleanQuest(d: Partial<QuestInput> | undefined): QuestInput {
  const start = isoDate(d?.startDate);
  return {
    id: typeof d?.id === "number" ? d.id : undefined,
    name: text(d?.name, 80),
    profileId: d?.profileId == null ? null : Number(d.profileId),
    offerQuiz: d?.offerQuiz === "financial" ? "financial" : "life_insurance",
    lootHighlight: text(d?.lootHighlight, 120),
    testing: text(d?.testing, 300),
    platforms: strList(d?.platforms, 6, 30).filter((p) => QUEST_CONFIG.platforms.some((x) => x.id === p)),
    postsPerWeek: int(d?.postsPerWeek, 1, 7, QUEST_CONFIG.defaultPostsPerWeek),
    startDate: start,
    endDate: isoDate(d?.endDate),
    slug: normalizeSlug(text(d?.slug, 30)),
    status: d?.status === "active" || d?.status === "complete" ? d.status : "planning",
    retro: text(d?.retro, 2000),
    showIds: Array.isArray(d?.showIds) ? d!.showIds.map(Number).filter(Number.isFinite) : [],
  };
}

/** Every slug in use (quests, series, posts), so a new one can be checked for collisions. */
async function takenSlugs(exceptQuestId?: number): Promise<string[]> {
  const q = (await sql()`SELECT id, slug FROM quests WHERE slug <> ''`) as Array<{ id: number; slug: string }>;
  const s = (await sql()`SELECT slug FROM quest_series WHERE slug <> ''`) as Array<{ slug: string }>;
  const p = (await sql()`SELECT post_slug AS slug FROM content_slots WHERE post_slug <> ''`) as Array<{ slug: string }>;
  return [...q.filter((r) => r.id !== exceptQuestId).map((r) => r.slug), ...s.map((r) => r.slug), ...p.map((r) => r.slug)];
}

export const getQuests = createServerFn().middleware([requireAdmin]).handler(async (): Promise<Quest[]> => {
  await ensureTables();
  const rows = (await sql()`
    SELECT q.*, p.name AS profile_name FROM quests q LEFT JOIN client_profiles p ON p.id = q.profile_id
    ORDER BY CASE q.status WHEN 'active' THEN 0 WHEN 'planning' THEN 1 ELSE 2 END, q.start_date DESC, q.id DESC
  `) as Array<Record<string, unknown>>;
  return rows.map((r) => rowToQuest(r, String(r.profile_name ?? "")));
});

export const saveQuest = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: Partial<QuestInput>) => cleanQuest(d))
  .handler(async ({ data }): Promise<{ ok: boolean; id?: number; error?: string }> => {
    await ensureTables();
    if (!data.name) return { ok: false, error: "Give the quest a name." };
    if (!data.profileId) return { ok: false, error: "Pick the profile this quest is for." };
    if (!data.testing) return { ok: false, error: "Say what this quest is testing. One idea per quest." };
    if (!data.startDate || !data.endDate) return { ok: false, error: "Set a start and end date." };
    if (data.endDate < data.startDate) return { ok: false, error: "The end date is before the start date." };
    if (data.platforms.length === 0) return { ok: false, error: "Pick at least one platform." };
    const problem = slugProblem(data.slug, await takenSlugs(data.id));
    if (problem) return { ok: false, error: problem };
    try {
      if (data.id) {
        await sql()`
          UPDATE quests SET name = ${data.name}, profile_id = ${data.profileId}, offer_quiz = ${data.offerQuiz}, loot_highlight = ${data.lootHighlight},
            testing = ${data.testing}, platforms = ${JSON.stringify(data.platforms)}, posts_per_week = ${data.postsPerWeek}, start_date = ${data.startDate},
            end_date = ${data.endDate}, slug = ${data.slug}, status = ${data.status}, retro = ${data.retro}, show_ids = ${JSON.stringify(data.showIds)}, updated_at = NOW()
          WHERE id = ${data.id}
        `;
        return { ok: true, id: data.id };
      }
      const rows = (await sql()`
        INSERT INTO quests (name, profile_id, offer_quiz, loot_highlight, testing, platforms, posts_per_week, start_date, end_date, slug, status, retro, show_ids)
        VALUES (${data.name}, ${data.profileId}, ${data.offerQuiz}, ${data.lootHighlight}, ${data.testing}, ${JSON.stringify(data.platforms)}, ${data.postsPerWeek}, ${data.startDate}, ${data.endDate}, ${data.slug}, ${data.status}, ${data.retro}, ${JSON.stringify(data.showIds)})
        RETURNING id
      `) as Array<{ id: number }>;
      return { ok: true, id: rows[0]?.id };
    } catch (e) {
      console.error("[quests] save failed:", e);
      return { ok: false, error: "Could not save the quest." };
    }
  });

export const deleteQuest = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: number }) => ({ id: Number(d?.id) }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    try {
      await ensureTables();
      await sql()`DELETE FROM content_slots WHERE quest_id = ${data.id}`;
      await sql()`DELETE FROM quest_series WHERE quest_id = ${data.id} AND kind = 'multi_part'`;
      await sql()`DELETE FROM quests WHERE id = ${data.id}`;
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

// ── Series ──────────────────────────────────────────────────────────

function cleanSeries(d: Partial<SeriesInput> | undefined): SeriesInput {
  const kind = d?.kind === "multi_part" ? "multi_part" : "recurring";
  return {
    id: typeof d?.id === "number" ? d.id : undefined,
    name: text(d?.name, 80),
    kind,
    questId: kind === "multi_part" && d?.questId != null ? Number(d.questId) : null,
    totalParts: kind === "multi_part" ? int(d?.totalParts, 2, 4, 3) : null,
    outline: kind === "multi_part" ? strList(d?.outline, 4, 200) : [],
    defaultWeekday: kind === "recurring" ? text(d?.defaultWeekday, 12) : "",
    defaultGenerator: genId(d?.defaultGenerator ?? "script"),
    description: text(d?.description, 400),
    slug: normalizeSlug(text(d?.slug, 30)),
    active: d?.active !== false,
  };
}

export const getSeries = createServerFn().middleware([requireAdmin]).handler(async (): Promise<Series[]> => {
  await ensureTables();
  const rows = (await sql()`SELECT * FROM quest_series ORDER BY kind DESC, name ASC`) as Array<Record<string, unknown>>;
  return rows.map(rowToSeries);
});

export const saveSeries = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: Partial<SeriesInput>) => cleanSeries(d))
  .handler(async ({ data }): Promise<{ ok: boolean; id?: number; error?: string }> => {
    await ensureTables();
    if (!data.name) return { ok: false, error: "Give the series a name." };
    if (data.kind === "multi_part" && !data.questId) return { ok: false, error: "A multi-part series belongs to one quest." };
    if (data.slug) {
      const taken = (await takenSlugs()).filter((s) => !(data.id && s === data.slug));
      const problem = slugProblem(data.slug, taken);
      if (problem) return { ok: false, error: problem };
    }
    try {
      if (data.id) {
        await sql()`
          UPDATE quest_series SET name = ${data.name}, kind = ${data.kind}, quest_id = ${data.questId}, total_parts = ${data.totalParts}, outline = ${JSON.stringify(data.outline)},
            default_weekday = ${data.defaultWeekday}, default_generator = ${data.defaultGenerator}, description = ${data.description}, slug = ${data.slug}, active = ${data.active}
          WHERE id = ${data.id}
        `;
        return { ok: true, id: data.id };
      }
      const rows = (await sql()`
        INSERT INTO quest_series (name, kind, quest_id, total_parts, outline, default_weekday, default_generator, description, slug, active)
        VALUES (${data.name}, ${data.kind}, ${data.questId}, ${data.totalParts}, ${JSON.stringify(data.outline)}, ${data.defaultWeekday}, ${data.defaultGenerator}, ${data.description}, ${data.slug}, ${data.active})
        RETURNING id
      `) as Array<{ id: number }>;
      return { ok: true, id: rows[0]?.id };
    } catch (e) {
      console.error("[quests] save series failed:", e);
      return { ok: false, error: "Could not save the series." };
    }
  });

export const deleteSeries = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: number }) => ({ id: Number(d?.id) }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    try {
      await ensureTables();
      await sql()`UPDATE content_slots SET series_id = NULL, part_number = NULL WHERE series_id = ${data.id}`;
      await sql()`DELETE FROM quest_series WHERE id = ${data.id}`;
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

// ── Slots ───────────────────────────────────────────────────────────

function cleanSlot(d: Partial<SlotInput> | undefined): SlotInput {
  const st = String(d?.status ?? "idea") as SlotStatus;
  const stats: SlotInput["stats"] = {};
  for (const k of ["views", "likes", "comments", "shares", "saves"] as const) {
    const n = Number((d?.stats as Record<string, unknown> | undefined)?.[k]);
    if (Number.isFinite(n) && n >= 0) stats[k] = Math.round(n);
  }
  return {
    id: typeof d?.id === "number" ? d.id : undefined,
    questId: Number(d?.questId),
    date: isoDate(d?.date),
    platform: text(d?.platform, 30) || "tiktok",
    generator: genId(d?.generator),
    generatorReason: text(d?.generatorReason, 200),
    seriesId: d?.seriesId == null ? null : Number(d.seriesId),
    partNumber: d?.partNumber == null ? null : int(d.partNumber, 1, 4, 1),
    madeElsewhere: Boolean(d?.madeElsewhere),
    topic: text(d?.topic, 120),
    painPoint: text(d?.painPoint, 200),
    hookAngle: text(d?.hookAngle, 200),
    generatorOutputRef: text(d?.generatorOutputRef, 120),
    status: SLOT_STATUSES.includes(st) ? st : "idea",
    postUrl: text(d?.postUrl, 300),
    postSlug: normalizeSlug(text(d?.postSlug, 30)),
    stats,
    flags: strList(d?.flags, 20, 60),
    notes: text(d?.notes, 1000),
  };
}

async function slotsForQuest(questId: number): Promise<ContentSlot[]> {
  const series = (await sql()`SELECT * FROM quest_series`) as Array<Record<string, unknown>>;
  const byId = new Map(series.map((r) => [Number(r.id), rowToSeries(r)]));
  const rows = (await sql()`SELECT * FROM content_slots WHERE quest_id = ${questId} ORDER BY date ASC, id ASC`) as Array<Record<string, unknown>>;
  return rows.map((r) => rowToSlot(r, r.series_id == null ? undefined : byId.get(Number(r.series_id))));
}

export const getSlots = createServerFn()
  .middleware([requireAdmin])
  .validator((d: { questId: number }) => ({ questId: Number(d?.questId) }))
  .handler(async ({ data }): Promise<ContentSlot[]> => {
    await ensureTables();
    return slotsForQuest(data.questId);
  });

/** Status changes only move forward through John's hands: posted requires approved, and flagged words must be acknowledged before approval (Sections 7.3, 7.4). */
function statusAllowed(prev: SlotStatus | null, next: SlotStatus, flags: string[], acknowledged: boolean): string | null {
  if (next === "posted" && prev !== "approved" && prev !== "posted") return "Approve the post before marking it posted.";
  if ((next === "approved" || next === "posted") && flags.length && !acknowledged && prev !== "approved" && prev !== "posted") return `Acknowledge the flagged words first (${flags.join(", ")}), or fix the text and save it again.`;
  return null;
}

export const saveSlot = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: Partial<SlotInput>) => cleanSlot(d))
  .handler(async ({ data }): Promise<{ ok: boolean; id?: number; error?: string }> => {
    await ensureTables();
    if (!data.questId) return { ok: false, error: "The slot needs a quest." };
    if (!data.date) return { ok: false, error: "Pick a date for the post." };
    if (data.postSlug) {
      const taken = (await takenSlugs()).filter((s) => !(data.id && s === data.postSlug));
      const problem = slugProblem(data.postSlug, taken);
      if (problem) return { ok: false, error: problem };
    }
    try {
      let prev: SlotStatus | null = null;
      let flags: string[] = data.flags;
      let acknowledged = false;
      if (data.id) {
        const cur = (await sql()`SELECT status, flags, flags_acknowledged FROM content_slots WHERE id = ${data.id}`) as Array<{ status: SlotStatus; flags: string; flags_acknowledged: boolean }>;
        prev = cur[0]?.status ?? null;
        flags = parseJson<string[]>(cur[0]?.flags, []);
        acknowledged = Boolean(cur[0]?.flags_acknowledged);
      }
      const blocked = statusAllowed(prev, data.status, flags, acknowledged);
      if (blocked) return { ok: false, error: blocked };
      if (data.id) {
        await sql()`
          UPDATE content_slots SET date = ${data.date}, platform = ${data.platform}, generator = ${data.generator}, generator_reason = ${data.generatorReason},
            series_id = ${data.seriesId}, part_number = ${data.partNumber}, made_elsewhere = ${data.madeElsewhere}, topic = ${data.topic}, pain_point = ${data.painPoint},
            hook_angle = ${data.hookAngle}, generator_output_ref = ${data.generatorOutputRef}, status = ${data.status}, post_url = ${data.postUrl}, post_slug = ${data.postSlug},
            stats = ${JSON.stringify(data.stats)}, notes = ${data.notes}, updated_at = NOW()
          WHERE id = ${data.id}
        `;
        return { ok: true, id: data.id };
      }
      const rows = (await sql()`
        INSERT INTO content_slots (quest_id, date, platform, generator, generator_reason, series_id, part_number, made_elsewhere, topic, pain_point, hook_angle, generator_output_ref, status, post_url, post_slug, stats, flags, notes)
        VALUES (${data.questId}, ${data.date}, ${data.platform}, ${data.generator}, ${data.generatorReason}, ${data.seriesId}, ${data.partNumber}, ${data.madeElsewhere}, ${data.topic}, ${data.painPoint}, ${data.hookAngle}, ${data.generatorOutputRef}, ${data.status}, ${data.postUrl}, ${data.postSlug}, ${JSON.stringify(data.stats)}, ${JSON.stringify(data.flags)}, ${data.notes})
        RETURNING id
      `) as Array<{ id: number }>;
      return { ok: true, id: rows[0]?.id };
    } catch (e) {
      console.error("[quests] save slot failed:", e);
      return { ok: false, error: "Could not save the slot." };
    }
  });

export const deleteSlot = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: number }) => ({ id: Number(d?.id) }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    try {
      await ensureTables();
      await sql()`DELETE FROM content_slots WHERE id = ${data.id}`;
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

// ── AI drafts ───────────────────────────────────────────────────────

interface ProfileRow {
  name: string;
  life_stage: string;
  triggers: string;
  pain_points: string;
  worries: string;
}

async function profileFor(id: number | null): Promise<ProfileRow | null> {
  if (!id) return null;
  const rows = (await sql()`SELECT name, life_stage, triggers, pain_points, worries FROM client_profiles WHERE id = ${id}`) as ProfileRow[];
  return rows[0] ?? null;
}

const profileText = (p: ProfileRow | null) =>
  p
    ? `Profile: ${p.name}\nLife stage: ${p.life_stage}\nMoments that create the need: ${parseJson<string[]>(p.triggers, []).join("; ")}\nPain points (in their words): ${parseJson<string[]>(p.pain_points, []).map((x) => `- ${x}`).join("\n")}\nWhat keeps them up at night: ${p.worries}`
    : "Profile: (none chosen)";

/**
 * A plan proposal for a quest (Section 6.4). The model fills topics, pain
 * points, hook angles, generators, and series for dates the schedule picks;
 * the result is then forced through the plan rules. Nothing is saved.
 */
export const draftPlan = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { questId: number }) => ({ questId: Number(d?.questId) }))
  .handler(async ({ data }): Promise<{ ok: boolean; slots: PlannedSlot[]; changes: string[]; error?: string; source: "ai" | "fallback" }> => {
    await ensureTables();
    const qrows = (await sql()`SELECT * FROM quests WHERE id = ${data.questId}`) as Array<Record<string, unknown>>;
    if (!qrows.length) return { ok: false, slots: [], changes: [], error: "Quest not found.", source: "fallback" };
    const quest = rowToQuest(qrows[0]);
    const profile = await profileFor(quest.profileId);
    const shows = ((await sql()`SELECT * FROM quest_series WHERE kind = 'recurring' AND active = TRUE`) as Array<Record<string, unknown>>).map(rowToSeries).filter((s) => quest.showIds.includes(s.id));
    // Posting days: the shows' weekdays first, then the rest spread out.
    const dates = scheduleDates(quest.startDate, quest.endDate, quest.postsPerWeek, shows.map((s) => s.defaultWeekday));
    if (!dates.length) return { ok: false, slots: [], changes: [], error: "The quest's dates leave no posting days.", source: "fallback" };
    const mix = targetMix(dates.length);
    const quiz = QUEST_CONFIG.quizzes[quest.offerQuiz];
    const generators = QUEST_CONFIG.generators.map((g) => `- ${g.id}: ${g.bestFor}${g.available ? "" : " (NOT BUILT YET, use sparingly)"}`).join("\n");
    const showLines = shows.length ? shows.map((s) => `- "${s.name}" on ${s.defaultWeekday}s, generator ${s.defaultGenerator}: ${s.description}`).join("\n") : "(none switched on)";
    const dateLines = dates.map((d) => `${d} (${weekdayOf(d)})`).join(", ");

    const system = `You plan short-form content campaigns for John "The Financial DM", a licensed term life agent who posts friendly, genuinely useful, lesser-known financial education on TikTok in a tavern-bartender voice. Success is booked calls, not views.

Return JSON only:
{"slots":[{"date":"YYYY-MM-DD","generator":"script|carousel|insight_card|social_card|meme","generatorReason":"one line","topic":"...","painPoint":"...","hookAngle":"...","seriesName":"optional","seriesKind":"multi_part|recurring","partNumber":1,"totalParts":3}]}

Rules:
- Use exactly the dates given, one slot each, in order.
- Every slot speaks to one of the profile's pain points (quote or closely paraphrase it) and points toward the quiz offer.
- Generator mix for this many posts, approximately: ${Object.entries(mix).map(([k, v]) => `${k} ${v}`).join(", ")}. Memes never above ${Math.round(QUEST_CONFIG.memeMaxShare * 100)}%. Favor scripts.
- At most ${QUEST_CONFIG.maxMultiPartSeriesPerQuest} multi-part series (2 to 4 parts, scripts, parts in date order, named like "New Parent Armor"). Give its parts seriesKind "multi_part", partNumber, totalParts.
- Use the recurring shows on their weekday when a date matches, with seriesKind "recurring" and the show's generator.
- Hook angles are specific and curiosity-driven, never clickbait; no promises of returns, rates, or approval; no numbers you cannot verify.
- Topics stay within: coverage, income protection, debt, saving, budgeting, benefits, beneficiaries and wills, and what happens to the family if something goes wrong.`;
    const user = `Quest: ${quest.name}
What we're testing: ${quest.testing}
Quiz offer: ${quiz.label}${quest.lootHighlight ? ` (loot to highlight: ${quest.lootHighlight})` : ""}
Platform: ${quest.platforms.map((p) => QUEST_CONFIG.platforms.find((x) => x.id === p)?.label ?? p).join(", ")}
Dates (${dates.length} posts): ${dateLines}
Generators:
${generators}
Recurring shows switched on:
${showLines}

${profileText(profile)}`;

    const reply = await callClaude({ system, user, maxTokens: 3000, tag: "quest-plan" });
    const parsed = parseJsonReply<{ slots?: unknown }>(reply, "quest-plan");
    let source: "ai" | "fallback" = "ai";
    let proposed: PlannedSlot[] = [];
    if (Array.isArray(parsed?.slots) && parsed!.slots.length) {
      const raw = parsed!.slots as Array<Record<string, unknown>>;
      proposed = dates.map((date, i) => {
        const s = raw[i] ?? raw[raw.length - 1] ?? {};
        const kind = s.seriesKind === "multi_part" ? "multi_part" : s.seriesKind === "recurring" ? "recurring" : undefined;
        return {
          date,
          platform: quest.platforms[0] ?? "tiktok",
          generator: genId(s.generator),
          generatorReason: text(s.generatorReason, 200) || "A good fit for this post.",
          topic: text(s.topic, 120) || "Financial basics",
          painPoint: text(s.painPoint, 200) || parseJson<string[]>(profile?.pain_points, [])[0] || "",
          hookAngle: text(s.hookAngle, 200),
          seriesName: kind ? text(s.seriesName, 80) || undefined : undefined,
          seriesKind: kind,
          partNumber: kind === "multi_part" ? int(s.partNumber, 1, 4, 1) : undefined,
          totalParts: kind === "multi_part" ? int(s.totalParts, 2, 4, 3) : undefined,
        };
      });
    } else {
      // No model reply: a plain plan from the rules so John still has a starting point.
      source = "fallback";
      const pains = parseJson<string[]>(profile?.pain_points, []);
      const order: GeneratorId[] = [];
      for (const [g, n] of Object.entries(mix) as Array<[GeneratorId, number]>) for (let i = 0; i < n; i++) order.push(g);
      proposed = dates.map((date, i) => {
        const show = shows.find((s) => s.defaultWeekday === weekdayOf(date));
        const generator = show ? show.defaultGenerator : order[i % order.length] ?? "script";
        return {
          date,
          platform: quest.platforms[0] ?? "tiktok",
          generator,
          generatorReason: show ? `${show.name} always uses this format.` : `${generatorById(generator)?.bestFor ?? "A good fit"}.`,
          topic: "Pick a topic in the forge",
          painPoint: pains[i % Math.max(1, pains.length)] ?? "",
          hookAngle: "",
          seriesName: show?.name,
          seriesKind: show ? "recurring" : undefined,
        };
      });
    }
    const { slots, changes } = enforcePlan(proposed);
    return { ok: true, slots, changes, source };
  });

/** Save the slots John accepted from a draft (Section 6.4). Creates the multi-part series they name. */
export const acceptPlan = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { questId: number; slots: PlannedSlot[] }) => ({ questId: Number(d?.questId), slots: Array.isArray(d?.slots) ? d.slots.slice(0, 60) : [] }))
  .handler(async ({ data }): Promise<{ ok: boolean; saved: number; error?: string }> => {
    await ensureTables();
    if (!data.questId || !data.slots.length) return { ok: false, saved: 0, error: "Nothing to save." };
    try {
      const shows = ((await sql()`SELECT * FROM quest_series WHERE kind = 'recurring'`) as Array<Record<string, unknown>>).map(rowToSeries);
      const multi = new Map<string, number>();
      let saved = 0;
      for (const raw of data.slots) {
        const s: PlannedSlot = {
          date: isoDate(raw.date),
          platform: text(raw.platform, 30) || "tiktok",
          generator: genId(raw.generator),
          generatorReason: text(raw.generatorReason, 200),
          topic: text(raw.topic, 120),
          painPoint: text(raw.painPoint, 200),
          hookAngle: text(raw.hookAngle, 200),
          seriesName: text(raw.seriesName, 80) || undefined,
          seriesKind: raw.seriesKind === "multi_part" || raw.seriesKind === "recurring" ? raw.seriesKind : undefined,
          partNumber: raw.partNumber ? int(raw.partNumber, 1, 4, 1) : undefined,
          totalParts: raw.totalParts ? int(raw.totalParts, 2, 4, 3) : undefined,
        };
        if (!s.date) continue;
        let seriesId: number | null = null;
        if (s.seriesName && s.seriesKind === "recurring") {
          seriesId = shows.find((x) => x.name.toLowerCase() === s.seriesName!.toLowerCase())?.id ?? null;
        } else if (s.seriesName && s.seriesKind === "multi_part") {
          if (!multi.has(s.seriesName)) {
            const rows = (await sql()`
              INSERT INTO quest_series (name, kind, quest_id, total_parts, outline, default_generator, description)
              VALUES (${s.seriesName}, 'multi_part', ${data.questId}, ${s.totalParts ?? 3}, '[]', 'script', ${"Drafted with the plan."})
              RETURNING id
            `) as Array<{ id: number }>;
            multi.set(s.seriesName, rows[0].id);
          }
          seriesId = multi.get(s.seriesName)!;
        }
        await sql()`
          INSERT INTO content_slots (quest_id, date, platform, generator, generator_reason, series_id, part_number, topic, pain_point, hook_angle, status)
          VALUES (${data.questId}, ${s.date}, ${s.platform}, ${s.generator}, ${s.generatorReason}, ${seriesId}, ${s.partNumber ?? null}, ${s.topic}, ${s.painPoint}, ${s.hookAngle}, 'idea')
        `;
        saved++;
      }
      return { ok: true, saved };
    } catch (e) {
      console.error("[quests] accept plan failed:", e);
      return { ok: false, saved: 0, error: "Could not save the plan." };
    }
  });

/** An outline for a multi-part series (Section 6.3): one line per part. A proposal only. */
export const draftSeriesOutline = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { questId: number; name: string; totalParts: number; description: string }) => ({
    questId: Number(d?.questId),
    name: text(d?.name, 80),
    totalParts: int(d?.totalParts, 2, 4, 3),
    description: text(d?.description, 400),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; outline: string[]; error?: string }> => {
    await ensureTables();
    const qrows = (await sql()`SELECT * FROM quests WHERE id = ${data.questId}`) as Array<Record<string, unknown>>;
    const quest = qrows.length ? rowToQuest(qrows[0]) : null;
    const profile = await profileFor(quest?.profileId ?? null);
    const system = `You outline short multi-part TikTok series for John "The Financial DM", a licensed term life agent with a friendly tavern-bartender voice. Return JSON only: {"outline":["Part 1: ...","Part 2: ..."]} with exactly ${data.totalParts} one-line summaries. Each part stands alone but builds on the last, speaks to the profile's pain points, and the final part points to the quiz. No promises of returns, rates, or approval.`;
    const user = `Series name: ${data.name}\nDescription: ${data.description || "(none)"}\nQuest: ${quest?.name ?? ""}. Testing: ${quest?.testing ?? ""}. Quiz: ${quest ? QUEST_CONFIG.quizzes[quest.offerQuiz].label : ""}\n\n${profileText(profile)}`;
    const reply = await callClaude({ system, user, maxTokens: 600, tag: "quest-outline" });
    const parsed = parseJsonReply<{ outline?: unknown }>(reply, "quest-outline");
    const outline = strList(parsed?.outline, 4, 200);
    if (outline.length < 2) return { ok: false, outline: [], error: "No outline came back. Try again or write the parts yourself." };
    return { ok: true, outline: outline.slice(0, data.totalParts) };
  });
