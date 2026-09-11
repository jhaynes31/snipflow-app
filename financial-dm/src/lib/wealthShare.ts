/**
 * The share card: text templates and a 1080 by 1080 PNG rendered from a
 * dedicated offscreen element (never a page capture), then shared with the
 * Web Share API or downloaded.
 */
import type { SaveResult } from "./wealthEvents";

export const SHARE_QUIZ_URL = "thefinancialdm.com/wealth-check";

export interface ShareFacts {
  eventName: string;
  eventId: string;
  total: number;
  success: boolean;
  natural20: boolean;
  tierTitle: string;
  /** The tested stat and its value; shown only when the value is 0 or better. */
  stat?: { key: string; value: number };
}

export function shareFactsFrom(eventName: string, eventId: string, save: SaveResult, tierTitle: string, statKey: string): ShareFacts {
  return {
    eventName,
    eventId,
    total: save.total,
    success: save.success,
    natural20: save.natural20,
    tierTitle,
    stat: save.modifier >= 0 ? { key: statKey, value: save.modifier } : undefined,
  };
}

/** Event names are headlines; inside a sentence the first letter goes lowercase. */
const inSentence = (name: string) => name.charAt(0).toLowerCase() + name.slice(1);

export function shareText(f: ShareFacts): string {
  const windfall = f.eventId === "windfall";
  const ev = inSentence(f.eventName);
  if (f.natural20) return `NATURAL 20 against ${ev}. ${f.tierTitle}. Beat that at the tavern.`;
  if (windfall && f.success) return `Landed a windfall and put it to work. Rolled a ${f.total}. ${f.tierTitle}. Your turn.`;
  if (windfall && !f.success) return `Landed a windfall... and it's gone. Rolled a ${f.total}. ${f.tierTitle}. Think you'd do better?`;
  if (f.success) return `I rolled a ${f.total} against ${ev} and walked away. ${f.tierTitle}. Think you'd survive the tavern?`;
  return `${f.eventName} knocked me down this time. Rolled a ${f.total}. ${f.tierTitle}, and training up. Think you'd do better?`;
}

/** Render the offscreen 1080 by 1080 card element to a PNG blob. */
export async function renderShareCard(node: HTMLElement): Promise<Blob> {
  if (typeof document !== "undefined" && document.fonts?.ready) await document.fonts.ready;
  const { toBlob } = await import("html-to-image");
  const blob = await toBlob(node, { width: 1080, height: 1080, pixelRatio: 1, cacheBust: true, backgroundColor: "#0d1520" });
  if (!blob) throw new Error("Could not render the share card.");
  return blob;
}

/** Share the PNG with the phone's share sheet when possible, else download it. */
export async function shareOrDownload(blob: Blob, text: string): Promise<"shared" | "downloaded"> {
  const file = new File([blob], "financial-dm-roll.png", { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text, title: "The Financial DM" });
      return "shared";
    } catch (e) {
      if ((e as Error).name === "AbortError") return "shared";
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "financial-dm-roll.png";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}
