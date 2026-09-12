import { createServerFn } from "@tanstack/react-start";
import { sql } from "~/db";
import { requireAdmin } from "~/server/auth";
import { ensureQuestBoardTables, rowToProfile, type ClientProfile } from "~/server/questBoard";
import { callClaudeChat, parseJsonObject } from "~/server/aiChat.server";
import { DEFAULT_DIFFICULTY, MAX_TURNS, OUTCOMES, PRACTICE_MODEL_DEFAULT, temperamentById, temperamentsFor, type Conversation, type Difficulty, type Outcome, type PracticeMode } from "~/lib/practiceConfig";
import { OPENING_CUE, debriefSystemPrompt, debriefUserPrompt, hintSystemPrompt, hintUserPrompt, personaSystemPrompt, personaUserPrompt, playSystemPrompt, profileSnapshot, recruitingTrustBlock, type Persona, type ProfileDescription } from "~/lib/practicePrompts";
import { RUBRIC_SEEDS, normalizeRubric, scanJohnLines, validateDebrief, type AiDebrief, type Debrief } from "~/lib/practiceDebrief";
import { JOHN_RECRUITING_PRESENTATION, interruptionChance, normalizeSections, pickJumpTarget, presentationSummary, type Presentation, type PresentationSection, type SectionProgress } from "~/lib/practicePresentation";
import { disengageCue, interruptionCue, presentationBlock, presentationOpeningCue, sectionReactionCue } from "~/lib/practicePrompts";

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
      await sql()`ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS script_snapshot TEXT`;
      await sql()`
        CREATE TABLE IF NOT EXISTS practice_presentations (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          conversation TEXT NOT NULL DEFAULT 'recruiting',
          version INTEGER NOT NULL DEFAULT 1,
          sections TEXT NOT NULL DEFAULT '[]',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )`;
      // John's recruiting presentation, seeded once; he edits it on the Practice page.
      const [c] = (await sql()`SELECT count(*)::int AS n FROM practice_presentations`) as Array<{ n: number }>;
      if (!Number(c?.n)) await sql()`INSERT INTO practice_presentations (name, conversation, version, sections) VALUES (${JOHN_RECRUITING_PRESENTATION.name}, ${JOHN_RECRUITING_PRESENTATION.conversation}, 1, ${JSON.stringify(JOHN_RECRUITING_PRESENTATION.sections)})`;
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
  kind?: "hint" | "note" | "interrupt" | "drift" | "section" | "said";
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
  /** Presentation mode: the outline as it was when the session started, and progress per section. */
  presentation: { id: number; name: string; version: number; sections: PresentationSection[] } | null;
  progress: SectionProgress[];
  /** The persona interrupted and John has not answered yet. */
  pendingInterrupt: boolean;
  /** Test rigs shorten the mid-section timer. */
  fast: boolean;
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
const parseSnapshot = (raw: unknown): PracticeSession["presentation"] => {
  if (raw == null || raw === "") return null;
  try {
    const o = (typeof raw === "string" ? JSON.parse(raw) : raw) as { id: number; name: string; version: number; sections: unknown };
    return o && o.name ? { id: Number(o.id), name: String(o.name), version: Number(o.version) || 1, sections: normalizeSections(o.sections) } : null;
  } catch {
    return null;
  }
};
const parseProgress = (raw: unknown): SectionProgress[] => {
  try {
    const a = (typeof raw === "string" ? JSON.parse(raw) : raw) as SectionProgress[];
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
};
/** True when the last persona line was an interruption and John has not spoken since. */
const hasPendingInterrupt = (t: TranscriptEntry[]): boolean => {
  for (let i = t.length - 1; i >= 0; i--) {
    if (t[i].role === "john") return false;
    if (t[i].role === "persona") return t[i].kind === "interrupt";
  }
  return false;
};
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
    presentation: parseSnapshot(r.script_snapshot),
    progress: parseProgress(r.sections_covered),
    pendingInterrupt: hasPendingInterrupt(transcript),
    fast: process.env.PRACTICE_FAST === "1",
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
  let base = playSystemPrompt({ persona: s.persona, conversation: s.conversation, temperament: s.temperament, difficulty: s.difficulty, maxTurns: MAX_TURNS });
  if (s.presentation) base += presentationBlock(s.presentation.name, s.presentation.sections);
  return s.conversation === "recruiting" ? base + recruitingTrustBlock(await trustFacts()) : base;
}

