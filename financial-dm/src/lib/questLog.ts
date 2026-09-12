import { GUILD_CONFIG, RECRUIT_STAGES, type RecruitStage } from "./guildConfig";

/**
 * The Quest Log (recruiting spec, Phase 5): an onboarding checklist for a
 * recruit who has said yes. Each recruit gets a private link to their own
 * page; John and the recruit both see the same steps. The step template
 * below is a starting point. John can add, remove, or rename steps for any
 * recruit, and nothing here is shown to the public.
 */

/** One stall threshold for the whole Guild (recruiting spec config, reused by Home per the shell spec). */
export const QUEST_LOG_STALE_DAYS = GUILD_CONFIG.stallDays;

export interface QuestLogStep {
  id: string;
  title: string;
  /** One plain sentence about what the step involves. Shown to the recruit. */
  detail: string;
  /** When John ticks a step with a stage, the recruit moves to that stage if they are not there yet. */
  stage?: RecruitStage;
  done: boolean;
  doneAt: string;
  doneBy: "john" | "recruit" | "";
}

export interface QuestLog {
  steps: QuestLogStep[];
  startedAt: string;
  /** Last time any step was ticked or unticked. Drives the nudge list. */
  lastProgressAt: string;
  /** John's note to this recruit, shown at the top of their page. */
  message: string;
}

export const DEFAULT_QUEST_LOG_STEPS: Array<Pick<QuestLogStep, "id" | "title" | "detail" | "stage">> = [
  { id: "kickoff", title: "Kickoff call with John", detail: "A short call to map out the next few weeks and answer any questions before you start." },
  { id: "course_enrolled", title: "Enroll in the pre-licensing course", detail: "John will point you to the approved course for your state.", stage: "getting_licensed" },
  { id: "course_done", title: "Finish the pre-licensing course", detail: "Work through it at your own pace. Tell John when you are done so he can help you book the exam." },
  { id: "exam_booked", title: "Schedule the state exam", detail: "Pick a date that gives you a little review time." },
  { id: "exam_passed", title: "Pass the state life insurance exam", detail: "Bring your ID and confirmation. Text John the moment you pass." },
  { id: "fingerprints", title: "Fingerprinting and background check", detail: "Required by the state. John will tell you where to go and what to bring." },
  { id: "license_applied", title: "Submit the state license application", detail: "Done online with your exam results and fingerprint receipt." },
  { id: "license_approved", title: "License approved", detail: "The state issues your license number. You are officially licensed.", stage: "licensed" },
  { id: "contracting", title: "Contracting paperwork with The Foster Financial Group", detail: "The paperwork that lets you write business. John walks you through it.", stage: "contracted" },
  { id: "training", title: "First training session", detail: "How appointments work, the tools you will use, and who to ask when you get stuck." },
  { id: "shadow", title: "Sit in on an appointment with John", detail: "Watch a real conversation with a family before you run your own." },
  { id: "first_sale", title: "First sale", detail: "Your first family protected. This one gets celebrated.", stage: "first_sale" },
];

export function newQuestLog(now: Date = new Date()): QuestLog {
  const at = now.toISOString();
  return {
    steps: DEFAULT_QUEST_LOG_STEPS.map((s) => ({ ...s, done: false, doneAt: "", doneBy: "" })),
    startedAt: at,
    lastProgressAt: at,
    message: "",
  };
}

const STAGE_IDS = RECRUIT_STAGES.map((s) => s.id) as string[];

/** Reads a stored log, dropping anything malformed. Returns null when there is no log. */
export function parseQuestLog(raw: unknown): QuestLog | null {
  if (raw == null || raw === "") return null;
  try {
    const o = (typeof raw === "string" ? JSON.parse(raw) : raw) as Partial<QuestLog>;
    if (!o || !Array.isArray(o.steps)) return null;
    const steps: QuestLogStep[] = [];
    for (const s of o.steps as Array<Partial<QuestLogStep>>) {
      if (!s || typeof s !== "object") continue;
      const id = String(s.id ?? "").slice(0, 40);
      const title = String(s.title ?? "").trim().slice(0, 120);
      if (!id || !title) continue;
      const stage = STAGE_IDS.includes(String(s.stage)) ? (s.stage as RecruitStage) : undefined;
      steps.push({
        id,
        title,
        detail: String(s.detail ?? "").trim().slice(0, 400),
        ...(stage ? { stage } : {}),
        done: Boolean(s.done),
        doneAt: String(s.doneAt ?? ""),
        doneBy: s.doneBy === "john" || s.doneBy === "recruit" ? s.doneBy : "",
      });
    }
    return {
      steps: steps.slice(0, 40),
      startedAt: String(o.startedAt ?? ""),
      lastProgressAt: String(o.lastProgressAt ?? o.startedAt ?? ""),
      message: String(o.message ?? "").slice(0, 600),
    };
  } catch {
    return null;
  }
}

export function questLogProgress(log: QuestLog): { done: number; total: number; percent: number } {
  const total = log.steps.length;
  const done = log.steps.filter((s) => s.done).length;
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
}

/** The first unfinished step, or null when the log is complete. */
export function nextStep(log: QuestLog): QuestLogStep | null {
  return log.steps.find((s) => !s.done) ?? null;
}

export function isQuestLogComplete(log: QuestLog): boolean {
  return log.steps.length > 0 && log.steps.every((s) => s.done);
}

export function daysSince(iso: string, now: Date = new Date()): number {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor((now.getTime() - t) / 86_400_000));
}

/** Nothing ticked for the stall threshold and steps still left: worth a friendly text. */
export function needsNudge(log: QuestLog, now: Date = new Date(), staleDays: number = QUEST_LOG_STALE_DAYS): boolean {
  if (isQuestLogComplete(log)) return false;
  return daysSince(log.lastProgressAt || log.startedAt, now) >= staleDays;
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}

/** A prefilled check-in text in John's voice. Plain, short, no pressure. */
export function nudgeText(name: string, log: QuestLog, link: string): string {
  const next = nextStep(log);
  const who = firstName(name);
  const opener = who ? `Hey ${who}, John here.` : "Hey, John here.";
  const step = next ? ` Next up on your Quest Log is "${next.title}."` : "";
  return `${opener} Quick check-in on your quest.${step} Anything I can do to help? Your log: ${link}`;
}

export function stageIndex(stage: string): number {
  return STAGE_IDS.indexOf(stage);
}

/** The furthest stage reached by any step John has ticked, or null if none carries a stage. */
export function stageFromLog(log: QuestLog): RecruitStage | null {
  let best: RecruitStage | null = null;
  for (const s of log.steps) {
    if (!s.done || !s.stage || s.doneBy !== "john") continue;
    if (!best || stageIndex(s.stage) > stageIndex(best)) best = s.stage;
  }
  return best;
}

let counter = 0;
export function makeStepId(): string {
  counter += 1;
  return `s_${Date.now().toString(36)}_${counter.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}
