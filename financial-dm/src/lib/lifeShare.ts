/**
 * Trap or Treasure share card text (dice spec, Section 14.1). The card never
 * carries dollar amounts, party details, the AC tier, or coverage answers.
 */
export const LIFE_SHARE_URL = "thefinancialdm.com/quiz";

export function trapShareText(score: number): string {
  return `I got ${score} of 3 right in Trap or Treasure at the Financial DM's tavern. Think you'd spot the traps?`;
}
