/**
 * Shared PNG export for every rasterized preview (carousel slides, social
 * cards, memes). One place, one behavior, so all six call sites frame and
 * scale identically.
 *
 * Why this exists: the old call sites passed `width: rect.width * 2,
 * height: rect.height * 2, pixelRatio: 1` to html-to-image. Those `width` and
 * `height` options only enlarge the capture frame; the node itself is still
 * laid out at its on screen size, so the content ended up at 1x in the top
 * left quarter of an oversized, mostly empty canvas. Nothing gained
 * resolution either, which is why posts looked soft.
 *
 * The fix is `pixelRatio`: html-to-image renders the node at its natural
 * size and rasterizes the SVG at `pixelRatio` device pixels per CSS pixel, so
 * text and vector art come out crisp and the frame exactly matches the node.
 * We also raise the ratio so the shorter edge is at least EXPORT_MIN_EDGE
 * pixels, which is what phones and the major platforms display natively.
 */

export const EXPORT_MIN_EDGE = 1080;

/** Minimum multiplier over the on screen size, even for large previews. */
const MIN_RATIO = 2;

/** Hard cap so a tiny preview cannot request an absurd canvas. */
const MAX_RATIO = 6;

export function exportPixelRatio(el: HTMLElement): number {
  const rect = el.getBoundingClientRect();
  const shortEdge = Math.max(1, Math.min(rect.width, rect.height));
  // A hair over, so rounding on a fractional preview width never lands a pixel short of 1080.
  const forMinEdge = (EXPORT_MIN_EDGE + 2) / shortEdge;
  return Math.min(MAX_RATIO, Math.max(MIN_RATIO, forMinEdge));
}

/** Rasterize an element to a PNG data URL at export resolution. */
export async function elementToPngDataUrl(el: HTMLElement): Promise<string> {
  // html-to-image uses SVG foreignObject, the browser's own renderer, so it
  // handles oklch(), object-fit, container queries, and layout naturally.
  const { toPng } = await import("html-to-image");
  return toPng(el, {
    pixelRatio: exportPixelRatio(el),
    cacheBust: true,
    // The on-screen preview has rounded corners and a thin frame line. In the
    // file those corners would be transparent, and TikTok, Instagram, and the
    // rest fill transparent pixels with white. The export squares them off and
    // drops the line, so the image reaches every edge of its box.
    // The preview also dims unselected cards a little; the file must be fully opaque.
    style: { borderRadius: "0", border: "none", boxShadow: "none", outline: "none", opacity: "1" },
  });
}

/** Rasterize an element to a PNG Blob at export resolution. */
export async function elementToPngBlob(el: HTMLElement): Promise<Blob> {
  const dataUrl = await elementToPngDataUrl(el);
  const res = await fetch(dataUrl);
  return res.blob();
}

/** Trigger a single blob download via a temporary anchor. */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Rasterize an element and download it as `filename`. */
export async function downloadElementPng(
  el: HTMLElement,
  filename: string,
): Promise<void> {
  const blob = await elementToPngBlob(el);
  triggerBlobDownload(blob, filename);
}
