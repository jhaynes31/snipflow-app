/**
 * Compliance word flags (campaign manager spec, Section 7.4). A plain word
 * scan over generated text, case-insensitive, whole phrases only. Flags
 * warn; they never block on their own. John acknowledges them before a slot
 * can be approved.
 */
import { QUEST_CONFIG } from "./questConfig";

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function scanCompliance(text: string, words: string[] = QUEST_CONFIG.complianceFlagWords): string[] {
  const hay = (text || "").toLowerCase();
  const found: string[] = [];
  for (const w of words) {
    const phrase = w.toLowerCase().trim();
    if (!phrase) continue;
    // Whole phrase, tolerant of a hyphen or space inside it ("risk-free" / "risk free").
    const re = new RegExp(`(^|[^a-z0-9])${escape(phrase).replace(/[- ]/g, "[- ]")}(?=$|[^a-z0-9])`, "i");
    if (re.test(hay)) found.push(w);
  }
  return found;
}