function chatMessages(transcript: TranscriptEntry[], opening: string = OPENING_CUE): Array<{ role: "user" | "assistant"; content: string }> {
  const msgs: Array<{ role: "user" | "assistant"; content: string }> = [{ role: "user", content: opening }];
  for (const m of transcript) {
    if (m.role === "john") msgs.push({ role: "user", content: m.kind === "said" ? `[During the section, John said:] ${m.text}` : m.text });
    else if (m.role === "persona") msgs.push({ role: "assistant", content: JSON.stringify({ say: m.text, ended: false, outcome: null }) });
    else if (m.role === "system" && m.kind === "section") msgs.push({ role: "user", content: m.text });
  }
  return msgs;
}

interface PersonaReply {
  say: string;
  ended: boolean;
  outcome: Outcome | null;
}

async function personaTurn(s: PracticeSession, cue?: string): Promise<PersonaReply | null> {
  const opening = s.presentation ? presentationOpeningCue(s.presentation.sections[0]) : OPENING_CUE;
  const msgs = chatMessages(s.transcript, opening);
  if (cue) msgs.push({ role: "user", content: cue });
  const reply = await callClaudeChat({ system: await systemFor(s), messages: msgs, maxTokens: 400, model: MODEL(), tag: "practice-play" });
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
    await sql()`UPDATE practice_sessions SET transcript = ${JSON.stringify(s.transcript)}, sections_covered = ${JSON.stringify(s.progress)}, outcome = ${extra.outcome ?? null}, ended_at = NOW(), updated_at = NOW() WHERE id = ${s.id}`;
  } else {
    await sql()`UPDATE practice_sessions SET transcript = ${JSON.stringify(s.transcript)}, sections_covered = ${JSON.stringify(s.progress)}, updated_at = NOW() WHERE id = ${s.id}`;
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
  .validator((d: { conversation: string; profileId?: number | null; profileSnapshot: string; persona: Persona; temperament: string; difficulty: number; mode?: string; presentationId?: number }) => ({
    conversation: (d?.conversation === "recruiting" ? "recruiting" : "coverage") as Conversation,
    profileId: Number(d?.profileId) > 0 ? Number(d?.profileId) : null,
    profileSnapshot: text(d?.profileSnapshot, 2000),
    persona: parsePersona(d?.persona),
    temperament: text(d?.temperament, 40),
    difficulty: ([1, 2, 3, 4].includes(Number(d?.difficulty)) ? Number(d?.difficulty) : DEFAULT_DIFFICULTY) as Difficulty,
    mode: (d?.mode === "presentation" ? "presentation" : "objection") as PracticeMode,
    presentationId: Number(d?.presentationId) > 0 ? Number(d?.presentationId) : null,
  }))
  .handler(async ({ data }): Promise<SessionResult> => {
    const t = temperamentById(data.temperament);
    if (!t || !t.appliesTo.includes(data.conversation)) return { ok: false, error: "Pick a temperament that fits this conversation." };
    if (!data.persona.name) return { ok: false, error: "Generate a persona first." };
    try {
      await ensurePracticeTables();
      let snapshot: string | null = null;
      let scriptId: string | null = null;
      let scriptVersion: number | null = null;
      if (data.mode === "presentation") {
        const pres = data.presentationId ? await loadPresentation(data.presentationId) : null;
        if (!pres || !pres.sections.length) return { ok: false, error: "Pick a presentation with at least one section." };
        snapshot = JSON.stringify({ id: pres.id, name: pres.name, version: pres.version, sections: pres.sections });
        scriptId = String(pres.id);
        scriptVersion = pres.version;
      }
      const rows = (await sql()`
        INSERT INTO practice_sessions (mode, conversation, profile_id, profile_snapshot, persona, temperament, difficulty, transcript, practitioner, script_id, script_version, script_snapshot, sections_covered)
        VALUES (${data.mode}, ${data.conversation}, ${data.profileId}, ${data.profileSnapshot}, ${JSON.stringify(data.persona)}, ${data.temperament}, ${data.difficulty}, '[]', 'john', ${scriptId}, ${scriptVersion}, ${snapshot}, '[]')
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
    const openSection = s.progress.find((p) => p.status === "open");
    s.transcript.push({ role: "john", text: data.text, at: new Date().toISOString(), ...(openSection ? { sectionId: openSection.sectionId } : {}) });
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
      return { ok: true, session: { ...s, outcome: reply.outcome ?? "ended_early", endedAt: new Date().toISOString(), turns, pendingInterrupt: false } };
    }
    if (turns >= MAX_TURNS) {
      s.transcript.push({ role: "system", text: `Practice cap reached (${MAX_TURNS} exchanges). Pick how it ended.`, at: new Date().toISOString(), kind: "note" });
      await storeTranscript(s);
      return { ok: true, session: { ...s, turns, pendingInterrupt: false } };
    }
    await storeTranscript(s);
    return { ok: true, session: { ...s, turns, pendingInterrupt: hasPendingInterrupt(s.transcript) } };
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
    const presentation = s.presentation ? presentationSummary(s.presentation.sections, s.progress) : undefined;
    const reply = await callClaudeChat({ system: debriefSystemPrompt(), messages: [{ role: "user", content: debriefUserPrompt({ conversation: s.conversation, persona: s.persona, outcome, rubric, transcript: s.transcript, presentationLines: presentation?.lines }) }], maxTokens: 900, model: MODEL(), tag: "practice-debrief" });
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
      ...(presentation ? { presentation } : {}),
      generatedAt: new Date().toISOString(),
    };
    await sql()`UPDATE practice_sessions SET debrief = ${JSON.stringify(debrief)}, updated_at = NOW() WHERE id = ${s.id}`;
    return { ok: true, debrief };
  });


// ── Presentations (Section 7.2) ─────────────────────────────────────

function rowToPresentation(r: Record<string, unknown>): Presentation {
  return { id: Number(r.id), name: String(r.name ?? ""), conversation: r.conversation === "coverage" ? "coverage" : "recruiting", version: Number(r.version) || 1, sections: normalizeSections(typeof r.sections === "string" ? JSON.parse(String(r.sections)) : r.sections), updatedAt: String(r.updated_at ?? "") };
}

async function loadPresentation(id: number): Promise<Presentation | null> {
  await ensurePracticeTables();
  const rows = (await sql()`SELECT * FROM practice_presentations WHERE id = ${id}`) as Array<Record<string, unknown>>;
  return rows.length ? rowToPresentation(rows[0]) : null;
}

export const getPresentations = createServerFn()
  .middleware([requireAdmin])
  .handler(async (): Promise<Presentation[]> => {
    await ensurePracticeTables();
    const rows = (await sql()`SELECT * FROM practice_presentations ORDER BY conversation, name`) as Array<Record<string, unknown>>;
    return rows.map(rowToPresentation);
  });

/** John's outline in his own words: sections, target minutes, points. Saving bumps the version; old sessions keep their snapshot. */
export const savePresentation = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id?: number; name: string; conversation: string; sections: unknown }) => ({
    id: Number(d?.id) > 0 ? Number(d?.id) : null,
    name: text(d?.name, 120),
    conversation: (d?.conversation === "coverage" ? "coverage" : "recruiting") as Conversation,
    sections: normalizeSections(d?.sections),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string; presentation?: Presentation }> => {
    if (!data.name) return { ok: false, error: "Give the presentation a name." };
    if (!data.sections.length) return { ok: false, error: "Add at least one section with a title." };
    await ensurePracticeTables();
    const json = JSON.stringify(data.sections);
    const rows = data.id
      ? ((await sql()`UPDATE practice_presentations SET name = ${data.name}, conversation = ${data.conversation}, sections = ${json}, version = version + 1, updated_at = NOW() WHERE id = ${data.id} RETURNING *`) as Array<Record<string, unknown>>)
      : ((await sql()`INSERT INTO practice_presentations (name, conversation, version, sections) VALUES (${data.name}, ${data.conversation}, 1, ${json}) RETURNING *`) as Array<Record<string, unknown>>);
    if (!rows.length) return { ok: false, error: "That presentation is gone." };
    return { ok: true, presentation: rowToPresentation(rows[0]) };
  });

export const deletePresentation = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: number }) => ({ id: Number(d?.id) }))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    await ensurePracticeTables();
    await sql()`DELETE FROM practice_presentations WHERE id = ${data.id}`;
    return { ok: true };
  });

/**
 * Section events from the presentation panel: start (the section became
 * current), midpoint (the interruption window; the persona may jump ahead
 * or drift, by difficulty and temperament), delivered, or skipped.
 * "Recovered" means John finished a section after being interrupted in it.
 */
export const sectionEvent = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: number; sectionId: string; event: string; said?: string; seconds?: number }) => ({
    id: Number(d?.id),
    sectionId: text(d?.sectionId, 40),
    event: (["start", "midpoint", "delivered", "skipped"].includes(String(d?.event)) ? String(d?.event) : "start") as "start" | "midpoint" | "delivered" | "skipped",
    said: text(d?.said, 2000),
    seconds: Math.max(0, Math.min(7200, Number(d?.seconds) || 0)),
  }))
  .handler(async ({ data }): Promise<SessionResult> => {
    const s = await loadSession(data.id);
    if (!s) return { ok: false, error: "That session is gone." };
    if (!s.presentation) return { ok: false, error: "This is not a presentation session." };
    if (s.endedAt) return { ok: false, error: "This session has ended.", session: s };
    const sections = s.presentation.sections;
    const idx = sections.findIndex((x) => x.id === data.sectionId);
    if (idx < 0) return { ok: false, error: "That section is not in this presentation.", session: s };
    const section = sections[idx];
    const now = new Date().toISOString();
    let p = s.progress.find((x) => x.sectionId === data.sectionId);
    try {
      if (data.event === "start") {
        if (!p) {
          p = { sectionId: section.id, startedAt: now, endedAt: "", seconds: 0, status: "open", said: "", interrupted: false, interruptKind: "", interruptTargetId: "", recovered: false };
          s.progress.push(p);
          await storeTranscript(s);
        }
        return { ok: true, session: s };
      }
      if (!p || p.status !== "open") return { ok: true, session: s };
      if (data.event === "midpoint") {
        if (p.interrupted || s.pendingInterrupt) return { ok: true, session: s };
        const chance = interruptionChance(s.difficulty, s.temperament);
        const roll = s.fast ? 0 : Math.random();
        const drift = chance.drift > 0 && roll < chance.drift;
        const jump = !drift && chance.jump > 0 && (s.fast ? chance.jump > 0 : roll < chance.jump);
        if (!drift && !jump) return { ok: true, session: s };
        const target = jump ? pickJumpTarget(sections, idx, Math.random()) : null;
        if (jump && !target) return { ok: true, session: s };
        const reply = await personaTurn(s, target ? interruptionCue(section, target) : disengageCue(section));
        if (!reply) return { ok: true, session: s };
        p.interrupted = true;
        p.interruptKind = target ? "jump" : "drift";
        p.interruptTargetId = target?.id ?? "";
        s.transcript.push({ role: "persona", text: reply.say, at: now, kind: target ? "interrupt" : "drift", sectionId: section.id });
        await storeTranscript(s);
        return { ok: true, session: { ...s, pendingInterrupt: Boolean(target) } };
      }
      // delivered or skipped
      if (data.event === "delivered" && s.pendingInterrupt) return { ok: false, error: `Answer ${s.persona.name} first, then finish the section.`, session: s };
      p.status = data.event;
      p.endedAt = now;
      p.seconds = data.seconds || Math.max(0, Math.round((Date.now() - Date.parse(p.startedAt)) / 1000));
      p.said = data.said;
      p.recovered = p.interrupted && data.event === "delivered";
      s.transcript.push({ role: "system", text: data.event === "delivered" ? `Section delivered: ${section.title}` : `Section skipped: ${section.title}`, at: now, kind: "section", sectionId: section.id });
      if (data.said) s.transcript.push({ role: "john", text: data.said, at: now, kind: "said", sectionId: section.id });
      if (data.event === "delivered") {
        const isLast = idx === sections.length - 1 || sections.slice(idx + 1).every((x) => s.progress.some((q) => q.sectionId === x.id && q.status !== "open"));
        const reply = await personaTurn(s, sectionReactionCue(section, data.said, isLast));
        if (reply) {
          s.transcript.push({ role: "persona", text: reply.say, at: new Date().toISOString(), sectionId: section.id });
          if (reply.ended) {
            s.transcript.push({ role: "system", text: `${s.persona.name} ended the conversation.`, at: new Date().toISOString(), kind: "note" });
            await storeTranscript(s, { ended: true, outcome: reply.outcome ?? "ended_early" });
            return { ok: true, session: { ...s, outcome: reply.outcome ?? "ended_early", endedAt: new Date().toISOString(), pendingInterrupt: false } };
          }
        }
      }
      await storeTranscript(s);
      return { ok: true, session: { ...s, pendingInterrupt: false } };
    } catch (e) {
      return { ok: false, error: String(e), session: s };
    }
  });
