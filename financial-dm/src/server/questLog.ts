import { createServerFn } from "@tanstack/react-start";
import { randomBytes } from "node:crypto";
import { sql } from "~/db";
import { requireAdmin } from "~/server/auth";
import { allowRequest, clientAddress } from "~/server/rateLimit.server";
import { ensureGuildTables } from "~/server/guild";
import { GUILD_CONFIG, isRecruitStage, type RecruitStage } from "~/lib/guildConfig";
import { parseStatusHistory, type StatusChange } from "~/lib/attribution";
import { firstName, makeStepId, newQuestLog, parseQuestLog, questLogProgress, stageFromLog, stageIndex, type QuestLog, type QuestLogStep } from "~/lib/questLog";

/**
 * The Quest Log (recruiting spec, Phase 5). Every recruit who has joined can
 * get a private page at /quest-log/<token>. The token is the only key: it is
 * long, random, and can be replaced by John at any time. The page shows the
 * checklist, John's note, and his licensing notes (a presentation fact the
 * amendment allows for people who have already joined). Nothing about the
 * recruit beyond their first name is ever sent to the page.
 */

const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

let ready: Promise<void> | null = null;
function ensureColumns(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await ensureGuildTables();
      await sql()`ALTER TABLE recruits ADD COLUMN IF NOT EXISTS quest_log TEXT`;
      await sql()`ALTER TABLE recruits ADD COLUMN IF NOT EXISTS quest_log_token TEXT`;
    })().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

function newToken(): string {
  return randomBytes(18).toString("base64url");
}

async function loadLog(id: number): Promise<{ log: QuestLog | null; token: string; stage: string; history: StatusChange[]; name: string; phone: string } | null> {
  const rows = (await sql()`SELECT quest_log, quest_log_token, stage, stage_history, name, phone FROM recruits WHERE id = ${id}`) as Array<Record<string, unknown>>;
  if (!rows.length) return null;
  const r = rows[0];
  return { log: parseQuestLog(r.quest_log), token: String(r.quest_log_token ?? ""), stage: String(r.stage ?? ""), history: parseStatusHistory(r.stage_history), name: String(r.name ?? ""), phone: String(r.phone ?? "") };
}

async function storeLog(id: number, log: QuestLog): Promise<void> {
  await sql()`UPDATE recruits SET quest_log = ${JSON.stringify(log)} WHERE id = ${id}`;
}

/** When John ticks a step that carries a stage, the recruit moves forward (never backward, never out of "not moving forward"). */
async function advanceStage(id: number, current: string, history: StatusChange[], log: QuestLog): Promise<RecruitStage | null> {
  const target = stageFromLog(log);
  if (!target || current === "not_moving_forward") return null;
  if (stageIndex(target) <= stageIndex(current)) return null;
  if (history[history.length - 1]?.status !== target) history.push({ status: target, at: new Date().toISOString() });
  await sql()`UPDATE recruits SET stage = ${target}, stage_history = ${JSON.stringify(history.slice(-40))} WHERE id = ${id}`;
  return target;
}

// ── John's side ─────────────────────────────────────────────────────

export interface QuestLogAdminResult {
  ok: boolean;
  error?: string;
  log?: QuestLog;
  token?: string;
  stage?: RecruitStage;
}

