import { createServerFn } from "@tanstack/react-start";
import { sql } from "~/db";
import { requireAdmin } from "~/server/auth";
import { ensureQuestBoardTables, rowToProfile, type ClientProfile } from "~/server/questBoard";
import { callClaudeChat, parseJsonObject } from "~/server/aiChat.server";
import { DEFAULT_DIFFICULTY, MAX_TURNS, OUTCOMES, PRACTICE_MODEL_DEFAULT, temperamentById, temperamentsFor, type Conversation, type Difficulty, type Outcome, type PracticeMode } from "~/lib/practiceConfig";
import { OPENING_CUE, debriefSystemPrompt, debriefUserPrompt, hintSystemPrompt, hintUserPrompt, personaSystemPrompt, personaUserPrompt, playSystemPrompt, profileSnapshot, recruitingTrustBlock, type Persona, type ProfileDescription } from "~/lib/practicePrompts";
import { RUBRIC_SEEDS, normalizeRubric, scanJohnLines, validateDebrief, type AiDebrief, type Debrief } from "~/lib/practiceDebrief";

/**
 * The Sparring Dummy, server side (AI practice spec, Phase 1). Practice
 * sessions and saved personas live in their own tables, never in lead or
 * recruit records (Rule 2.6). The only things that reach the AI are a
 * profile's description, the generated persona, and the practice transcript
 * (Rule 2.1). No lead or recruit table is read here.
 */

const MODEL = () => process.env.PRACTICE_MODEL || PRACTICE_MODEL_DEFAULT;
const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

let ready: Promise<void> | null = null;
export function ensurePracticeTables(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql()`
        CREATE TABLE IF NOT EXISTS practice_sessions (
          id SERIAL PRIMARY KEY,
          mode TEXT NOT NULL DEFAULT 'objection',
          conversation TEXT NOT NULL DEFAULT 'coverage',
          profile_id INTEGER,
          profile_snapshot TEXT NOT NULL DEFAULT '',
          persona TEXT NOT NULL DEFAULT '{}',
          temperament TEXT NOT NULL DEFAULT '',
          difficulty INTEGER NOT NULL DEFAULT 2,
          script_id TEXT,
          script_version INTEGER,
          transcript TEXT NOT NULL DEFAULT '[]',
          sections_covered TEXT,
          outcome TEXT,
          debrief TEXT,
          practitioner TEXT NOT NULL DEFAULT 'john',
          recruit_id INTEGER,
          shared_as_example BOOLEAN NOT NULL DEFAULT FALSE,
          ended_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )`;
      await sql()`CREATE TABLE IF NOT EXISTS practice_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '', updated_at TIMESTAMPTZ DEFAULT NOW())`;
      await sql()`
        CREATE TABLE IF NOT EXISTS practice_personas (
          id SERIAL PRIMARY KEY,
          conversation TEXT NOT NULL DEFAULT 'coverage',
          profile_id INTEGER,
          profile_snapshot TEXT NOT NULL DEFAULT '',
          persona TEXT NOT NULL DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT NOW()
        )`;
    })().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

export interface TranscriptEntry {
  role: "john" | "persona" | "system";
  text: string;
  at: string;
  /** "hint" marks a pause hint, so the debrief can note it (Section 7.1). */
  kind?: "hint" | "note";
  sectionId?: string;
}

export interface PracticeSession {
  id: number;
  mode: PracticeMode;
  conversation: Conversation;
  profileId: number | null;
  profileSnapshot: string;
  persona: Persona;
  temperament: string;
  difficulty: Difficulty;
  transcript: TranscriptEntry[];
  outcome: Outcome | null;
  debrief: Debrief | null;
  practitioner: "john" | "recruit";
  sharedAsExample: boolean;
  turns: number;
  maxTurns: number;
  endedAt: string | null;
  createdAt: string;
}

export interface SavedPersona {
  id: number;
  conversation: Conversation;
  profileId: number | null;
  profileSnapshot: string;
  persona: Persona;
  createdAt: string;
}

