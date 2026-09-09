import { slugify } from "./scriptUtils";
import type { SocialCard } from "~/server/socialCardGenerator";

/** Render a single card element to a PNG Blob at 2x resolution. */
async function cardToPngBlob(el: HTMLElement): Promise<Blob> {
  const { toPng } = await import("html-to-image");
  const rect = el.getBoundingClientRect();
  const dataUrl = await toPng(el, {
    width: rect.width * 2,
    height: rect.height * 2,
    pixelRatio: 1,
    cacheBust: true,
  });
  const res = await fetch(dataUrl);
  return res.blob();
}

/** Trigger a single blob download via a temporary anchor. */
function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Render a single card element to a PNG and download it. */
export async function downloadCardPng(
  el: HTMLElement,
  label: string,
  format: string,
): Promise<void> {
  const { toPng } = await import("html-to-image");
  const rect = el.getBoundingClientRect();
  const dataUrl = await toPng(el, {
    width: rect.width * 2,
    height: rect.height * 2,
    pixelRatio: 1,
    cacheBust: true,
  });
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const filename = `${slugify(`${format}-${label}`)}.png`;
  triggerBlobDownload(blob, filename);
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
