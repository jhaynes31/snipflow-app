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
];
