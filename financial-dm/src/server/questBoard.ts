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

/** Who a profile describes: a client John wants to help, or a person who might join the team (recruiting spec, Section 7.1). */
export type ProfileKind = "client" | "recruit";

export interface ClientProfile {
  id: number;
  kind: ProfileKind;
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
    kind: d?.kind === "recruit" ? "recruit" : "client",
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
      await sql()`ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS kind TEXT DEFAULT 'client'`;
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

export function rowToProfile(r: Record<string, unknown>): ClientProfile {
  return {
    id: Number(r.id),
    kind: r.kind === "recruit" ? "recruit" : "client",
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
type SeedProfile = Omit<ProfileInput, "id" | "archived" | "kind"> & { kind?: ProfileKind };

const EXAMPLE_PROFILES: SeedProfile[] = [
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

/** Words that would make a suggestion about identity rather than need. Any suggestion containing one is dropped. */
const IDENTITY_WORDS = /\b(race|racial|ethnic|ethnicity|religio|christian|muslim|jewish|hindu|buddhist|catholic|nationality|immigrant|citizenship|gender|transgender|gay|lesbian|lgbt|sexual orientation|disab|handicap|black|white|asian|latino|latina|hispanic|men|women|male|female)\b/i;

/** A second set of starters, for more variety. Seeded once, skipping any name John already has. */
/**
 * Recruit profiles (recruiting spec, Section 7.1): situations and interests
 * only, never protected traits. Seeded once, labeled "Example: edit or delete".
 */
const RECRUIT_EXAMPLE_PROFILES: SeedProfile[] = [
  {
    kind: "recruit",
    name: "Wants Remote Work",
    lifeStage: "Wants work they can do from home, on a schedule they set",
    triggers: ["a long commute that has stopped making sense", "a move to a new town", "wanting to be home more", "a job that went back to the office"],
    painPoints: ["I want to work from home without it being a scam.", "I'd like to set my own hours but still have someone to learn from.", "Every remote job I find is either a call center or a pyramid thing.", "I don't know if I'd be good at this without a team around me.", "I want to know exactly what it costs before I say yes to anything."],
    worries: "Is this a real job I can do from my kitchen table, and will anyone actually help me learn it?",
    whereTheyAre: ["tiktok"],
    recommendedQuiz: "life_insurance",
    notes: "",
  },
  {
    kind: "recruit",
    name: "Career Changer",
    lifeStage: "Ready to leave a field that stopped fitting, and looking at what comes next",
    triggers: ["a layoff or a restructure", "burnout in the current job", "a skill that no longer feels valued", "watching someone else make a switch"],
    painPoints: ["I've got years of experience that don't seem to count anywhere else.", "I can't afford to start over at the bottom.", "I don't want another job I'll be tired of in two years.", "I'd like to help people for a living, not just move numbers around.", "How long before I'd actually be earning, and what does that depend on?"],
    worries: "Can I really change fields at this point, and what would the first few months actually look like?",
    whereTheyAre: ["tiktok"],
    recommendedQuiz: "life_insurance",
    notes: "",
  },
  {
    kind: "recruit",
    name: "Customer Service Pro",
    lifeStage: "Good with people all day, in retail, hospitality, or a call center, and wants that skill to lead somewhere",
    triggers: ["another schedule change with no say in it", "a customer conversation that felt like real help", "a friend who got licensed", "hitting a pay ceiling"],
    painPoints: ["I'm great with people but there's no next step where I am.", "I already talk to strangers all day; I'd rather do it for something that matters.", "I want to be judged on how I treat people, not how fast I close a ticket.", "Licensing sounds hard and I don't know where to start.", "I need to know if this is commission-only before I get excited."],
    worries: "Would the people skills I already have actually carry over, and would I be on my own?",
    whereTheyAre: ["tiktok"],
    recommendedQuiz: "life_insurance",
    notes: "",
  },
];

const MORE_EXAMPLE_PROFILES: SeedProfile[] = [
  {
    name: "Single Parents",
    lifeStage: "Raising kids on one income",
    triggers: ["a separation or divorce", "a co-parent who isn't reliable with money", "childcare costs going up", "a school year starting"],
    painPoints: [
      "If something happens to me, there is no second income to fall back on",
      "I have no idea who would take care of the kids' money side of things",
      "Every month is tight and saving anything feels impossible",
      "I have life insurance through work but I'm not sure it's enough for one parent doing everything",
      "I keep hearing about wills and guardians and I haven't done either",
    ],
    worries: "If I'm not here, who takes care of my kids, and with what?",
    whereTheyAre: ["tiktok"],
    recommendedQuiz: "life_insurance",
    notes: "",
  },
  {
    name: "Small Business Owners",
    lifeStage: "Running a small business, often with a partner",
    triggers: ["signing a business loan", "taking on a partner", "the first employee", "a slow season"],
    painPoints: [
      "My income swings and I never know what a normal month looks like",
      "I personally guaranteed a loan and my family doesn't know what that means",
      "If something happened to my partner or me, the business would be stuck",
      "There is no HR, no benefits package, and nobody explaining any of this",
      "I put everything back into the business and nothing into a cushion",
    ],
    worries: "If something happened to me, would my family inherit the business or the debt?",
    whereTheyAre: ["tiktok"],
    recommendedQuiz: "life_insurance",
    notes: "",
  },
  {
    name: "Freelancers and Gig Workers",
    lifeStage: "Working for themselves without a benefits package",
    triggers: ["leaving a salaried job", "a big client ending", "tax time surprises", "a gap between projects"],
    painPoints: [
      "No paycheck means no automatic anything: no savings, no coverage, no retirement",
      "I lost the life insurance and benefits I had at my old job and haven't replaced them",
      "A slow month wipes out whatever I saved in a good one",
      "I don't know how much to set aside for taxes, let alone anything else",
      "I keep meaning to open a retirement account and don't know which kind",
    ],
    worries: "If I couldn't work for three months, what would actually happen?",
    whereTheyAre: ["tiktok"],
    recommendedQuiz: "financial",
    notes: "",
  },
  {
    name: "Caregivers of Aging Parents",
    lifeStage: "Helping a parent with money, care, or both",
    triggers: ["a parent's health scare", "moving a parent in", "handling a parent's bills", "a sibling disagreement about care"],
    painPoints: [
      "I'm paying for my parent's care and my own family's needs at the same time",
      "Nobody in the family knows where my parent's policies or documents are",
      "I don't know whether my parent has life insurance or what it covers",
      "My own saving stopped the day I started helping them",
      "If something happened to me, my parent would have nobody",
    ],
    worries: "Who takes care of my parent, and my kids, if I'm the one who's gone?",
    whereTheyAre: ["tiktok"],
    recommendedQuiz: "financial",
    notes: "",
  },
  {
    name: "Recent Graduates",
    lifeStage: "First real job after school",
    triggers: ["the first salary", "student loan payments starting", "the first benefits enrollment", "moving to a new city"],
    painPoints: [
      "I got a benefits form at work and picked things at random",
      "Student loans eat a big chunk before I even see my paycheck",
      "Everyone says start investing early but I don't know where",
      "I'm not sure I need life insurance yet, or when that changes",
      "I have no idea what an emergency fund should look like at my age",
    ],
    worries: "Am I already behind everyone else my age?",
    whereTheyAre: ["tiktok"],
    recommendedQuiz: "financial",
    notes: "",
  },
  {
    name: "Ten Years from Retirement",
    lifeStage: "Five to ten years from retiring",
    triggers: ["a milestone birthday", "kids finishing college", "paying off the house", "a retirement estimate that looked low"],
    painPoints: [
      "My term policy is ending soon and I don't know what to do next",
      "I'm not sure the retirement savings will actually last",
      "Our kids are grown and I don't know if we still need as much coverage",
      "We haven't updated our will or beneficiaries in twenty years",
      "One of us has a pension and the other doesn't, and we've never planned around that",
    ],
    worries: "Will the money last, and will my partner be okay if I go first?",
    whereTheyAre: ["tiktok"],
    recommendedQuiz: "financial",
    notes: "",
  },
];

async function seedExamplesOnce(): Promise<void> {
  const flags = (await sql()`SELECT key FROM quest_settings WHERE key IN ('profiles_seeded', 'profiles_seeded_v2', 'profiles_seeded_recruits')`) as Array<{ key: string }>;
  const done = new Set(flags.map((f) => f.key));
  const existing = new Set(((await sql()`SELECT lower(name) AS name FROM client_profiles`) as Array<{ name: string }>).map((r) => r.name));
  const insert = async (p: SeedProfile) => {
    if (existing.has(p.name.toLowerCase())) return;
    await sql()`
      INSERT INTO client_profiles (name, kind, life_stage, triggers, pain_points, worries, where_they_are, recommended_quiz, notes, example)
      VALUES (${p.name}, ${p.kind ?? "client"}, ${p.lifeStage}, ${JSON.stringify(p.triggers)}, ${JSON.stringify(p.painPoints)}, ${p.worries}, ${JSON.stringify(p.whereTheyAre)}, ${p.recommendedQuiz}, ${p.notes}, TRUE)
    `;
  };
  if (!done.has("profiles_seeded")) {
    for (const p of EXAMPLE_PROFILES) await insert(p);
    await sql()`INSERT INTO quest_settings (key, value) VALUES ('profiles_seeded', '1') ON CONFLICT (key) DO NOTHING`;
  }
  if (!done.has("profiles_seeded_v2")) {
    for (const p of MORE_EXAMPLE_PROFILES) await insert(p);
    await sql()`INSERT INTO quest_settings (key, value) VALUES ('profiles_seeded_v2', '1') ON CONFLICT (key) DO NOTHING`;
  }
  if (!done.has("profiles_seeded_recruits")) {
    for (const p of RECRUIT_EXAMPLE_PROFILES) await insert(p);
    await sql()`INSERT INTO quest_settings (key, value) VALUES ('profiles_seeded_recruits', '1') ON CONFLICT (key) DO NOTHING`;
  }
}

// ── Draft a whole profile ──────────────────────────────────────────

export const draftProfile = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { hint: string; existing: string[]; kind?: string }) => ({ hint: text(d?.hint, 200), existing: list(d?.existing, 40, 80), kind: (d?.kind === "recruit" ? "recruit" : "client") as ProfileKind }))
  .handler(async ({ data }): Promise<{ ok: boolean; profile?: Omit<ProfileInput, "id" | "archived">; error?: string }> => {
    const recruitSystem = `You help a licensed term life agent, John "The Financial DM", describe a kind of person who might want to join his team in life insurance and financial services.

Return JSON only:
{"name":"short plural group name","lifeStage":"their situation, one line","triggers":["4 to 6 moments that make someone look for a change"],"painPoints":["5 or 6 sentences in the person's own words about what they want from work and what holds them back, first person"],"worries":"the one question they would want answered before reaching out, in their words","recommendedQuiz":"life_insurance"}

Rules (hiring-safe): describe situations and interests only, such as wants remote work, changing careers, enjoys helping people, has customer service experience. Never mention or imply age, race, religion, sex, national origin, disability, pregnancy, family status, sexual orientation, or gender identity, and never words like young, energetic, recent grad, retiree, moms, dads. No earnings figures or lifestyle promises. Plain language, no em dashes. Do not repeat a profile already on the list.`;
    const system = data.kind === "recruit" ? recruitSystem : `You help a licensed term life agent, John "The Financial DM", describe a kind of client he wants to help with friendly, genuinely useful financial education on TikTok.

Return JSON only:
{"name":"short plural group name","lifeStage":"one line","triggers":["4 to 6 moments that create the need"],"painPoints":["5 or 6 sentences in the person's own words, first person"],"worries":"the one question that keeps them up at night, in their words","recommendedQuiz":"financial|life_insurance"}

Rules: describe needs, situations, and life events, never identities. Do not mention or imply race, ethnicity, religion, national origin, sex, sexual orientation, gender identity, disability, or age groups. Plain language, no jargon, no numbers, no em dashes. Pick "life_insurance" when the group's main need is protecting dependents or a mortgage, otherwise "financial". Do not repeat a profile already on the list.`;
    const user = `Hint from John: ${data.hint || "(none, propose a fresh kind of client he probably hasn't thought of)"}
Profiles he already has (do not repeat): ${data.existing.join("; ") || "(none)"}`;
    const reply = await callClaude({ system, user, maxTokens: 900, tag: "quest-profile" });
    const parsed = parseJsonReply<Record<string, unknown>>(reply, "quest-profile");
    if (!parsed) return { ok: false, error: "No draft came back. Try again, or add a hint." };
    const profile = cleanProfile({
      name: parsed.name as string,
      lifeStage: parsed.lifeStage as string,
      triggers: parsed.triggers as string[],
      painPoints: parsed.painPoints as string[],
      worries: parsed.worries as string,
      whereTheyAre: ["tiktok"],
      recommendedQuiz: parsed.recommendedQuiz === "financial" ? "financial" : "life_insurance",
      notes: "",
      kind: data.kind,
    });
    const all = [profile.name, profile.lifeStage, profile.worries, ...profile.triggers, ...profile.painPoints].join(" ");
    if (IDENTITY_WORDS.test(all)) return { ok: false, error: "The draft described who people are rather than what they need. Try again with a hint about their situation." };
    if (!profile.name || profile.painPoints.length < 3) return { ok: false, error: "The draft came back incomplete. Try again." };
    const { id: _id, archived: _a, ...rest } = profile;
    void _id;
    void _a;
    return { ok: true, profile: rest };
  });

/** Tables plus the example profiles, for other tools (the Sparring Dummy) that read profiles directly. */
export async function ensureQuestBoardTables(): Promise<void> {
  await ensureTables();
  await seedExamplesOnce();
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
          UPDATE client_profiles SET name = ${data.name}, kind = ${data.kind}, life_stage = ${data.lifeStage}, triggers = ${JSON.stringify(data.triggers)},
            pain_points = ${JSON.stringify(data.painPoints)}, worries = ${data.worries}, where_they_are = ${JSON.stringify(data.whereTheyAre)},
            recommended_quiz = ${data.recommendedQuiz}, notes = ${data.notes}, archived = ${data.archived}, updated_at = NOW()
          WHERE id = ${data.id}
        `;
        return { ok: true, id: data.id };
      }
      const rows = (await sql()`
        INSERT INTO client_profiles (name, kind, life_stage, triggers, pain_points, worries, where_they_are, recommended_quiz, notes, archived)
        VALUES (${data.name}, ${data.kind}, ${data.lifeStage}, ${JSON.stringify(data.triggers)}, ${JSON.stringify(data.painPoints)}, ${data.worries}, ${JSON.stringify(data.whereTheyAre)}, ${data.recommendedQuiz}, ${data.notes}, ${data.archived})
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


export const suggestPainPoints = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { lifeStage: string; triggers: string[]; existing: string[]; kind?: string }) => ({
    kind: (d?.kind === "recruit" ? "recruit" : "client") as ProfileKind,
    lifeStage: text(d?.lifeStage, 160),
    triggers: list(d?.triggers, 12),
    existing: list(d?.existing, 16, 200),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; suggestions: string[]; error?: string }> => {
    if (!data.lifeStage && data.triggers.length === 0) return { ok: false, suggestions: [], error: "Add a life stage or a trigger first." };
    const system = data.kind === "recruit" ? `You help a licensed term life agent, John "The Financial DM", understand what people who might join his team in life insurance and financial services want from work and what holds them back. Hiring-safe: situations and interests only, never age, family status, or any protected trait; no earnings figures. Return JSON only: {"painPoints":["5 to 8 first-person sentences"]}` : `You help a licensed term life agent, John "The Financial DM", understand the money worries of the people he wants to help. He posts friendly, genuinely useful financial education on TikTok.

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
