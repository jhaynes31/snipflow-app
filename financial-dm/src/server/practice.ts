import { createServerFn } from "@tanstack/react-start";
import { sql } from "~/db";
import { requireAdmin } from "~/server/auth";
import { outcomeInput, parsePersona, sectionInput, startInput, text } from "~/lib/practiceInput";
import { normalizeRubric } from "~/lib/practiceDebrief";
import { normalizeSections, type Presentation } from "~/lib/practicePresentation";
import { temperamentsFor, type Conversation } from "~/lib/practiceConfig";
import type { Persona } from "~/lib/practicePrompts";
import type { Debrief } from "~/lib/practiceDebrief";
import { AS_JOHN, MODEL, applySectionEvent, buildDebrief, createSession, ensurePracticeTables, finishSession, forJohn, giveHint, inventPersona, loadProfiles, loadRubrics, loadSession, rowToPresentation, rowToSession, sayTurn, summarize, type PracticeOverview, type PracticeSession, type PracticeSetup, type Rubrics, type SessionResult } from "~/server/practice.server";

export type { PracticeSession, PracticeSetup, Rubrics, SessionResult, SessionSummary, PracticeOverview, TranscriptEntry, SavedPersona } from "~/server/practice.server";
export type { StartRaw, SectionRaw } from "~/lib/practiceInput";

/**
 * The Sparring Dummy, server functions (AI practice spec). Bodies live in
 * practice.server.ts so a recruit's token-scoped functions can share them;
 * this file only checks the admin login and shapes the input.
 */

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

export const generatePersona = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { profileId: number; conversation: string; avoidNames?: string[] }) => ({
    profileId: Number(d?.profileId),
    conversation: (d?.conversation === "recruiting" ? "recruiting" : "coverage") as Conversation,
    avoidNames: Array.isArray(d?.avoidNames) ? d!.avoidNames.map((n) => text(n, 40)).filter(Boolean).slice(0, 10) : [],
  }))
  .handler(async ({ data }) => inventPersona(data));

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

/** Section 7.1: creates the session and asks the persona to open. */
export const startSession = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(startInput)
  .handler(async ({ data }): Promise<SessionResult> => createSession(data, AS_JOHN));

/** John's own sessions in full; a recruit's only once they shared it (Section 9). */
export const getSession = createServerFn()
  .middleware([requireAdmin])
  .validator((d: { id: number }) => ({ id: Number(d?.id) }))
  .handler(async ({ data }): Promise<PracticeSession | null> => {
    const s = await loadSession(data.id);
    return s ? forJohn(s) : null;
  });

/** The practitioner speaks; the persona answers. Ends at maxTurns or when the persona decides to end it. */
export const sendTurn = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: number; text: string }) => ({ id: Number(d?.id), text: text(d?.text, 2000) }))
  .handler(async ({ data }): Promise<SessionResult> => {
    const s = await loadSession(data.id);
    if (!s) return { ok: false, error: "That session is gone." };
    return sayTurn(s, data.text);
  });

/** Section 7.1: Pause for a hint about what the persona is actually worried about. Marked in the transcript. */
export const pauseHint = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: number }) => ({ id: Number(d?.id) }))
  .handler(async ({ data }): Promise<SessionResult> => {
    const s = await loadSession(data.id);
    if (!s) return { ok: false, error: "That session is gone." };
    return giveHint(s);
  });

/** The practitioner ends it and says how it went. The outcome is their read, not a score. */
export const endSession = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(outcomeInput)
  .handler(async ({ data }): Promise<SessionResult> => {
    const s = await loadSession(data.id);
    if (!s) return { ok: false, error: "That session is gone." };
    return finishSession(s, data.outcome);
  });

/** Section 9: John marks one of his own sessions as an example recruits with practice access may read. */
export const setSessionExample = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: number; shared: boolean }) => ({ id: Number(d?.id), shared: Boolean(d?.shared) }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const s = await loadSession(data.id);
    if (!s) return { ok: false, error: "That session is gone." };
    if (s.practitioner !== "john") return { ok: false, error: "Only your own sessions can be shared as examples." };
    if (!s.endedAt) return { ok: false, error: "Finish the session first." };
    await sql()`UPDATE practice_sessions SET shared_as_example = ${data.shared}, updated_at = NOW() WHERE id = ${s.id}`;
    return { ok: true };
  });

/** Section 9: John's own sessions, plus per-recruit counts and outcomes. Transcripts only where the recruit shared them. */
export const getPracticeOverview = createServerFn()
  .middleware([requireAdmin])
  .handler(async (): Promise<PracticeOverview> => {
    await ensurePracticeTables();
    const rows = (await sql()`SELECT * FROM practice_sessions ORDER BY created_at DESC LIMIT 300`) as Array<Record<string, unknown>>;
    const all = rows.map(rowToSession);
    const byRecruit = new Map<number, PracticeOverview["recruits"][number]>();
    for (const s of all) {
      if (s.practitioner !== "recruit" || s.recruitId == null) continue;
      const cur = byRecruit.get(s.recruitId) ?? { recruitId: s.recruitId, sessions: 0, outcomes: {}, lastAt: "", shared: [] };
      cur.sessions += 1;
      if (s.outcome) cur.outcomes[s.outcome] = (cur.outcomes[s.outcome] ?? 0) + 1;
      if (!cur.lastAt || s.createdAt > cur.lastAt) cur.lastAt = s.createdAt;
      if (s.sharedWithJohn) cur.shared.push(summarize(s));
      byRecruit.set(s.recruitId, cur);
    }
    return { sessions: all.filter((s) => s.practitioner === "john").map(summarize), recruits: [...byRecruit.values()] };
  });

export const deleteSession = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: number }) => ({ id: Number(d?.id) }))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    await ensurePracticeTables();
    await sql()`DELETE FROM practice_sessions WHERE id = ${data.id}`;
    return { ok: true };
  });

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

/** Builds the debrief once a session has ended and stores it. Idempotent: a stored debrief is returned as is. */
export const getDebrief = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: number; refresh?: boolean }) => ({ id: Number(d?.id), refresh: Boolean(d?.refresh) }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string; debrief?: Debrief }> => {
    const s = await loadSession(data.id);
    if (!s) return { ok: false, error: "That session is gone." };
    if (s.practitioner === "recruit" && !s.sharedWithJohn) return { ok: false, error: "This recruit has kept their session private." };
    return buildDebrief(s, data.refresh);
  });

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

export const sectionEvent = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator(sectionInput)
  .handler(async ({ data }): Promise<SessionResult> => {
    const s = await loadSession(data.id);
    if (!s) return { ok: false, error: "That session is gone." };
    return applySectionEvent(s, data);
  });