/** Creates the checklist from the template and a private link. Safe to call twice: an existing log is kept. */
export const startQuestLog = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: number }) => ({ id: Number(d?.id) }))
  .handler(async ({ data }): Promise<QuestLogAdminResult> => {
    try {
      await ensureColumns();
      const cur = await loadLog(data.id);
      if (!cur) return { ok: false, error: "That recruit no longer exists." };
      const log = cur.log ?? newQuestLog();
      const token = cur.token || newToken();
      await sql()`UPDATE recruits SET quest_log = ${JSON.stringify(log)}, quest_log_token = ${token} WHERE id = ${data.id}`;
      return { ok: true, log, token };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

/** John ticks or unticks a step. Ticking a stage step moves the recruit forward in the pipeline. */
export const setQuestLogStep = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: number; stepId: string; done: boolean }) => ({ id: Number(d?.id), stepId: text(d?.stepId, 40), done: Boolean(d?.done) }))
  .handler(async ({ data }): Promise<QuestLogAdminResult> => {
    try {
      await ensureColumns();
      const cur = await loadLog(data.id);
      if (!cur?.log) return { ok: false, error: "No Quest Log for this recruit yet." };
      const step = cur.log.steps.find((s) => s.id === data.stepId);
      if (!step) return { ok: false, error: "That step is gone." };
      const now = new Date().toISOString();
      step.done = data.done;
      step.doneAt = data.done ? now : "";
      step.doneBy = data.done ? "john" : "";
      cur.log.lastProgressAt = now;
      await storeLog(data.id, cur.log);
      const stage = data.done ? await advanceStage(data.id, cur.stage, cur.history, cur.log) : null;
      return { ok: true, log: cur.log, ...(stage ? { stage } : {}) };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

/** Add, remove, rename, or reorder steps, and set the note to the recruit. Ticks are kept by id. */
export const saveQuestLog = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: number; steps?: Array<{ id?: string; title: string; detail?: string; stage?: string }>; message?: string }) => ({
    id: Number(d?.id),
    steps: Array.isArray(d?.steps)
      ? d!.steps.slice(0, 40).map((s) => ({ id: text(s?.id, 40), title: text(s?.title, 120), detail: text(s?.detail, 400), stage: isRecruitStage(s?.stage) ? (s!.stage as RecruitStage) : undefined }))
      : undefined,
    message: d?.message === undefined ? undefined : text(d.message, 600),
  }))
  .handler(async ({ data }): Promise<QuestLogAdminResult> => {
    try {
      await ensureColumns();
      const cur = await loadLog(data.id);
      if (!cur?.log) return { ok: false, error: "No Quest Log for this recruit yet." };
      const log = cur.log;
      if (data.steps) {
        const byId = new Map(log.steps.map((s) => [s.id, s]));
        const next: QuestLogStep[] = [];
        for (const s of data.steps) {
          if (!s.title) continue;
          const old = s.id ? byId.get(s.id) : undefined;
          next.push({
            id: old?.id ?? (s.id || makeStepId()),
            title: s.title,
            detail: s.detail,
            ...(s.stage ? { stage: s.stage } : old?.stage && s.stage === undefined ? { stage: old.stage } : {}),
            done: old?.done ?? false,
            doneAt: old?.doneAt ?? "",
            doneBy: old?.doneBy ?? "",
          });
        }
        if (!next.length) return { ok: false, error: "A Quest Log needs at least one step." };
        log.steps = next;
      }
      if (data.message !== undefined) log.message = data.message;
      await storeLog(data.id, log);
      return { ok: true, log };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

/** Replaces the private link. The old one stops working immediately. */
export const rotateQuestLogLink = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: number }) => ({ id: Number(d?.id) }))
  .handler(async ({ data }): Promise<QuestLogAdminResult> => {
    try {
      await ensureColumns();
      const token = newToken();
      await sql()`UPDATE recruits SET quest_log_token = ${token} WHERE id = ${data.id}`;
      return { ok: true, token };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

// ── The recruit's side ──────────────────────────────────────────────

export interface QuestLogPublic {
  ok: boolean;
  firstName: string;
  johnName: string;
  phone: string;
  steps: QuestLogStep[];
  progress: { done: number; total: number; percent: number };
  message: string;
  /** John's licensing notes, if he has written any. Shown only here, to someone who has joined. */
  licensingNotes: string;
  complete: boolean;
}

const EMPTY: QuestLogPublic = { ok: false, firstName: "", johnName: "", phone: GUILD_CONFIG.recruitPhone, steps: [], progress: { done: 0, total: 0, percent: 0 }, message: "", licensingNotes: "", complete: false };

async function publicByToken(token: string): Promise<QuestLogPublic> {
  if (token.length < 16) return EMPTY;
  await ensureColumns();
  const rows = (await sql()`SELECT name, quest_log FROM recruits WHERE quest_log_token = ${token}`) as Array<Record<string, unknown>>;
  const log = rows.length ? parseQuestLog(rows[0].quest_log) : null;
  if (!log) return EMPTY;
  const facts = (await sql()`SELECT key, value FROM guild_facts WHERE key IN ('johnFullName', 'licensingDetails')`) as Array<{ key: string; value: string }>;
  const fact = (k: string) => facts.find((f) => f.key === k)?.value?.trim() ?? "";
  const progress = questLogProgress(log);
  return {
    ok: true,
    firstName: firstName(String(rows[0].name ?? "")),
    johnName: fact("johnFullName") || "John",
    phone: GUILD_CONFIG.recruitPhone,
    steps: log.steps,
    progress,
    message: log.message,
    licensingNotes: fact("licensingDetails"),
    complete: progress.total > 0 && progress.done === progress.total,
  };
}

export const getQuestLogByToken = createServerFn()
  .validator((d: { token: string }) => ({ token: text(d?.token, 80) }))
  .handler(async ({ data }): Promise<QuestLogPublic> => {
    try {
      return await publicByToken(data.token);
    } catch {
      return EMPTY;
    }
  });

/** The recruit ticks a step themselves. Recorded as theirs, so John can confirm; it never moves the stage. */
export const recruitMarkStep = createServerFn({ method: "POST" })
  .validator((d: { token: string; stepId: string; done: boolean }) => ({ token: text(d?.token, 80), stepId: text(d?.stepId, 40), done: Boolean(d?.done) }))
  .handler(async ({ data }): Promise<QuestLogPublic> => {
    try {
      if (!allowRequest(`questlog:${clientAddress()}`, 60, 60_000)) return EMPTY;
      if (data.token.length < 16) return EMPTY;
      await ensureColumns();
      const rows = (await sql()`SELECT id, quest_log FROM recruits WHERE quest_log_token = ${data.token}`) as Array<Record<string, unknown>>;
      const log = rows.length ? parseQuestLog(rows[0].quest_log) : null;
      if (!log) return EMPTY;
      const step = log.steps.find((s) => s.id === data.stepId);
      // A step John already confirmed stays confirmed; the recruit can only change their own ticks.
      if (step && !(step.done && step.doneBy === "john")) {
        const now = new Date().toISOString();
        step.done = data.done;
        step.doneAt = data.done ? now : "";
        step.doneBy = data.done ? "recruit" : "";
        log.lastProgressAt = now;
        await storeLog(Number(rows[0].id), log);
      }
      return await publicByToken(data.token);
    } catch {
      return EMPTY;
    }
  });