const parsePersona = (raw: unknown): Persona => {
  try {
    const o = (typeof raw === "string" ? JSON.parse(raw) : raw) as Partial<Persona>;
    return { name: text(o?.name, 40) || "Alex", ageRange: text(o?.ageRange, 40), household: text(o?.household, 160), backstory: text(o?.backstory, 800), concern: text(o?.concern, 300) };
  } catch {
    return { name: "Alex", ageRange: "", household: "", backstory: "", concern: "" };
  }
};
const parseTranscript = (raw: unknown): TranscriptEntry[] => {
  try {
    const a = (typeof raw === "string" ? JSON.parse(raw) : raw) as TranscriptEntry[];
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
};
const isOutcome = (v: unknown): v is Outcome => OUTCOMES.some((o) => o.id === v);
const parseDebrief = (raw: unknown): Debrief | null => {
  if (raw == null || raw === "") return null;
  try {
    const o = (typeof raw === "string" ? JSON.parse(raw) : raw) as Debrief;
    return o && Array.isArray(o.flags) ? o : null;
  } catch {
    return null;
  }
};
const johnTurns = (t: TranscriptEntry[]) => t.filter((m) => m.role === "john").length;

function rowToSession(r: Record<string, unknown>): PracticeSession {
  const transcript = parseTranscript(r.transcript);
  const d = Number(r.difficulty);
  return {
    id: Number(r.id),
    mode: r.mode === "presentation" ? "presentation" : "objection",
    conversation: r.conversation === "recruiting" ? "recruiting" : "coverage",
    profileId: r.profile_id == null ? null : Number(r.profile_id),
    profileSnapshot: String(r.profile_snapshot ?? ""),
    persona: parsePersona(r.persona),
    temperament: String(r.temperament ?? ""),
    difficulty: (d >= 1 && d <= 4 ? d : DEFAULT_DIFFICULTY) as Difficulty,
    transcript,
    outcome: isOutcome(r.outcome) ? r.outcome : null,
    debrief: parseDebrief(r.debrief),
    practitioner: r.practitioner === "recruit" ? "recruit" : "john",
    sharedAsExample: r.shared_as_example === true || r.shared_as_example === "t",
    turns: johnTurns(transcript),
    maxTurns: MAX_TURNS,
    endedAt: r.ended_at == null ? null : String(r.ended_at),
    createdAt: String(r.created_at ?? ""),
  };
}

const describe = (p: ClientProfile): ProfileDescription => ({ name: p.name, lifeStage: p.lifeStage, triggers: p.triggers, painPoints: p.painPoints, worries: p.worries, notes: p.notes });

async function loadProfiles(): Promise<ClientProfile[]> {
  await ensureQuestBoardTables();
  const rows = (await sql()`SELECT * FROM client_profiles WHERE archived = FALSE ORDER BY name ASC`) as Array<Record<string, unknown>>;
  return rows.map(rowToProfile);
}

// ── Setup ───────────────────────────────────────────────────────────

export interface PracticeSetup {
  profiles: Array<{ id: number; kind: "client" | "recruit"; name: string; lifeStage: string; worries: string }>;
  savedPersonas: SavedPersona[];
  recent: PracticeSession[];
  temperaments: Record<Conversation, string[]>;
  model: string;
}

export const getPracticeSetup = createServerFn()
  .middleware([requireAdmin])
  .handler(async (): Promise<PracticeSetup> => {
    await ensurePracticeTables();
    const profiles = await loadProfiles();
    const saved = (await sql()`SELECT * FROM practice_personas ORDER BY created_at DESC LIMIT 50`) as Array<Record<string, unknown>>;
    const recent = (await sql()`SELECT * FROM practice_sessions WHERE practitioner = 'john' ORDER BY created_at DESC LIMIT 20`) as Array<Record<string, unknown>>;
    return {
      profiles: profiles.map((p) => ({ id: p.id, kind: p.kind === "recruit" ? "recruit" : "client", name: p.name, lifeStage: p.lifeStage, worries: p.worries })),
      savedPersonas: saved.map((r) => ({ id: Number(r.id), conversation: r.conversation === "recruiting" ? "recruiting" : "coverage", profileId: r.profile_id == null ? null : Number(r.profile_id), profileSnapshot: String(r.profile_snapshot ?? ""), persona: parsePersona(r.persona), createdAt: String(r.created_at ?? "") })),
      recent: recent.map(rowToSession),
      temperaments: { coverage: temperamentsFor("coverage").map((t) => t.id), recruiting: temperamentsFor("recruiting").map((t) => t.id) },
      model: MODEL(),
    };
  });

// ── Personas ────────────────────────────────────────────────────────

/** Section 4: a fictional composite from the profile description. Reroll by calling again with the names to avoid. */
export const generatePersona = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { profileId: number; conversation: string; avoidNames?: string[] }) => ({
    profileId: Number(d?.profileId),
    conversation: (d?.conversation === "recruiting" ? "recruiting" : "coverage") as Conversation,
    avoidNames: Array.isArray(d?.avoidNames) ? d!.avoidNames.map((n) => text(n, 40)).filter(Boolean).slice(0, 10) : [],
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string; persona?: Persona; snapshot?: string }> => {
    const profiles = await loadProfiles();
    const p = profiles.find((x) => x.id === data.profileId);
    if (!p) return { ok: false, error: "Pick a profile first." };
    const snapshot = profileSnapshot(describe(p));
    const reply = await callClaudeChat({ system: personaSystemPrompt(), messages: [{ role: "user", content: personaUserPrompt(describe(p), data.conversation, data.avoidNames) }], maxTokens: 500, model: MODEL(), tag: "practice-persona" });
    const parsed = parseJsonObject<Partial<Persona>>(reply);
    if (!parsed?.name) return { ok: false, error: "Could not invent a persona just now. Try again in a moment." };
    return { ok: true, persona: parsePersona(parsed), snapshot };
  });

