import { difficultyById, type Conversation, type Difficulty } from "./practiceConfig";

/**
 * Presentation Practice (AI practice spec, Section 7.2). A presentation is
 * an outline in John's own words: ordered sections, each with a target time
 * and the points he makes. Never the deck itself. The persona reacts
 * between sections and, at Levels 2 to 4, interrupts mid-section, usually
 * by jumping ahead. Getting back on track is the skill, and the debrief
 * reports it from the section notes kept here.
 */

export interface PresentationSection {
  id: string;
  title: string;
  minMinutes: number;
  maxMinutes: number;
  points: string[];
}

export interface Presentation {
  id: number;
  name: string;
  conversation: Conversation;
  version: number;
  sections: PresentationSection[];
  updatedAt: string;
  /** "dmScreen" when this is a DM Screen script read through Section 6 of that spec; the practice tool never edits those. */
  source?: "outline" | "dmScreen";
}

export interface SectionProgress {
  sectionId: string;
  startedAt: string;
  endedAt: string;
  seconds: number;
  status: "open" | "delivered" | "skipped";
  /** What John typed as the key lines he said, optional. */
  said: string;
  interrupted: boolean;
  /** "jump" when the persona jumped ahead, "drift" when it disengaged. */
  interruptKind: "" | "jump" | "drift";
  interruptTargetId: string;
  /** He finished the interrupted section after answering: back on track. */
  recovered: boolean;
}

/** John's recruiting presentation, as he described it on 12 Sep 2026. Editable on the Practice page. */
export const JOHN_RECRUITING_PRESENTATION: { name: string; conversation: Conversation; sections: PresentationSection[] } = {
  name: "Recruiting presentation",
  conversation: "recruiting",
  sections: [
    { id: "background", title: "Background and vibe check", minMinutes: 5, maxMinutes: 20, points: ["Rapport building with conversation", "General guidelines about the job and what it entails"] },
    { id: "company", title: "The company", minMinutes: 2, maxMinutes: 2, points: ["Leadership team", "Primerica blurb"] },
    { id: "house", title: "The house", minMinutes: 5, maxMinutes: 7, points: ["Goals of working here", "Financial challenges list", "Showing how easy it is to get people talking about money", "Describing the walls and ceiling of the house", "John and Mary example"] },
    { id: "getting_started", title: "Getting started", minMinutes: 5, maxMinutes: 10, points: ["Compensation description", "Cost of getting licensed", "Next steps"] },
  ],
};

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "section";

export function normalizeSections(raw: unknown): PresentationSection[] {
  const arr = Array.isArray(raw) ? raw : [];
  const used = new Set<string>();
  const out: PresentationSection[] = [];
  for (const r of arr.slice(0, 20) as Array<Partial<PresentationSection> & { points?: unknown }>) {
    const title = String(r?.title ?? "").trim().slice(0, 120);
    if (!title) continue;
    let id = String(r?.id ?? "").trim().slice(0, 40) || slug(title);
    while (used.has(id)) id = `${id}_2`;
    used.add(id);
    const min = Math.max(0, Math.min(120, Number(r?.minMinutes) || 0));
    const max = Math.max(min, Math.min(180, Number(r?.maxMinutes) || min));
    const pts = Array.isArray(r?.points) ? (r!.points as unknown[]) : String(r?.points ?? "").split("\n");
    out.push({ id, title, minMinutes: min, maxMinutes: max, points: pts.map((p) => String(p ?? "").trim().slice(0, 200)).filter(Boolean).slice(0, 12) });
  }
  return out;
}

/** Section 7.2 interruption rules: frequency scales with difficulty; many_questions interrupts most; distracted disengages instead. */
export function interruptionChance(level: Difficulty, temperamentId: string): { jump: number; drift: number } {
  const base = difficultyById(level).interruptionRate;
  if (!base) return { jump: 0, drift: 0 };
  if (temperamentId === "distracted") return { jump: base * 0.25, drift: Math.min(0.95, base * 1.2) };
  if (temperamentId === "many_questions") return { jump: Math.min(0.95, base * 1.5), drift: 0 };
  if (temperamentId === "think_about_it") return { jump: base * 0.6, drift: 0 };
  return { jump: base, drift: 0 };
}

