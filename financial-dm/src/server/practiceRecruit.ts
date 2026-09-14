import { createServerFn } from "@tanstack/react-start";
import { randomBytes } from "node:crypto";
import { sql } from "~/db";
import { requireAdmin } from "~/server/auth";
import { allowRequest, clientAddress } from "~/server/rateLimit.server";
import { ensureGuildTables } from "~/server/guild";
import { applySectionEvent, buildDebrief, createSession, ensurePracticeTables, finishSession, giveHint, inventPersona, listPresentationChoices, loadProfiles, loadSession, sayTurn, summarize, type PracticeSession, type SessionResult, type SessionSummary } from "~/server/practice.server";
import { outcomeInput, sectionInput, startInput, text, type SectionRaw, type StartRaw } from "~/lib/practiceInput";
import { difficultyById, suggestedDifficulty, type Conversation, type Difficulty, type Outcome } from "~/lib/practiceConfig";
import { stageLabel } from "~/lib/guildConfig";
import { firstName } from "~/lib/questLog";
import type { Debrief } from "~/lib/practiceDebrief";

/**
 * Recruit access to the Sparring Dummy (AI practice spec, Section 9). John
 * grants a recruit a private link from the Guild tab; the token is the only
 * key, the same approach as the Quest Log, and he can take it back at any
 * time. Through it a recruit can run sessions, read their own debriefs, and
 * read the sessions John has shared as examples. Nothing else: no leads, no
 * quests, no other recruits, and John's outline only during their own
 * session. Their transcripts stay private unless they choose to share one.
 * The recruit's name never reaches the AI; the prompts call them "the trainee".
 */

let ready: Promise<void> | null = null;
function ensureColumns(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await Promise.all([ensureGuildTables(), ensurePracticeTables()]);
      await sql()`ALTER TABLE recruits ADD COLUMN IF NOT EXISTS practice_token TEXT`;
      await sql()`ALTER TABLE recruits ADD COLUMN IF NOT EXISTS practice_granted_at TIMESTAMPTZ`;
    })().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

const newToken = () => randomBytes(18).toString("base64url");

// ── John's side ─────────────────────────────────────────────────────

export interface PracticeAccessResult {
  ok: boolean;
  error?: string;
  token?: string;
  grantedAt?: string;
}

