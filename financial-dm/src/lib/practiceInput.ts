import { DEFAULT_DIFFICULTY, OUTCOMES, type Conversation, type Difficulty, type Outcome, type PracticeMode } from "./practiceConfig";
import type { Persona } from "./practicePrompts";

/**
 * Input shaping for the Sparring Dummy server functions. Pure, so John's
 * admin functions and a recruit's token-scoped ones validate the same way,
 * and nothing here pulls server-only code into the browser bundle.
 */

export const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

export const isOutcome = (v: unknown): v is Outcome => OUTCOMES.some((o) => o.id === v);

export const parsePersona = (raw: unknown): Persona => {
  try {
    const o = (typeof raw === "string" ? JSON.parse(raw) : raw) as Partial<Persona>;
    return { name: text(o?.name, 40) || "Alex", ageRange: text(o?.ageRange, 40), household: text(o?.household, 160), backstory: text(o?.backstory, 800), concern: text(o?.concern, 300) };
  } catch {
    return { name: "Alex", ageRange: "", household: "", backstory: "", concern: "" };
  }
};

export interface StartRaw { conversation: string; profileId?: number | null; profileSnapshot: string; persona: Persona; temperament: string; difficulty: number; mode?: string; presentationId?: number }
export const startInput = (d: StartRaw) => ({
  conversation: (d?.conversation === "recruiting" ? "recruiting" : "coverage") as Conversation,
  profileId: Number(d?.profileId) > 0 ? Number(d?.profileId) : null,
  profileSnapshot: text(d?.profileSnapshot, 2000),
  persona: parsePersona(d?.persona),
  temperament: text(d?.temperament, 40),
  difficulty: ([1, 2, 3, 4].includes(Number(d?.difficulty)) ? Number(d?.difficulty) : DEFAULT_DIFFICULTY) as Difficulty,
  mode: (d?.mode === "presentation" ? "presentation" : "objection") as PracticeMode,
  presentationId: Number(d?.presentationId) > 0 ? Number(d?.presentationId) : null,
});
export type StartInput = ReturnType<typeof startInput>;

export interface Practitioner { practitioner: "john" | "recruit"; recruitId: number | null }

export const outcomeInput = (d: { id: number; outcome: string }) => ({ id: Number(d?.id), outcome: (isOutcome(d?.outcome) ? d!.outcome : "ended_early") as Outcome });

export interface SectionRaw { id: number; sectionId: string; event: string; said?: string; seconds?: number }
export const sectionInput = (d: SectionRaw) => ({
  id: Number(d?.id),
  sectionId: text(d?.sectionId, 40),
  event: (["start", "midpoint", "delivered", "skipped"].includes(String(d?.event)) ? String(d?.event) : "start") as "start" | "midpoint" | "delivered" | "skipped",
  said: text(d?.said, 2000),
  seconds: Math.max(0, Math.min(7200, Number(d?.seconds) || 0)),
});
export type SectionInput = ReturnType<typeof sectionInput>;
