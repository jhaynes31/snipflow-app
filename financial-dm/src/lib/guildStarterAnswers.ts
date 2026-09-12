import { MEETING_COVERS_DRAFT } from "./guildConfig";

/**
 * John's answers to the trust facts, relayed by Jen on 12 Sep 2026 and
 * lightly tidied for grammar without changing meaning. They are applied
 * once, only to facts that have never been saved, so anything John types
 * or clears on the Guild facts page always wins over this file.
 *
 * Two required facts were not answered and are left for him:
 *   recruitCosts (what a recruit pays to get started) and
 *   investmentPathExists (the optional investment licensing path).
 */
export const GUILD_STARTER_ANSWERS: Array<{ key: string; value: string; confirmed: boolean }> = [
  { key: "industry", value: "Life insurance", confirmed: true },
  { key: "roleTitle", value: "Insurance Contractor", confirmed: true },
  { key: "roleSummary", value: "Finding out people's financial goals and helping them get there.", confirmed: true },
  { key: "workArrangement", value: "Independent contractor with The Foster Financial Group.", confirmed: true },
  { key: "meetingCovers", value: MEETING_COVERS_DRAFT, confirmed: true },
  { key: "costToInterview", value: "The interview is free. You will never be asked for payment or financial information to interview.", confirmed: true },
  { key: "payBasis", value: "Commission-based.", confirmed: true },
  { key: "licensingRequired", value: "A state life insurance license is required.", confirmed: true },
  { key: "interviewFormat", value: "On Zoom, about 45 minutes.", confirmed: true },
  { key: "johnFullName", value: "John Haynes", confirmed: true },
  // John approved the fit quiz copy and scoring as built (relayed by Jen, 12 Sep 2026).
  { key: "fitQuizApproved", value: "yes", confirmed: true },
  // Fair questions, relayed the same day. The costs answer waits on the missing recruitCosts fact, so it is left unconfirmed.
  { key: "faq_legit", value: "The Foster Financial Group is an agency inside Primerica, which you can look up. I'm John Haynes, a licensed life insurance agent, and the interview is a Zoom call where you can ask me anything.", confirmed: true },
  { key: "faq_experience_license", value: "No experience needed. A state life insurance license is required to do the work, and getting one is part of getting started.", confirmed: true },
  { key: "faq_costs", value: "Interviewing costs nothing, and you will never be asked for payment or financial information to interview. Getting started does have costs, which you pay yourself. TODO(John): say plainly what they are, for example the pre-licensing course and the state exam fee.", confirmed: false },
  { key: "faq_pay", value: "Pay is commission-based, not a salary. The details of how that works are what the conversation is for.", confirmed: true },
  { key: "faq_interview", value: "It's a Zoom call, about 45 minutes. We get to know each other, and I walk through the licensing, the fees, and the process. If it's helpful, I can also answer questions about your own coverage or finances. No pressure either way.", confirmed: true },
];