export const savePersona = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { conversation: string; profileId?: number | null; profileSnapshot: string; persona: Persona }) => ({
    conversation: (d?.conversation === "recruiting" ? "recruiting" : "coverage") as Conversation,
    profileId: Number(d?.profileId) > 0 ? Number(d?.profileId) : null,
    profileSnapshot: text(d?.profileSnapshot, 2000),
    persona: parsePersona(d?.persona),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; id?: number; error?: string }> => {
    try {
      await ensurePracticeTables();
      const rows = (await sql()`INSERT INTO practice_personas (conversation, profile_id, profile_snapshot, persona) VALUES (${data.conversation}, ${data.profileId}, ${data.profileSnapshot}, ${JSON.stringify(data.persona)}) RETURNING id`) as Array<{ id: number }>;
      return { ok: true, id: Number(rows[0]?.id) };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

export const deletePersona = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: number }) => ({ id: Number(d?.id) }))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    await ensurePracticeTables();
    await sql()`DELETE FROM practice_personas WHERE id = ${data.id}`;
    return { ok: true };
  });

// ── Sessions ────────────────────────────────────────────────────────

async function trustFacts(): Promise<Record<string, string>> {
  try {
    const rows = (await sql()`SELECT key, value FROM guild_facts WHERE confirmed = TRUE AND key IN ('industry','roleTitle','workArrangement','payBasis','licensingRequired','costToInterview','interviewFormat','johnFullName')`) as Array<{ key: string; value: string }>;
    return Object.fromEntries(rows.map((r) => [r.key, String(r.value ?? "")]));
  } catch {
    return {};
  }
}

async function systemFor(s: PracticeSession): Promise<string> {
  const base = playSystemPrompt({ persona: s.persona, conversation: s.conversation, temperament: s.temperament, difficulty: s.difficulty, maxTurns: MAX_TURNS });
  return s.conversation === "recruiting" ? base + recruitingTrustBlock(await trustFacts()) : base;
}

