import { deckSummaries } from "./slideEditor";
import type { EditableSlide } from "./slideEditor";
import {
  downloadElementPng,
  elementToPngBlob,
  triggerBlobDownload,
} from "./exportPng";

export { slugify, downloadScript } from "./scriptUtils";

/**
 * Build the plain text export of a carousel caption: title, caption,
 * call to action, and hashtags. Uses clean lines and plain words, no
 * em dashes or hyphens in visible labels.
 */
export function buildCarouselCaption(
  title: string,
  caption: string,
  callToAction: string,
  hashtags: string[],
): string {
  const parts: string[] = [title];
  if (caption) parts.push("", caption);
  if (callToAction) parts.push("", callToAction);
  if (hashtags && hashtags.length > 0) {
    parts.push("", hashtags.join(" "));
  }
  return parts.join("\n");
}

/** Trigger a client side download of text as a .txt file. */
export function downloadCarouselText(filename: string, text: string): void {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Rasterize a single slide element to a print ready PNG and trigger a
 * download. Uses the shared export helper (see lib/exportPng.ts) so slides,
 * cards, and memes all frame and scale the same way.
 */
export async function downloadSlidePng(
  el: HTMLElement,
  titleSlug: string,
  slideLabel: string,
): Promise<void> {
  await downloadElementPng(el, `${titleSlug}-slide-${slideLabel}.png`);
}

/** Render a single slide element to a PNG Blob at export resolution. */
function slideToPngBlob(el: HTMLElement): Promise<Blob> {
  return elementToPngBlob(el);
}

/**
 * Download every slide as a single ZIP archive named after the carousel
 * slug (e.g. "my-title-slides.zip"). Each slide is rasterized to a PNG
 * Blob at export resolution, all blobs are packed into one ZIP, and a single archive download is
 * triggered. This replaces the old multi-download loop, because browsers
 * reliably block all but the first programmatic download in a tight sequence.
 * A single file can never be lost.
 */
export async function downloadAllSlidesZip(
  titleSlug: string,
  slides: { el: HTMLElement; label: string }[],
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  for (let i = 0; i < slides.length; i++) {
    const blob = await slideToPngBlob(slides[i].el);
    zip.file(`${titleSlug}-slide-${slides[i].label}.png`, blob);
    onProgress?.(i + 1, slides.length);
  }
  const archive = await zip.generateAsync({ type: "blob" });
  triggerBlobDownload(archive, `${titleSlug}-slides.zip`);
}

/** Build the full text download of a carousel (deck + caption). */
export function buildCarouselText(
  title: string,
  topic: string,
  tone: string,
  dndThemed: boolean,
  caption: string,
  callToAction: string,
  hashtags: string[],
  deck: EditableSlide[],
  painPoint?: string,
): string {
  const slides = deckSummaries(deck);
  const metaLines = [`Topic: ${topic}`, `Tone: ${tone}`];
  if (painPoint) metaLines.push(`Pain point: ${painPoint}`);
  if (dndThemed) metaLines.push("D&D theme: Yes");
  const parts: string[] = [title, "", metaLines.join("  |  "), ""];
  slides.forEach((s, i) => {
    parts.push(`Slide ${i + 1}`);
    parts.push(s.heading);
    if (s.body) parts.push(s.body);
    parts.push("");
  });
  if (caption) parts.push("Caption", caption);
  if (callToAction) parts.push("", callToAction);
  if (hashtags && hashtags.length > 0) {
    parts.push("", "Hashtags", hashtags.join(" "));
  }
  return parts.join("\n");
}
