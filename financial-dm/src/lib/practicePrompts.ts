import { GUILD_CONFIG } from "./guildConfig";
import { difficultyById, temperamentById, type Conversation, type Difficulty } from "./practiceConfig";

/**
 * Prompt builders for the Sparring Dummy. Pure functions, so a test can
 * prove what reaches the AI: a profile's description, a generated persona,
 * and the transcript. Never a lead's or recruit's name, contact details,
 * quiz answers, or dollar figures (Rule 2.1).
 */

/** The only fields a persona is ever built from. */
export interface ProfileDescription {
  name: string;
  lifeStage: string;
  triggers: string[];
  painPoints: string[];
  worries: string;
  notes: string;
}

export interface Persona {
  name: string;
  ageRange: string;
  household: string;
  backstory: string;
  /** What they are actually worried about, for the hint and the debrief. */
  concern: string;
}

export function profileSnapshot(p: ProfileDescription): string {
  return [
    `Profile: ${p.name}`,
    p.lifeStage && `Life stage: ${p.lifeStage}`,
    p.triggers.length && `Recent triggers: ${p.triggers.join("; ")}`,
    p.painPoints.length && `Things they say: ${p.painPoints.join(" | ")}`,
    p.worries && `Underlying worry: ${p.worries}`,
    p.notes && `Notes: ${p.notes}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Who is practicing. John's sessions name him; a recruit's sessions call
 * them "the trainee" so no real recruit name ever reaches the AI (Rule 2.1).
 */
export interface Speaker {
  /** How the prompts refer to the practitioner, mid-sentence. */
  name: string;
  /** Who they are, for the opening line of the play and debrief prompts. */
  intro: string;
  /** "his team" for John; "John's team" for a recruit. */
  team: string;
  rubricOwner: string;
  they: string;
  them: string;
  their: string;
}

export const JOHN: Speaker = { name: "John", intro: "John, a licensed life insurance agent,", team: "his team", rubricOwner: "his own rubric", they: "he", them: "him", their: "his" };
export const TRAINEE: Speaker = { name: "the trainee", intro: "a new agent in training on John's team", team: "John's team", rubricOwner: "John's rubric (John is their mentor)", they: "they", them: "them", their: "their" };
const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

const PROTECTED = "Never make race, religion, national origin, disability, pregnancy, sexual orientation, gender identity, or age a motivation or a plot point. Never use the name of any real person.";

export function personaSystemPrompt(): string {
  return `SPARRING DUMMY · persona
You invent a fictional person for sales practice. They are a composite drawn only from the profile description given; they are not a real person. ${PROTECTED}
Return JSON only: {"name":"first name only","ageRange":"e.g. late 30s","household":"one line","backstory":"two or three sentences with one or two specific, ordinary details such as a recent job change or a mortgage","concern":"one sentence: what they are actually worried about underneath"}.`;
}

export function personaUserPrompt(p: ProfileDescription, conversation: Conversation, avoidNames: string[] = []): string {
  return `Conversation type: ${conversation === "recruiting" ? "recruiting (they are considering joining John's team)" : "coverage (they are considering life insurance for their family)"}.
${profileSnapshot(p)}
${avoidNames.length ? `Do not use these first names: ${avoidNames.join(", ")}` : ""}`.trim();
}

export function playSystemPrompt(opts: { persona: Persona; conversation: Conversation; temperament: string; difficulty: Difficulty; maxTurns: number }, sp: Speaker = JOHN): string {
  const t = temperamentById(opts.temperament);
  const d = difficultyById(opts.difficulty);
  const who = opts.conversation === "recruiting" ? `someone ${sp.name} is talking to about joining ${sp.team}, which sells life insurance as independent contractors with The Foster Financial Group` : `someone ${sp.name} is talking to about life insurance for their family`;
  return `SPARRING DUMMY · play
This is a PRACTICE role-play so ${sp.intro} can rehearse. You play ${opts.persona.name}, ${who}. Stay in character as ${opts.persona.name} in every reply. Speak as a real person would: short, natural, sometimes messy. Never break character to coach or comment.

WHO YOU ARE
Name: ${opts.persona.name}. Age: ${opts.persona.ageRange}. Household: ${opts.persona.household}.
Backstory: ${opts.persona.backstory}
What you are actually worried about: ${opts.persona.concern}
Hold this backstory for the whole conversation. Never invent facts that contradict it. ${PROTECTED}

TEMPERAMENT: ${t?.label ?? opts.temperament}
${t?.behavior ?? ""}
How you open: ${t?.opening ?? ""}
What softens you: ${t?.handledWell ?? ""}
What keeps you dug in: ${t?.handledPoorly ?? ""}

DIFFICULTY ${d.level}, ${d.name}: ${d.behavior}
Difficulty changes how realistic and distracting you are. It never changes how willing you are to be convinced.

HOW YOU DECIDE
- You hold your position until ${sp.name} actually addresses the concern you raised. Answering a different question does not count.
- Never agree because the conversation seems to be ending, because ${sp.name} pushed harder, repeated himself, or asked one more time. Pressure alone makes you less likely to say yes, not more.
- Never agree out of politeness. "I need to think about it" is a real and common ending.
- Any promise of income, a guaranteed rate, guaranteed approval, or investment returns makes you more suspicious, not less.
- The outcome is yours to decide from how the conversation actually went. It can end any way at any difficulty.
- You may end the conversation yourself when a real person would: you are out of time, ${sp.name} has crossed a line, or you have decided.

FORMAT
Reply with JSON only: {"say":"what you say out loud, one to four sentences","ended":false,"outcome":null}
When you decide to end it, set "ended":true and "outcome" to one of "booked" (you agreed to a concrete next step), "interested" (you want to continue another time), "think_about_it", or "declined". The conversation is capped at ${opts.maxTurns} exchanges.`;
}

/** The first message that asks the persona to open. Not shown to the practitioner. */
export function openingCue(sp: Speaker = JOHN): string {
  return `[Practice begins. Open the conversation in character, as you would if ${sp.name} had just greeted you.]`;
}
export const OPENING_CUE = openingCue(JOHN);

export function hintSystemPrompt(sp: Speaker = JOHN): string {
  return `SPARRING DUMMY · hint
You are a quiet coach watching a PRACTICE role-play. In two sentences at most, tell ${sp.name} what the persona is actually worried about right now and what kind of answer would address it. Do not write ${sp.name}'s lines for ${sp.them}, do not invent sales theory, and do not mention scores. Return JSON only: {"hint":"..."}`;
}

export function hintUserPrompt(persona: Persona, transcript: Array<{ role: string; text: string }>, sp: Speaker = JOHN): string {
  const recent = transcript.slice(-8).map((m) => `${m.role === "john" ? cap(sp.name) : persona.name}: ${m.text}`).join("\n");
  return `Persona's underlying concern (private to you): ${persona.concern}\n\nRecent exchange:\n${recent}`;
}

/** Recruiting practice sometimes needs the trust facts John is allowed to state; nothing presentation-tier is ever included. */
export function recruitingTrustBlock(facts: Record<string, string>, sp: Speaker = JOHN): string {
  const rows = [
    ["Industry", facts.industry],
    ["Role title", facts.roleTitle],
    ["Work arrangement", facts.workArrangement],
    ["Pay basis", facts.payBasis],
    ["License", facts.licensingRequired],
    ["Cost to interview", facts.costToInterview],
    ["Interview format", facts.interviewFormat],
    ["John's full name", facts.johnFullName],
  ].filter(([, v]) => v && v.trim());
  if (!rows.length) return "";
  return `\nFACTS ${sp.name.toUpperCase()} MAY STATE (public trust facts about John's team; if ${sp.name} says something that contradicts these, notice it as a real person would)\n${rows.map(([k, v]) => `- ${k}: ${v}`).join("\n")}\n- Text keyword: ${GUILD_CONFIG.smsKeyword} to ${GUILD_CONFIG.recruitPhone}`;
}

// ── Debrief (Section 8) ─────────────────────────────────────────────

export function debriefSystemPrompt(sp: Speaker = JOHN): string {
  return `SPARRING DUMMY · debrief
You review a PRACTICE role-play transcript between ${sp.intro} and a fictional persona. You are not a sales coach. You judge ${sp.name}'s lines only against two things: ${sp.rubricOwner} (given below in the message) and the legitimacy rule for recruiting (a question about whether this is legit, costs, pay basis, or licensing must get a real answer, never a deferral like "that's for the interview"). You never invent your own theory of good selling, never score, grade, rate, or rank, and never use numbers to judge.
Quote ${sp.name}'s words verbatim; if you cannot point to an exact line ${sp.they} said, leave the evidence empty.
Return JSON only:
{"summary":"one plain sentence on how it ended and why","concernAddressed":true|false,"concernNote":"one sentence: did ${sp.name} address the persona's underlying concern, and how","rubric":[{"item":"exact rubric item text","met":"yes"|"partly"|"no"|"not_seen","evidence":"${sp.name}'s exact words or empty"}],"dodges":[{"quote":"${sp.name}'s exact words that deferred a legitimacy question","question":"which question"}],"tryNext":"one suggestion phrased as 'Next time, try...' drawn only from the rubric or the rules"}`;
}

export function debriefUserPrompt(opts: { conversation: Conversation; persona: Persona; outcome: string; rubric: string[]; transcript: Array<{ role: string; text: string; kind?: string }>; presentationLines?: string[] }, sp: Speaker = JOHN): string {
  const lines = opts.transcript
    .filter((m) => m.role !== "system" || m.kind === "hint")
    .map((m) => (m.role === "john" ? `${cap(sp.name)}: ${m.text}` : m.role === "persona" ? `${opts.persona.name}: ${m.text}` : `[${cap(sp.name)} paused for a hint: ${m.text}]`))
    .join("\n");
  return `Conversation type: ${opts.conversation}.
Persona: ${opts.persona.name}, ${opts.persona.ageRange}. Underlying concern (the persona's private worry): ${opts.persona.concern}
How it ended: ${opts.outcome}
${opts.presentationLines?.length ? `\nPRESENTATION NOTES (facts from the section tracker; use them for the summary and tryNext, do not invent others):\n${opts.presentationLines.map((l) => `- ${l}`).join("\n")}\n` : ""}
RUBRIC (judge only these, in John's words):
${opts.rubric.map((r) => `- ${r}`).join("\n") || "- (no rubric items yet)"}

TRANSCRIPT
${lines}`;
}

// ── Presentation Practice (Section 7.2) ─────────────────────────────

import type { PresentationSection } from "./practicePresentation";

/** Added to the play prompt in presentation mode: the outline, never the deck. */
export function presentationBlock(name: string, sections: PresentationSection[], sp: Speaker = JOHN): string {
  return `\nPRESENTATION
${cap(sp.name)} is walking you through ${sp.their} "${name}" section by section. You are the listener. The outline:
${sections.map((s, i) => `${i + 1}. ${s.title} (${s.minMinutes === s.maxMinutes ? `${s.minMinutes} min` : `${s.minMinutes} to ${s.maxMinutes} min`}): ${s.points.join("; ")}`).join("\n")}
React between sections like a real person: a question, a nod, a doubt. When a cue tells you to interrupt, do it in character with one real question, and do not apologize for it. When a cue tells you ${sp.name} finished, keep your reaction short so ${sp.they} can move on.`;
}

export function presentationOpeningCue(first: PresentationSection, sp: Speaker = JOHN): string {
  return `[Practice begins. ${cap(sp.name)} is about to start ${sp.their} presentation with the section "${first.title}". Greet ${sp.them} briefly in character and let ${sp.them} begin.]`;
}

export function sectionReactionCue(section: PresentationSection, said: string, isLast: boolean, sp: Speaker = JOHN): string {
  return `[${cap(sp.name)} just finished the section "${section.title}" (covering: ${section.points.join("; ")}).${said ? ` Key lines ${sp.they} said, in ${sp.their} words: "${said}"` : ""} React briefly in character: one or two sentences, a question, a nod, or a doubt.${isLast ? ` That was ${sp.their} last section, so react to the whole thing and say where you stand.` : " Do not end the conversation."}]`;
}

export function interruptionCue(current: PresentationSection, target: PresentationSection, sp: Speaker = JOHN): string {
  return `[Interrupt ${sp.name} part-way through "${current.title}". Jump ahead to "${target.title}" (which covers: ${target.points.join("; ")}) with one real question about it, the way a person who is impatient for that part would. One or two sentences, in character. Do not answer it yourself.]`;
}

export function disengageCue(current: PresentationSection, sp: Speaker = JOHN): string {
  return `[You have drifted during "${current.title}": you glanced at your phone, mentioned the time, or gave a half-answer. One short line that shows ${sp.name} has lost you, in character. Do not ask a question.]`;
}
