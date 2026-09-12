import { GUILD_CONFIG, smsLink } from "./guildConfig";
import { FIT_RESULT_COPY, fitLevelLabel, guildClassName, type FitLevel } from "./fitQuiz";

/**
 * Every email the site can send, as plain text with a light HTML twin.
 * John's notifications carry just enough to act (a name, a quiz, a phone
 * number, a link into the admin), never quiz answers or dollar figures.
 * Emails to the public follow the Guild rules: no pay talk, no promises,
 * and the meeting disclosure whenever the interview comes up.
 */

const SITE = "https://thefinancialdm.com";

export interface MailBody {
  subject: string;
  text: string;
  html: string;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);

/** A calm, brand-colored wrapper. Text first; HTML is the same words. */
function wrap(title: string, paragraphs: string[], cta?: { label: string; href: string }): MailBody {
  const text = [title, "", ...paragraphs, ...(cta ? ["", `${cta.label}: ${cta.href}`] : []), "", "The Financial DM · A division of The Foster Financial Group"].join("\n");
  const html = `<div style="font-family:'Work Sans','Segoe UI',system-ui,sans-serif;background:#f3eee3;padding:24px"><div style="max-width:560px;margin:0 auto;background:#faf7f0;border:2px solid #1c3660;border-radius:12px;padding:24px;color:#2a3442"><h1 style="font-family:Cinzel,Georgia,serif;color:#1c3660;font-size:22px;margin:0 0 12px">${esc(title)}</h1>${paragraphs.map((p) => `<p style="font-size:16px;line-height:1.5;margin:0 0 12px;white-space:pre-line">${esc(p)}</p>`).join("")}${cta ? `<p style="margin:20px 0 0"><a href="${esc(cta.href)}" style="display:inline-block;background:#c8a24b;color:#1c1a12;font-weight:600;padding:12px 20px;border-radius:8px;text-decoration:none">${esc(cta.label)}</a></p>` : ""}<p style="font-size:12px;color:#6b6355;margin:24px 0 0">The Financial DM · A division of The Foster Financial Group</p></div></div>`;
  return { subject: title, text, html };
}

// ── To John ─────────────────────────────────────────────────────────

export interface NewLeadNotice {
  id: number;
  name: string;
  phone: string;
  email: string;
  quizLabel: string;
  result: string;
  source: string;
}

export function newLeadEmail(l: NewLeadNotice): MailBody {
  return wrap(`New lead: ${l.name}`, [
    `${l.name} just finished the ${l.quizLabel}${l.result ? ` and landed on ${l.result}` : ""}.`,
    [l.phone && `Phone: ${l.phone}`, l.email && `Email: ${l.email}`, l.source && `Found you via: ${l.source}`].filter(Boolean).join("\n"),
    "The full record is in Leads. Answers stay there, not in this email.",
  ], { label: "Open in Leads", href: `${SITE}/admin/leads?lead=${l.id}` });
}

export interface NewRecruitNotice {
  name: string;
  phone: string;
  email: string;
  source: string;
  fitClass?: string;
  fitLevel?: string;
  bestTime?: string;
}

export function newRecruitEmail(r: NewRecruitNotice): MailBody {
  const fit = r.fitClass ? `Fit quiz: ${guildClassName(r.fitClass)}, ${fitLevelLabel(r.fitLevel ?? "")}.` : "";
  return wrap(`New recruit: ${r.name}`, [
    `${r.name} asked for an interview through the ${r.source === "fit_quiz" ? "fit quiz" : "Guild Hall form"}.`,
    [r.phone && `Phone: ${r.phone}`, r.email && `Email: ${r.email}`, r.bestTime && `Best time: ${r.bestTime}`, fit].filter(Boolean).join("\n"),
    "They are in the Guild pipeline at Interested.",
  ], { label: "Open the Guild", href: `${SITE}/admin/guild?view=recruits` });
}

// ── To the public ───────────────────────────────────────────────────

export interface FitResultMail {
  firstName: string;
  guildClass: string;
  fitLevel: FitLevel;
  johnName: string;
  /** The confirmed meeting disclosure, in John's words. */
  meetingCovers: string;
}

/** The fit quiz result, for people who ticked "email me my result". Every level offers the interview. */
export function fitResultEmail(f: FitResultMail): MailBody {
  const copy = FIT_RESULT_COPY[f.fitLevel];
  const john = f.johnName.split(/\s+/)[0] || "John";
  return wrap(`Your Guild class: ${guildClassName(f.guildClass)}`, [
    `${f.firstName ? `${f.firstName}, y` : "Y"}ou took "Is This Quest for You?" and came out as ${guildClassName(f.guildClass)}. ${copy.headline}`,
    copy.body,
    `What the conversation covers, from ${john}: ${f.meetingCovers}`,
    `To set up a time, text ${GUILD_CONFIG.smsKeyword} to ${GUILD_CONFIG.recruitPhone} (${smsLink()}) or reply to this email. Interviews are free, with no obligation.`,
  ], { label: "Back to the Guild Hall", href: `${SITE}/guild` });
}

/** For the Settings view: what each template is, when it goes out, and a sample. */
export const MAIL_TEMPLATES = [
  { id: "new_lead", name: "New lead", to: "John", when: "Someone finishes a quiz and leaves their details.", sample: () => newLeadEmail({ id: 1, name: "Sam Rivera", phone: "316-555-0100", email: "sam@example.com", quizLabel: "Life Insurance Quiz", result: "Gold", source: "TikTok" }) },
  { id: "new_recruit", name: "New recruit", to: "John", when: "Someone asks for an interview on the Guild Hall or the fit quiz.", sample: () => newRecruitEmail({ name: "Sam Rivera", phone: "316-555-0100", email: "sam@example.com", source: "fit_quiz", fitClass: "bard", fitLevel: "strong" }) },
  { id: "fit_result", name: "Fit quiz result", to: "The person, only if they asked for it", when: "They finish the fit quiz, request an interview, and tick the email box.", sample: () => fitResultEmail({ firstName: "Sam", guildClass: "bard", fitLevel: "strong", johnName: "John Haynes", meetingCovers: "We'll walk through what the work involves, how it's paid, and whether it fits. If it's helpful, I can also answer questions about your own coverage or finances." }) },
] as const;
