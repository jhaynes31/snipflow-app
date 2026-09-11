import { createServerFn } from "@tanstack/react-start";
import { sql } from "~/db";
import { requireAdmin } from "~/server/auth";
import { callClaude, parseJsonReply } from "~/server/contentVoice";
import type { QuizId } from "~/lib/questConfig";

/**
 * Quest Board, Phase 1: client profiles.
 *
 * Profiles describe needs, never identities (spec, Section 2.3): life
 * events, situations, and pain points. The pain point suggester sends only
 * a profile's life stage and triggers to the model, never lead data.
 */

export interface ClientProfile {
  id: number;
  name: string;
  lifeStage: string;
  triggers: string[];
  painPoints: string[];
  worries: string;
  whereTheyAre: string[];
  recommendedQuiz: QuizId;
  notes: string;
  /** Seeded starter profile, shown as "Example: edit or delete". */
  example: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ProfileInput = Omit<ClientProfile, "id" | "createdAt" | "updatedAt" | "example"> & { id?: number };

const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const list = (v: unknown, max: number, itemMax = 160): string[] =>
  Array.isArray(v) ? v.map((x) => text(x, itemMax)).filter(Boolean).slice(0, max) : [];

function cleanProfile(d: Partial<ProfileInput> | undefined): ProfileInput {
  const quiz: QuizId = d?.recommendedQuiz === "financial" ? "financial" : "life_insurance";
  return {
    id: typeof d?.id === "number" && Number.isFinite(d.id) ? d.id : undefined,
    name: text(d?.name, 80),
    lifeStage: text(d?.lifeStage, 160),
    triggers: list(d?.triggers, 12),
    painPoints: list(d?.painPoints, 16, 200),
    worries: text(d?.worries, 600),
    whereTheyAre: list(d?.whereTheyAre, 6, 30),
    recommendedQuiz: quiz,
    notes: text(d?.notes, 1000),
    archived: Boolean(d?.archived),
  };
}

let ready: Promise<void> | null = null;
function ensureTables(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql()`
        CREATE TABLE IF NOT EXISTS client_profiles (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          life_stage TEXT DEFAULT '',
          triggers TEXT DEFAULT '[]',
          pain_points TEXT DEFAULT '[]',
          worries TEXT DEFAULT '',
          where_they_are TEXT DEFAULT '[]',
          recommended_quiz TEXT DEFAULT 'life_insurance',
          notes TEXT DEFAULT '',
          example BOOLEAN DEFAULT FALSE,
          archived BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      await sql()`
        CREATE TABLE IF NOT EXISTS quest_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      `;
    })().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

const parseList = (v: unknown): string[] => {
  try {
    const arr = JSON.parse(String(v ?? "[]"));
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
};

function rowToProfile(r: Record<string, unknown>): ClientProfile {
  return {
    id: Number(r.id),
    name: String(r.name ?? ""),
    lifeStage: String(r.life_stage ?? ""),
    triggers: parseList(r.triggers),
    painPoints: parseList(r.pain_points),
    worries: String(r.worries ?? ""),
    whereTheyAre: parseList(r.where_they_are),
    recommendedQuiz: r.recommended_quiz === "financial" ? "financial" : "life_insurance",
    notes: String(r.notes ?? ""),
    example: Boolean(r.example),
    archived: Boolean(r.archived),
    createdAt: String(r.created_at ?? ""),
    updatedAt: String(r.updated_at ?? ""),
  };
}

/**
 * Starter profiles (spec, Section 5). Drafts built around life events and
 * the quiz topics; John edits or deletes them. Seeded once.
 */
const EXAMPLE_PROFILES: Array<Omit<ProfileInput, "id" | "archived">> = [
  {
    name: "New Parents",
    lifeStage: "Just had, or expecting, a baby",
    triggers: ["new baby on the way", "going from two incomes to one", "naming a guardian", "moving to a bigger place"],
    painPoints: [
      "We have a baby now and I have no idea how much life insurance we actually need",
      "Work coverage is all we have and I don't know if it's enough or if it follows me",
      "We keep meaning to name a guardian and write a will and never get to it",
      "One of us might stay home and we can't tell if the numbers work",
      "Daycare costs more than our rent and saving feels impossible right now",
    ],
    worries: "If something happened to one of us, could the other keep the house and still be there for the baby?",
    whereTheyAre: ["tiktok"],
    recommendedQuiz: "life_insurance",
    notes: "",
  },
  {
    name: "First-Time Homeowners",
    lifeStage: "Bought, or about to buy, a first home",
    triggers: ["closing on a mortgage", "first big monthly payment", "emergency fund spent on the down payment", "surprise repair bills"],
    painPoints: [
      "The mortgage is the biggest bill we've ever had and I don't know what happens to it if something happens to me",
      "Our whole emergency fund went into the down payment and closing costs",
      "Mortgage protection offers keep showing up in the mail and I can't tell if they're a rip-off",
      "Every dollar goes to the house and retirement saving has stopped",
      "Property taxes and insurance went up and the budget didn't",
    ],
    worries: "Could my partner keep this house on one income?",
    whereTheyAre: ["tiktok"],
    recommendedQuiz: "life_insurance",
    notes: "",
  },
  {
    name: "Job Changers",
    lifeStage: "Starting a new job, laid off, or going out on their own",
    triggers: ["new job with a new benefits package", "layoff or severance", "going freelance or 1099", "leaving an old 401(k) behind"],
    painPoints: [
      "My life insurance was through my old job and now it's gone",
      "I have an old 401(k) sitting somewhere and I don't know what to do with it",
      "Nobody explained the new benefits package and I picked things at random",
      "My income changed and my budget hasn't caught up",
      "I'm self-employed now and there's no HR to ask about any of this",
    ],
    worries: "Did I just lose coverage I didn't know I was counting on?",
    whereTheyAre: ["tiktok"],
    recommendedQuiz: "financial",
    notes: "",
  },
  {
    name: "Young Couples Starting Out",
    lifeStage: "Newly married or moving in together",
    triggers: ["merging money for the first time", "wedding or moving debt", "first joint goal like a house", "talking about kids"],
    painPoints: [
      "We've never talked honestly about money and it gets awkward fast",
      "One of us has debt the other one doesn't",
      "We don't know whether to combine accounts or keep them separate",
      "We want to save for a house but don't know where to start",
      "Neither of us has any life insurance and we're not sure we need it yet",
    ],
    worries: "Are we building a life together on a plan, or just hoping it works out?",
    whereTheyAre: ["tiktok"],
    recommendedQuiz: "financial",
    notes: "",
  },
];

async function seedExamplesOnce(): Promise<void> {
  const flag = (await sql()`SELECT value FROM quest_settings WHERE key = 'profiles_seeded'`) as Array<{ value: string }>;
  if (flag.length) return;
  for (const p of EXAMPLE_PROFILES) {
    await sql()`
      INSERT INTO client_profiles (name, life_stage, triggers, pain_points, worries, where_they_are, recommended_quiz, notes, example)
      VALUES (${p.name}, ${p.lifeStage}, ${JSON.stringify(p.triggers)}, ${JSON.stringify(p.painPoints)}, ${p.worries}, ${JSON.stringify(p.whereTheyAre)}, ${p.recommendedQuiz}, ${p.notes}, TRUE)
    `;
  }
  await sql()`INSERT INTO quest_settings (key, value) VALUES ('profiles_seeded', '1') ON CONFLICT (key) DO NOTHING`;
}

export const getProfiles = createServerFn().middleware([requireAdmin]).handler(async (): Promise<ClientProfile[]> => {
  await ensureTables();
  await seedExamplesOnce();
  const rows = (await sql()`SELECT * FROM client_profiles ORDER BY archived ASC, name ASC`) as Array<Record<string, unknown>>;
  return rows.map(rowToProfile);
});

export const saveProfile = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: Partial<ProfileInput>) => cleanProfile(d))
  .handler(async ({ data }): Promise<{ ok: boolean; id?: number; error?: string }> => {
    if (!data.name) return { ok: false, error: "Give the profile a name." };
    try {
      await ensureTables();
      if (data.id) {
        await sql()`
          UPDATE client_profiles SET name = ${data.name}, life_stage = ${data.lifeStage}, triggers = ${JSON.stringify(data.triggers)},
            pain_points = ${JSON.stringify(data.painPoints)}, worries = ${data.worries}, where_they_are = ${JSON.stringify(data.whereTheyAre)},
            recommended_quiz = ${data.recommendedQuiz}, notes = ${data.notes}, archived = ${data.archived}, updated_at = NOW()
          WHERE id = ${data.id}
        `;
        return { ok: true, id: data.id };
      }
      const rows = (await sql()`
        INSERT INTO client_profiles (name, life_stage, triggers, pain_points, worries, where_they_are, recommended_quiz, notes, archived)
        VALUES (${data.name}, ${data.lifeStage}, ${JSON.stringify(data.triggers)}, ${JSON.stringify(data.painPoints)}, ${data.worries}, ${JSON.stringify(data.whereTheyAre)}, ${data.recommendedQuiz}, ${data.notes}, ${data.archived})
        RETURNING id
      `) as Array<{ id: number }>;
      return { ok: true, id: rows[0]?.id };
    } catch (e) {
      console.error("[quest-board] save profile failed:", e);
      return { ok: false, error: "Could not save the profile." };
    }
  });

export const setProfileArchived = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: number; archived: boolean }) => ({ id: Number(d?.id), archived: Boolean(d?.archived) }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    try {
      await ensureTables();
      await sql()`UPDATE client_profiles SET archived = ${data.archived}, updated_at = NOW() WHERE id = ${data.id}`;
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

export const deleteProfile = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: number }) => ({ id: Number(d?.id) }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    try {
      await ensureTables();
      await sql()`DELETE FROM client_profiles WHERE id = ${data.id}`;
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

// ── Suggest pain points ────────────────────────────────────────────

/** Words that would make a suggestion about identity rather than need. Any suggestion containing one is dropped. */
const IDENTITY_WORDS = /\b(race|racial|ethnic|ethnicity|religio|christian|muslim|jewish|hindu|buddhist|catholic|nationality|immigrant|citizenship|gender|transgender|gay|lesbian|lgbt|sexual orientation|disab|handicap|black|white|asian|latino|latina|hispanic|men|women|male|female)\b/i;

export const suggestPainPoints = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { lifeStage: string; triggers: string[]; existing: string[] }) => ({
    lifeStage: text(d?.lifeStage, 160),
    triggers: list(d?.triggers, 12),
    existing: list(d?.existing, 16, 200),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; suggestions: string[]; error?: string }> => {
    if (!data.lifeStage && data.triggers.length === 0) return { ok: false, suggestions: [], error: "Add a life stage or a trigger first." };
    const system = `You help a licensed term life agent, John "The Financial DM", understand the money worries of the people he wants to help. He posts friendly, genuinely useful financial education on TikTok.

Return JSON only: {"painPoints": ["...", "..."]} with 6 to 8 items.

Each pain point is one sentence, in the person's own words, first person ("I..." or "We..."), plain language, no jargon, no numbers, and no em dashes. Focus on life events, situations, and money worries: coverage, income, debt, saving, budgeting, benefits, wills and beneficiaries, and what happens to the family if something goes wrong.

Hard rule: describe needs and situations, never identities. Do not mention or imply race, ethnicity, religion, national origin, sex, sexual orientation, gender identity, disability, or age groups. Do not repeat the existing pain points.`;
    const user = `Life stage: ${data.lifeStage || "(not given)"}
Moments that create the need: ${data.triggers.join("; ") || "(none listed)"}
Already listed (do not repeat): ${data.existing.join(" | ") || "(none)"}`;
    const reply = await callClaude({ system, user, maxTokens: 700, tag: "quest-pain-points" });
    const parsed = parseJsonReply<{ painPoints?: unknown }>(reply, "quest-pain-points");
    const raw = Array.isArray(parsed?.painPoints) ? parsed!.painPoints.map((s) => text(s, 200)).filter(Boolean) : [];
    const suggestions = raw.filter((s) => !IDENTITY_WORDS.test(s) && !data.existing.some((e) => e.toLowerCase() === s.toLowerCase())).slice(0, 8);
    if (!suggestions.length) return { ok: false, suggestions: [], error: "No suggestions came back. Try again, or add a trigger or two first." };
    return { ok: true, suggestions };
  });