/** Interruptions usually jump ahead: pick a later section, favoring the ones people really jump to. */
export function pickJumpTarget(sections: PresentationSection[], currentIdx: number, roll01: number): PresentationSection | null {
  const later = sections.slice(currentIdx + 1);
  if (!later.length) return null;
  // Weight later sections toward the end (pay, costs, next steps live there).
  const weights = later.map((_, i) => i + 1);
  const total = weights.reduce((a, b) => a + b, 0);
  let acc = 0;
  const r = Math.min(0.999, Math.max(0, roll01)) * total;
  for (let i = 0; i < later.length; i++) {
    acc += weights[i];
    if (r < acc) return later[i];
  }
  return later[later.length - 1];
}

/** When the mid-section interruption may land: about a third into the target, between 20 seconds and 2 minutes. Fast mode for tests. */
export function midpointSeconds(section: PresentationSection, fast = false): number {
  if (fast) return 2;
  const target = Math.max(section.minMinutes, 1) * 60;
  return Math.max(20, Math.min(120, Math.round(target / 3)));
}

export interface PresentationSummary {
  covered: string[];
  skipped: string[];
  notStarted: string[];
  derailed: Array<{ section: string; kind: "jump" | "drift"; jumpedTo: string; recovered: boolean }>;
  pacing: Array<{ section: string; minutes: number; target: string; verdict: "under" | "on" | "over" }>;
  /** Plain lines for the debrief prompt and display. */
  lines: string[];
}

export function presentationSummary(sections: PresentationSection[], progress: SectionProgress[]): PresentationSummary {
  const byId = new Map(progress.map((p) => [p.sectionId, p]));
  const covered: string[] = [];
  const skipped: string[] = [];
  const notStarted: string[] = [];
  const derailed: PresentationSummary["derailed"] = [];
  const pacing: PresentationSummary["pacing"] = [];
  for (const s of sections) {
    const p = byId.get(s.id);
    if (!p || p.status === "open") {
      notStarted.push(s.title);
      continue;
    }
    if (p.status === "delivered") {
      covered.push(s.title);
      const minutes = Math.round((p.seconds / 60) * 10) / 10;
      const verdict = minutes < s.minMinutes * 0.6 ? "under" : minutes > s.maxMinutes * 1.25 ? "over" : "on";
      pacing.push({ section: s.title, minutes, target: s.minMinutes === s.maxMinutes ? `${s.minMinutes} min` : `${s.minMinutes} to ${s.maxMinutes} min`, verdict });
    } else skipped.push(s.title);
    if (p.interrupted) {
      const target = sections.find((x) => x.id === p.interruptTargetId);
      derailed.push({ section: s.title, kind: p.interruptKind === "drift" ? "drift" : "jump", jumpedTo: target?.title ?? "", recovered: p.recovered });
    }
  }
  const lines: string[] = [];
  lines.push(`Covered: ${covered.length ? covered.join(", ") : "none"}.`);
  if (skipped.length) lines.push(`Skipped: ${skipped.join(", ")}.`);
  if (notStarted.length) lines.push(`Not reached: ${notStarted.join(", ")}.`);
  for (const d of derailed) lines.push(d.kind === "drift" ? `${d.section}: the persona drifted off; John ${d.recovered ? "re-engaged them and finished the section" : "did not finish the section"}.` : `${d.section}: the persona jumped ahead to ${d.jumpedTo || "a later section"}; John ${d.recovered ? "answered and came back to finish the section" : "did not come back to it"}.`);
  for (const p of pacing) if (p.verdict !== "on") lines.push(`${p.section} ran ${p.verdict === "under" ? "short" : "long"}: ${p.minutes} min against ${p.target}.`);
  return { covered, skipped, notStarted, derailed, pacing, lines };
}