function chatMessages(transcript: TranscriptEntry[]): Array<{ role: "user" | "assistant"; content: string }> {
  const msgs: Array<{ role: "user" | "assistant"; content: string }> = [{ role: "user", content: OPENING_CUE }];
  for (const m of transcript) {
    if (m.role === "john") msgs.push({ role: "user", content: m.text });
    else if (m.role === "persona") msgs.push({ role: "assistant", content: JSON.stringify({ say: m.text, ended: false, outcome: null }) });
  }
  return msgs;
}

interface PersonaReply {
  say: string;
  ended: boolean;
  outcome: Outcome | null;
}

async function personaTurn(s: PracticeSession): Promise<PersonaReply | null> {
  const reply = await callClaudeChat({ system: await systemFor(s), messages: chatMessages(s.transcript), maxTokens: 400, model: MODEL(), tag: "practice-play" });
  const parsed = parseJsonObject<Partial<PersonaReply>>(reply);
  if (!parsed) {
    // A plain-text reply still counts; the persona just did not end anything.
    if (reply && reply.trim()) return { say: reply.trim().slice(0, 1200), ended: false, outcome: null };
    return null;
  }
  return { say: text(parsed.say, 1200) || "...", ended: Boolean(parsed.ended), outcome: parsed.ended && isOutcome(parsed.outcome) ? parsed.outcome : null };
}

async function loadSession(id: number): Promise<PracticeSession | null> {
  await ensurePracticeTables();
  const rows = (await sql()`SELECT * FROM practice_sessions WHERE id = ${id}`) as Array<Record<string, unknown>>;
  return rows.length ? rowToSession(rows[0]) : null;
}

async function storeTranscript(s: PracticeSession, extra?: { outcome?: Outcome; ended?: boolean }): Promise<void> {
  if (extra?.ended) {
    await sql()`UPDATE practice_sessions SET transcript = ${JSON.stringify(s.transcript)}, outcome = ${extra.outcome ?? null}, ended_at = NOW(), updated_at = NOW() WHERE id = ${s.id}`;
  } else {
    await sql()`UPDATE practice_sessions SET transcript = ${JSON.stringify(s.transcript)}, updated_at = NOW() WHERE id = ${s.id}`;
  }
}

export interface SessionResult {
  ok: boolean;
  error?: string;
  session?: PracticeSession;
}

