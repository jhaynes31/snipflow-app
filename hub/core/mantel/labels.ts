/** Plain words for the mantel's tags and speakers. Pure; tested. */
export type MantelKind = "takeaway" | "quote" | "prayer" | "forPartner";
export type MantelSpeaker = "coach" | "dad" | "mom" | "me";

export const KIND_LABEL: Record<MantelKind, string> = { takeaway: "A takeaway", quote: "A line to keep", prayer: "A prayer", forPartner: "For my partner" };
export const SPEAKER_LABEL: Record<MantelSpeaker, string> = { coach: "The coach", dad: "Dad", mom: "Mom", me: "Me" };

/** Who spoke, from the coach task a reply came out of. */
export function speakerForTask(task: string | undefined): MantelSpeaker {
  if (!task) return "coach";
  if (task.startsWith("hearth.father") || task.startsWith("hearth.eyes") || task.startsWith("hearth.told")) return "dad";
  if (task.startsWith("hearth.")) return "mom";
  return "coach";
}

/** A short "where it was kept from" label for a task key. */
export function sourceForTask(task: string | undefined): string | undefined {
  const names: Record<string, string> = {
    "hub.talk": "Talk it through",
    "tend.talkItOut": "Talk It Out",
    "tend.repair": "Repair",
    "reCentered.talk": "Re-Centered",
    "apothecary.ask": "The Apothecary",
    "orchard.compass": "The Compass",
    "orchard.lonely": "The lonely hour",
    "orchard.stay": "Too long",
    "renewedMind.steps": "Live It",
    "well.passage": "The Well",
    "well.compare": "The Well",
    "well.untangle": "Untangle",
    "crossroads.guide": "The Crossroads",
    "metamorphosis.mentor": "The mentor",
    "metamorphosis.landing": "The Landing",
    "metamorphosis.map": "The Map",
    "metamorphosis.shieldDown": "Shield Down",
    "metamorphosis.knowing": "Getting to know him",
    "metamorphosis.horizon": "The Horizon",
    "hearth.father": "Ask him",
    "hearth.eyes": "In his eyes",
    "hearth.told": "Tell him what happened",
    "hearth.mother": "Ask her",
    "hearth.sit": "Come sit",
    "hearth.care": "Her care shelf",
    "hearth.know": "What I know",
    "hearth.girl": "The girl",
    "hearth.teen": "The teenager",
  };
  return task ? names[task] : undefined;
}

/** The sentence the person highlighted inside a reply, if any; else the whole reply. */
export function pickKeep(reply: string, selection: string | null | undefined): string {
  const sel = (selection ?? "").trim();
  if (sel.length >= 8 && reply.includes(sel)) return sel;
  return reply.trim();
}
