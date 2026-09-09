import { slugify } from "./scriptUtils";
import type { SocialCard } from "~/server/socialCardGenerator";
import {
  downloadElementPng,
  elementToPngBlob,
  triggerBlobDownload,
} from "./exportPng";

/** Render a single card element to a PNG Blob at export resolution. */
function cardToPngBlob(el: HTMLElement): Promise<Blob> {
  return elementToPngBlob(el);
}

/** Render a single card element to a PNG and download it. */
export async function downloadCardPng(
  el: HTMLElement,
  label: string,
  format: string,
): Promise<void> {
  await downloadElementPng(el, `${slugify(`${format}-${label}`)}.png`);
}

/**
 * Download every card as a single ZIP archive. Mirrors the carousel
 * "Download All" pattern so browsers never block the multi-download loop.
 */
export async function downloadAllCardsZip(
  batchName: string,
  cards: { el: HTMLElement; label: string }[],
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  for (let i = 0; i < cards.length; i++) {
    const blob = await cardToPngBlob(cards[i].el);
    zip.file(`${slugify(batchName)}-card-${cards[i].label}.png`, blob);
    onProgress?.(i + 1, cards.length);
  }
  const archive = await zip.generateAsync({ type: "blob" });
  triggerBlobDownload(archive, `${slugify(batchName)}-cards.zip`);
}

/** Build a plain text recap of a card batch (for quick copy/paste). */
export function buildSocialCardText(cards: SocialCard[]): string {
  const parts: string[] = [];
  cards.forEach((c, i) => {
    parts.push(`Card ${i + 1}`);
    if (c.topic) parts.push(`Topic: ${c.topic}`);
    if (c.headline) parts.push(c.headline);
    if (c.body) parts.push(c.body);
    if (c.punchline) parts.push(c.punchline);
    parts.push("");
  });
  return parts.join("\n");
}