/** Section 7.1: creates the session and asks the persona to open. */
export const startSession = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { conversation: string; profileId?: number | null; profileSnapshot: string; persona: Persona; temperament: string; difficulty: number; mode?: string }) => ({
    conversation: (d?.conversation === "recruiting" ? "recruiting" : "coverage") as Conversation,
    profileId: Number(d?.profileId) > 0 ? Number(d?.profileId) : null,
    profileSnapshot: text(d?.profileSnapshot, 2000),
    persona: parsePersona(d?.persona),
    temperament: text(d?.temperament, 40),
    difficulty: ([1, 2, 3, 4].includes(Number(d?.difficulty)) ? Number(d?.difficulty) : DEFAULT_DIFFICULTY) as Difficulty,
    mode: "objection" as PracticeMode,
  }))
  .handler(async ({ data }): Promise<SessionResult> => {
    const t = temperamentById(data.temperament);
    if (!t || !t.appliesTo.includes(data.conversation)) return { ok: false, error: "Pick a temperament that fits this conversation." };
    if (!data.persona.name) return { ok: false, error: "Generate a persona first." };
    try {
      await ensurePracticeTables();
      const rows = (await sql()`
        INSERT INTO practice_sessions (mode, conversation, profile_id, profile_snapshot, persona, temperament, difficulty, transcript, practitioner)
        VALUES (${data.mode}, ${data.conversation}, ${data.profileId}, ${data.profileSnapshot}, ${JSON.stringify(data.persona)}, ${data.temperament}, ${data.difficulty}, '[]', 'john')
        RETURNING *`) as Array<Record<string, unknown>>;
      const s = rowToSession(rows[0]);
      const first = await personaTurn(s);
      if (!first) return { ok: false, error: "The practice partner is not answering right now. Check the AI key, or try again in a moment." };
      s.transcript.push({ role: "persona", text: first.say, at: new Date().toISOString() });
      await storeTranscript(s);
      return { ok: true, session: s };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

export const getSession = createServerFn()
  .middleware([requireAdmin])
  .validator((d: { id: number }) => ({ id: Number(d?.id) }))
  .handler(async ({ data }): Promise<PracticeSession | null> => loadSession(data.id));

/** John speaks; the persona answers. Ends at maxTurns or when the persona decides to end it. */
export const sendTurn = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: number; text: string }) => ({ id: Number(d?.id), text: text(d?.text, 2000) }))
  .handler(async ({ data }): Promise<SessionResult> => {
    if (!data.text) return { ok: false, error: "Say something first." };
    const s = await loadSession(data.id);
    if (!s) return { ok: false, error: "That session is gone." };
    if (s.endedAt) return { ok: false, error: "This session has ended.", session: s };
    s.transcript.push({ role: "john", text: data.text, at: new Date().toISOString() });
    const reply = await personaTurn(s);
    if (!reply) {
      s.transcript.pop();
      return { ok: false, error: "The practice partner did not answer. Try again.", session: s };
    }
    s.transcript.push({ role: "persona", text: reply.say, at: new Date().toISOString() });
    const turns = johnTurns(s.transcript);
    if (reply.ended) {
      s.transcript.push({ role: "system", text: `${s.persona.name} ended the conversation.`, at: new Date().toISOString(), kind: "note" });
      await storeTranscript(s, { ended: true, outcome: reply.outcome ?? "ended_early" });
      return { ok: true, session: { ...s, outcome: reply.outcome ?? "ended_early", endedAt: new Date().toISOString(), turns } };
    }
    if (turns >= MAX_TURNS) {
      s.transcript.push({ role: "system", text: `Practice cap reached (${MAX_TURNS} exchanges). Pick how it ended.`, at: new Date().toISOString(), kind: "note" });
      await storeTranscript(s);
      return { ok: true, session: { ...s, turns } };
    }
    await storeTranscript(s);
    return { ok: true, session: { ...s, turns } };
  });

/** Section 7.1: Pause for a hint about what the persona is actually worried about. Marked in the transcript. */
export const pauseHint = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: number }) => ({ id: Number(d?.id) }))
  .handler(async ({ data }): Promise<SessionResult> => {
    const s = await loadSession(data.id);
    if (!s) return { ok: false, error: "That session is gone." };
    const reply = await callClaudeChat({ system: hintSystemPrompt(), messages: [{ role: "user", content: hintUserPrompt(s.persona, s.transcript) }], maxTokens: 200, model: MODEL(), tag: "practice-hint" });
    const hint = text(parseJsonObject<{ hint?: string }>(reply)?.hint ?? reply, 500);
    if (!hint) return { ok: false, error: "No hint available right now.", session: s };
    s.transcript.push({ role: "system", text: hint, at: new Date().toISOString(), kind: "hint" });
    await storeTranscript(s);
    return { ok: true, session: s };
  });

/** John ends it and says how it went. The outcome is his read, not a score. */
export const endSession = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: number; outcome: string }) => ({ id: Number(d?.id), outcome: (isOutcome(d?.outcome) ? d!.outcome : "ended_early") as Outcome }))
  .handler(async ({ data }): Promise<SessionResult> => {
    const s = await loadSession(data.id);
    if (!s) return { ok: false, error: "That session is gone." };
    if (!s.endedAt) {
      s.transcript.push({ role: "system", text: "John ended the practice.", at: new Date().toISOString(), kind: "note" });
      await storeTranscript(s, { ended: true, outcome: data.outcome });
    }
    return { ok: true, session: { ...s, outcome: s.endedAt ? s.outcome : data.outcome, endedAt: s.endedAt ?? new Date().toISOString() } };
  });