/** Give a recruit the Sparring Dummy. Granting again keeps the same link; "New link" replaces it. */
export const grantPracticeAccess = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: number; rotate?: boolean }) => ({ id: Number(d?.id), rotate: Boolean(d?.rotate) }))
  .handler(async ({ data }): Promise<PracticeAccessResult> => {
    try {
      await ensureColumns();
      const fresh = newToken();
      const rows = (data.rotate
        ? await sql()`UPDATE recruits SET practice_token = ${fresh}, practice_granted_at = COALESCE(practice_granted_at, NOW()) WHERE id = ${data.id} RETURNING practice_token, practice_granted_at`
        : await sql()`UPDATE recruits SET practice_token = COALESCE(practice_token, ${fresh}), practice_granted_at = COALESCE(practice_granted_at, NOW()) WHERE id = ${data.id} RETURNING practice_token, practice_granted_at`) as Array<Record<string, unknown>>;
      if (!rows.length) return { ok: false, error: "That recruit is gone." };
      return { ok: true, token: String(rows[0].practice_token ?? ""), grantedAt: String(rows[0].practice_granted_at ?? "") };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

/** Take the link back. Their past sessions stay on record for John's counts; the page stops working at once. */
export const revokePracticeAccess = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: number }) => ({ id: Number(d?.id) }))
  .handler(async ({ data }): Promise<PracticeAccessResult> => {
    try {
      await ensureColumns();
      await sql()`UPDATE recruits SET practice_token = NULL, practice_granted_at = NULL WHERE id = ${data.id}`;
      return { ok: true, token: "", grantedAt: "" };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

export interface RecruitPracticeStats {
  sessions: number;
  outcomes: Partial<Record<Outcome, number>>;
  lastAt: string;
  /** Sessions the recruit chose to share with John. */
  shared: SessionSummary[];
}

/** Counts and outcomes for one recruit; transcripts only where they shared them (Section 9). */
export const recruitPracticeStats = createServerFn()
  .middleware([requireAdmin])
  .validator((d: { id: number }) => ({ id: Number(d?.id) }))
  .handler(async ({ data }): Promise<RecruitPracticeStats> => {
    await ensureColumns();
    const rows = (await sql()`SELECT id, outcome, shared_with_john, created_at FROM practice_sessions WHERE practitioner = 'recruit' AND recruit_id = ${data.id} ORDER BY created_at DESC LIMIT 200`) as Array<Record<string, unknown>>;
    const outcomes: Partial<Record<Outcome, number>> = {};
    const shared: SessionSummary[] = [];
    for (const r of rows) {
      const o = String(r.outcome ?? "") as Outcome;
      if (o) outcomes[o] = (outcomes[o] ?? 0) + 1;
      if (r.shared_with_john === true || r.shared_with_john === "t") {
        const s = await loadSession(Number(r.id));
        if (s) shared.push(summarize(s));
      }
    }
    return { sessions: rows.length, outcomes, lastAt: rows.length ? String(rows[0].created_at ?? "") : "", shared };
  });

/** Names for the Sessions view on the Practice tab. Only the fields that view shows. */
export const listPracticeRecruits = createServerFn()
  .middleware([requireAdmin])
  .handler(async (): Promise<Array<{ id: number; name: string; stage: string; granted: boolean }>> => {
    await ensureColumns();
    const rows = (await sql()`SELECT id, name, stage, practice_token FROM recruits ORDER BY name`) as Array<Record<string, unknown>>;
    return rows.map((r) => ({ id: Number(r.id), name: String(r.name ?? ""), stage: String(r.stage ?? ""), granted: Boolean(r.practice_token) }));
  });

// ── The recruit's side ──────────────────────────────────────────────

interface Holder {
  id: number;
  name: string;
  stage: string;
}

async function resolve(token: string): Promise<Holder | null> {
  if (token.length < 16) return null;
  await ensureColumns();
  const rows = (await sql()`SELECT id, name, stage FROM recruits WHERE practice_token = ${token}`) as Array<Record<string, unknown>>;
  if (!rows.length) return null;
  return { id: Number(rows[0].id), name: String(rows[0].name ?? ""), stage: String(rows[0].stage ?? "") };
}

/** Per-address and per-link limits. AI calls are the expensive ones, so they get the tighter bucket. */
function allowed(token: string, ai: boolean): boolean {
  if (!allowRequest(`practice-ip:${clientAddress()}`, 300, 10 * 60_000)) return false;
  if (ai && !allowRequest(`practice-ai:${token}`, 90, 10 * 60_000)) return false;
  return true;
}
const SLOW: SessionResult = { ok: false, error: "That is a lot of practice at once. Take a breather and try again in a few minutes." };
const GONE: SessionResult = { ok: false, error: "This practice link is not active. Ask John for a fresh one." };

/** The recruit's own session, never anyone else's. */
async function ownSession(holder: Holder, id: number): Promise<PracticeSession | null> {
  const s = await loadSession(id);
  return s && s.practitioner === "recruit" && s.recruitId === holder.id ? s : null;
}

export interface RecruitPracticePublic {
  ok: boolean;
  firstName: string;
  stage: string;
  stageLabel: string;
  suggested: Difficulty;
  suggestedNote: string;
  profiles: Array<{ id: number; kind: "client" | "recruit"; name: string; lifeStage: string; worries: string }>;
  presentations: Array<{ id: number; name: string; conversation: Conversation; version: number; sectionCount: number }>;
  sessions: PracticeSession[];
  /** John's sessions shared as examples: summaries here, the transcript on its own page. */
  examples: SessionSummary[];
}

const EMPTY: RecruitPracticePublic = { ok: false, firstName: "", stage: "", stageLabel: "", suggested: 1, suggestedNote: "", profiles: [], presentations: [], sessions: [], examples: [] };

async function publicFor(holder: Holder): Promise<RecruitPracticePublic> {
  const profiles = await loadProfiles();
  const pres = await listPresentationChoices();
  const own = (await sql()`SELECT * FROM practice_sessions WHERE practitioner = 'recruit' AND recruit_id = ${holder.id} ORDER BY created_at DESC LIMIT 20`) as Array<Record<string, unknown>>;
  const shared = (await sql()`SELECT id FROM practice_sessions WHERE practitioner = 'john' AND shared_as_example = TRUE AND ended_at IS NOT NULL ORDER BY created_at DESC LIMIT 20`) as Array<Record<string, unknown>>;
  const sessions: PracticeSession[] = [];
  for (const r of own) {
    const s = await loadSession(Number(r.id));
    if (s) sessions.push(s);
  }
  const examples: SessionSummary[] = [];
  for (const r of shared) {
    const s = await loadSession(Number(r.id));
    if (s) examples.push(summarize(s));
  }
  const suggested = suggestedDifficulty(holder.stage);
  return {
    ok: true,
    firstName: firstName(holder.name),
    stage: holder.stage,
    stageLabel: stageLabel(holder.stage),
    suggested,
    suggestedNote: `Suggested for where you are (${stageLabel(holder.stage).toLowerCase()}): Level ${suggested}, ${difficultyById(suggested).name}. Your call.`,
    profiles: profiles.map((p) => ({ id: p.id, kind: p.kind === "recruit" ? "recruit" : "client", name: p.name, lifeStage: p.lifeStage, worries: p.worries })),
    presentations: pres.map((x) => ({ id: x.id, name: x.name, conversation: x.conversation, version: x.version, sectionCount: x.sections.length })),
    sessions,
    examples,
  };
}

export const getRecruitPractice = createServerFn()
  .validator((d: { token: string }) => ({ token: text(d?.token, 80) }))
  .handler(async ({ data }): Promise<RecruitPracticePublic> => {
    try {
      if (!allowed(data.token, false)) return EMPTY;
      const holder = await resolve(data.token);
      return holder ? await publicFor(holder) : EMPTY;
    } catch {
      return EMPTY;
    }
  });

export const recruitGeneratePersona = createServerFn({ method: "POST" })
  .validator((d: { token: string; profileId: number; conversation: string; avoidNames?: string[] }) => ({
    token: text(d?.token, 80),
    profileId: Number(d?.profileId),
    conversation: (d?.conversation === "recruiting" ? "recruiting" : "coverage") as Conversation,
    avoidNames: Array.isArray(d?.avoidNames) ? d!.avoidNames.map((n) => text(n, 40)).filter(Boolean).slice(0, 10) : [],
  }))
  .handler(async ({ data }) => {
    try {
      if (!allowed(data.token, true)) return { ok: false, error: SLOW.error };
      const holder = await resolve(data.token);
      if (!holder) return { ok: false, error: GONE.error };
      return await inventPersona({ profileId: data.profileId, conversation: data.conversation, avoidNames: data.avoidNames });
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

export const recruitStartSession = createServerFn({ method: "POST" })
  .validator((d: StartRaw & { token: string }) => ({ token: text(d?.token, 80), ...startInput(d) }))
  .handler(async ({ data }): Promise<SessionResult> => {
    try {
      if (!allowed(data.token, true)) return SLOW;
      const holder = await resolve(data.token);
      if (!holder) return GONE;
      const { token: _t, ...input } = data;
      return await createSession(input, { practitioner: "recruit", recruitId: holder.id });
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

/** Their own session in full, or one of John's shared examples. Anything else is not found. */
export const recruitGetSession = createServerFn()
  .validator((d: { token: string; id: number }) => ({ token: text(d?.token, 80), id: Number(d?.id) }))
  .handler(async ({ data }): Promise<PracticeSession | null> => {
    try {
      if (!allowed(data.token, false)) return null;
      const holder = await resolve(data.token);
      if (!holder) return null;
      const own = await ownSession(holder, data.id);
      if (own) return own;
      const s = await loadSession(data.id);
      return s && s.practitioner === "john" && s.sharedAsExample && s.endedAt ? s : null;
    } catch {
      return null;
    }
  });

async function withOwn(token: string, id: number, ai: boolean, fn: (s: PracticeSession) => Promise<SessionResult>): Promise<SessionResult> {
  try {
    if (!allowed(token, ai)) return SLOW;
    const holder = await resolve(token);
    if (!holder) return GONE;
    const s = await ownSession(holder, id);
    if (!s) return { ok: false, error: "That session is gone." };
    return await fn(s);
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export const recruitSendTurn = createServerFn({ method: "POST" })
  .validator((d: { token: string; id: number; text: string }) => ({ token: text(d?.token, 80), id: Number(d?.id), text: text(d?.text, 2000) }))
  .handler(({ data }) => withOwn(data.token, data.id, true, (s) => sayTurn(s, data.text)));

export const recruitPauseHint = createServerFn({ method: "POST" })
  .validator((d: { token: string; id: number }) => ({ token: text(d?.token, 80), id: Number(d?.id) }))
  .handler(({ data }) => withOwn(data.token, data.id, true, (s) => giveHint(s)));

export const recruitEndSession = createServerFn({ method: "POST" })
  .validator((d: { token: string; id: number; outcome: string }) => ({ token: text(d?.token, 80), ...outcomeInput(d) }))
  .handler(({ data }) => withOwn(data.token, data.id, false, (s) => finishSession(s, data.outcome)));

export const recruitSectionEvent = createServerFn({ method: "POST" })
  .validator((d: SectionRaw & { token: string }) => ({ token: text(d?.token, 80), ...sectionInput(d) }))
  .handler(({ data }) => {
    const { token, ...input } = data;
    return withOwn(token, input.id, true, (s) => applySectionEvent(s, input));
  });

/** Their own debrief (built on first read), or the stored debrief of a shared example. Never a fresh AI call for John's sessions. */
export const recruitGetDebrief = createServerFn({ method: "POST" })
  .validator((d: { token: string; id: number }) => ({ token: text(d?.token, 80), id: Number(d?.id) }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string; debrief?: Debrief }> => {
    try {
      if (!allowed(data.token, true)) return { ok: false, error: SLOW.error };
      const holder = await resolve(data.token);
      if (!holder) return { ok: false, error: GONE.error };
      const own = await ownSession(holder, data.id);
      if (own) return await buildDebrief(own);
      const s = await loadSession(data.id);
      if (s && s.practitioner === "john" && s.sharedAsExample) return s.debrief ? { ok: true, debrief: s.debrief } : { ok: false, error: "John has not run the debrief on this example yet." };
      return { ok: false, error: "That session is gone." };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

/** Section 9: the recruit decides whether John may read this transcript. Off by default. */
export const recruitShareWithJohn = createServerFn({ method: "POST" })
  .validator((d: { token: string; id: number; shared: boolean }) => ({ token: text(d?.token, 80), id: Number(d?.id), shared: Boolean(d?.shared) }))
  .handler(async ({ data }): Promise<{ ok: boolean; shared?: boolean }> => {
    try {
      if (!allowed(data.token, false)) return { ok: false };
      const holder = await resolve(data.token);
      if (!holder) return { ok: false };
      const s = await ownSession(holder, data.id);
      if (!s) return { ok: false };
      await sql()`UPDATE practice_sessions SET shared_with_john = ${data.shared}, updated_at = NOW() WHERE id = ${s.id}`;
      return { ok: true, shared: data.shared };
    } catch {
      return { ok: false };
    }
  });