export const deleteSession = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: number }) => ({ id: Number(d?.id) }))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    await ensurePracticeTables();
    await sql()`DELETE FROM practice_sessions WHERE id = ${data.id}`;
    return { ok: true };
  });


// ── Rubrics (Section 8.2) ───────────────────────────────────────────

export type Rubrics = Record<Conversation, string[]>;

async function loadRubrics(): Promise<Rubrics> {
  await ensurePracticeTables();
  const rows = (await sql()`SELECT key, value FROM practice_settings WHERE key IN ('rubric_coverage', 'rubric_recruiting')`) as Array<{ key: string; value: string }>;
  const get = (k: Conversation) => {
    const row = rows.find((r) => r.key === `rubric_${k}`);
    if (!row) return RUBRIC_SEEDS[k];
    try {
      return normalizeRubric(JSON.parse(row.value));
    } catch {
      return RUBRIC_SEEDS[k];
    }
  };
  return { coverage: get("coverage"), recruiting: get("recruiting") };
}

export const getRubrics = createServerFn()
  .middleware([requireAdmin])
  .handler(async (): Promise<Rubrics> => loadRubrics());

/** John's own list of things to notice. Saved as typed; an empty list is allowed and means "no rubric notes". */
export const saveRubric = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { conversation: string; items: string[] | string }) => ({ conversation: (d?.conversation === "recruiting" ? "recruiting" : "coverage") as Conversation, items: normalizeRubric(d?.items) }))
  .handler(async ({ data }): Promise<{ ok: boolean; items: string[] }> => {
    await ensurePracticeTables();
    const key = `rubric_${data.conversation}`;
    await sql()`INSERT INTO practice_settings (key, value, updated_at) VALUES (${key}, ${JSON.stringify(data.items)}, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`;
    return { ok: true, items: data.items };
  });

// ── Debrief (Section 8) ─────────────────────────────────────────────

/** Builds the debrief once a session has ended and stores it. Idempotent: a stored debrief is returned as is. */
export const getDebrief = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: number; refresh?: boolean }) => ({ id: Number(d?.id), refresh: Boolean(d?.refresh) }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string; debrief?: Debrief }> => {
    const s = await loadSession(data.id);
    if (!s) return { ok: false, error: "That session is gone." };
    if (!s.endedAt) return { ok: false, error: "The session has not ended yet." };
    if (s.debrief && !data.refresh) return { ok: true, debrief: s.debrief };
    const johnLines = s.transcript.filter((m) => m.role === "john").map((m) => m.text);
    const rubric = (await loadRubrics())[s.conversation];
    const outcome = s.outcome ?? "ended_early";
    // Deterministic flags first: the project's own word lists, applied to John's lines only.
    const flags = scanJohnLines(johnLines, s.conversation);
    const reply = await callClaudeChat({ system: debriefSystemPrompt(), messages: [{ role: "user", content: debriefUserPrompt({ conversation: s.conversation, persona: s.persona, outcome, rubric, transcript: s.transcript }) }], maxTokens: 900, model: MODEL(), tag: "practice-debrief" });
    const ai = parseJsonObject<AiDebrief>(reply);
    const v = validateDebrief(ai, rubric, johnLines);
    const debrief: Debrief = {
      outcome,
      summary: v.summary || (ai ? "" : "The reviewer was not available, so this debrief has the rule checks only."),
      flags: [...flags, ...(s.conversation === "recruiting" ? v.dodges : [])],
      concern: s.persona.concern,
      concernAddressed: v.concernAddressed,
      concernNote: v.concernNote,
      rubric: v.rubric,
      hintsUsed: s.transcript.filter((m) => m.kind === "hint").length,
      tryNext: v.tryNext,
      generatedAt: new Date().toISOString(),
    };
    await sql()`UPDATE practice_sessions SET debrief = ${JSON.stringify(debrief)}, updated_at = NOW() WHERE id = ${s.id}`;
    return { ok: true, debrief };
  });
