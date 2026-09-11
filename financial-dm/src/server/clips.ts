import { createServerFn } from "@tanstack/react-start";
import { del } from "@vercel/blob";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { sql } from "~/db";
import { requireAdmin } from "~/server/auth";
import { cleanText } from "./contentVoice";
import type { ClipSummary, StockClip } from "~/lib/brollUtils";

/**
 * John's b roll clip library. Video files live in Vercel Blob (uploaded
 * straight from the browser with a short lived token minted here, so large
 * files never pass through a server function). Only the details live in
 * Postgres. A clip can also be a plain link (Drive, Dropbox, YouTube) when
 * Blob storage is not set up yet.
 */

export const MAX_CLIP_BYTES = 500 * 1024 * 1024; // 500 MB per clip
const ALLOWED_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/x-m4v", "image/jpeg", "image/png", "image/webp"];

function blobToken(): string | undefined {
  return process.env.BLOB_READ_WRITE_TOKEN || undefined;
}

async function ensureClipsTable(): Promise<void> {
  await sql()`
    CREATE TABLE IF NOT EXISTS broll_clips (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      tags TEXT DEFAULT '',
      url TEXT NOT NULL,
      poster_url TEXT,
      pathname TEXT,
      poster_pathname TEXT,
      content_type TEXT,
      size_bytes BIGINT,
      duration_sec REAL,
      kind TEXT DEFAULT 'upload',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

function rowToClip(r: Record<string, unknown>): ClipSummary {
  return {
    id: Number(r.id),
    name: String(r.name ?? ""),
    description: String(r.description ?? ""),
    tags: String(r.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean),
    url: String(r.url ?? ""),
    posterUrl: r.poster_url ? String(r.poster_url) : undefined,
    durationSec: r.duration_sec === null || r.duration_sec === undefined ? undefined : Number(r.duration_sec),
    kind: String(r.kind ?? "upload") === "link" ? "link" : "upload",
    createdAt: String(r.created_at ?? ""),
  };
}

/** Plain list for other server modules (the planner reads it for the prompt). */
export async function listClips(): Promise<ClipSummary[]> {
  await ensureClipsTable();
  const rows = await sql()`SELECT * FROM broll_clips ORDER BY created_at DESC`;
  return rows.map((r: Record<string, unknown>) => rowToClip(r));
}

export const getClips = createServerFn()
  .middleware([requireAdmin])
  .handler(async (): Promise<{ clips: ClipSummary[]; uploadsEnabled: boolean }> => ({
    clips: await listClips(),
    uploadsEnabled: Boolean(blobToken()),
  }));

function safeName(filename: string): string {
  return (
    filename
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "clip"
  );
}

/**
 * Mint a short lived token so the browser can upload one file directly to
 * Blob storage. Returns uploadsEnabled false when the store is not set up.
 */
export const getClipUploadToken = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { filename: string; contentType: string; size: number }) => ({
    filename: String(d?.filename ?? "clip"),
    contentType: String(d?.contentType ?? ""),
    size: Number(d?.size ?? 0),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; token?: string; pathname?: string; error?: string }> => {
    const token = blobToken();
    if (!token) return { ok: false, error: "Uploads are not set up yet. Add Blob storage in Vercel, or add the clip as a link." };
    if (!ALLOWED_TYPES.includes(data.contentType)) return { ok: false, error: "Please upload an MP4, MOV, or WebM video." };
    if (data.size > MAX_CLIP_BYTES) return { ok: false, error: "That file is over 500 MB. Trim or compress it first." };
    const pathname = `broll/${Date.now()}-${safeName(data.filename)}`;
    try {
      const clientToken = await generateClientTokenFromReadWriteToken({
        token,
        pathname,
        allowedContentTypes: ALLOWED_TYPES,
        maximumSizeInBytes: MAX_CLIP_BYTES,
        addRandomSuffix: true,
        validUntil: Date.now() + 60 * 60 * 1000,
      });
      return { ok: true, token: clientToken, pathname };
    } catch (e) {
      console.error("[clips] token error", e);
      return { ok: false, error: "Could not start the upload. Please try again." };
    }
  });

export interface SaveClipInput {
  name: string;
  description?: string;
  tags?: string[];
  url: string;
  posterUrl?: string;
  pathname?: string;
  posterPathname?: string;
  contentType?: string;
  sizeBytes?: number;
  durationSec?: number;
  kind: "upload" | "link";
}

export const saveClip = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: SaveClipInput) => d)
  .handler(async ({ data }): Promise<{ ok: boolean; clip?: ClipSummary; error?: string }> => {
    const name = cleanText(data.name).slice(0, 120);
    const url = String(data.url ?? "").trim();
    if (!name) return { ok: false, error: "Give the clip a name." };
    if (!/^https?:\/\//i.test(url)) return { ok: false, error: "That link does not look right. It should start with http." };
    try {
      await ensureClipsTable();
      const tags = (data.tags ?? []).map((t) => cleanText(t).toLowerCase()).filter(Boolean).slice(0, 20).join(",");
      const rows = await sql()`
        INSERT INTO broll_clips (name, description, tags, url, poster_url, pathname, poster_pathname, content_type, size_bytes, duration_sec, kind)
        VALUES (${name}, ${cleanText(data.description ?? "").slice(0, 500)}, ${tags}, ${url}, ${data.posterUrl ?? null}, ${data.pathname ?? null}, ${data.posterPathname ?? null}, ${data.contentType ?? null}, ${data.sizeBytes ?? null}, ${data.durationSec ?? null}, ${data.kind === "link" ? "link" : "upload"})
        RETURNING *
      `;
      return { ok: true, clip: rowToClip(rows[0] as Record<string, unknown>) };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

export const updateClip = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: number; name?: string; description?: string; tags?: string[] }) => d)
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    try {
      await ensureClipsTable();
      const id = Number(data.id);
      if (data.name !== undefined) await sql()`UPDATE broll_clips SET name = ${cleanText(data.name).slice(0, 120)} WHERE id = ${id}`;
      if (data.description !== undefined) await sql()`UPDATE broll_clips SET description = ${cleanText(data.description).slice(0, 500)} WHERE id = ${id}`;
      if (data.tags !== undefined) {
        const tags = data.tags.map((t) => cleanText(t).toLowerCase()).filter(Boolean).slice(0, 20).join(",");
        await sql()`UPDATE broll_clips SET tags = ${tags} WHERE id = ${id}`;
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

export const deleteClip = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: number }) => ({ id: Number(d?.id) }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    try {
      await ensureClipsTable();
      const rows = await sql()`SELECT url, poster_url, kind FROM broll_clips WHERE id = ${data.id}`;
      const row = rows[0] as Record<string, unknown> | undefined;
      await sql()`DELETE FROM broll_clips WHERE id = ${data.id}`;
      // Remove the stored files too, when this was an upload we own.
      const token = blobToken();
      if (row && String(row.kind) !== "link" && token) {
        const urls = [row.url, row.poster_url].filter((u): u is string => typeof u === "string" && u.length > 0);
        if (urls.length) await del(urls, { token }).catch((e) => console.error("[clips] blob delete failed", e));
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

// ── Free stock footage search (Pexels) ─────────────────────────────
// Pexels clips are free for commercial use without attribution (credit is
// still shown as a courtesy). Needs PEXELS_API_KEY; without it the search
// says so instead of failing.

export async function searchPexels(
  query: string,
  orientation: "portrait" | "landscape" | "square" = "portrait",
  perPage = 9,
): Promise<{ ok: boolean; clips: StockClip[]; error?: string }> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return { ok: false, clips: [], error: "Stock search is not set up yet. Add a free Pexels key (PEXELS_API_KEY) in Vercel." };
  const q = query.trim().slice(0, 120);
  if (!q) return { ok: true, clips: [] };
  try {
    const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(q)}&per_page=${perPage}&orientation=${orientation}`;
    const res = await fetch(url, { headers: { Authorization: key } });
    if (!res.ok) return { ok: false, clips: [], error: `Stock search failed (${res.status}).` };
    const json = (await res.json()) as {
      videos?: Array<{
        id: number;
        url: string;
        image?: string;
        duration?: number;
        width?: number;
        height?: number;
        user?: { name?: string };
        video_files?: Array<{ link: string; quality?: string; width?: number; height?: number; file_type?: string }>;
      }>;
    };
    const clips: StockClip[] = (json.videos ?? []).map((v) => {
      // Prefer an HD mp4 that is not enormous; keep a small one for hover previews.
      const files = (v.video_files ?? []).filter((f) => (f.file_type ?? "video/mp4") === "video/mp4");
      const hd = files.find((f) => f.quality === "hd" && Math.max(f.height ?? 0, f.width ?? 0) <= 1920) ?? files.find((f) => f.quality === "hd") ?? files[0];
      const sd = files.filter((f) => f.quality === "sd").sort((a, b) => (a.width ?? 0) - (b.width ?? 0))[0] ?? hd;
      const slug = v.url.replace(/\/$/, "").split("/").pop() ?? `pexels-${v.id}`;
      return {
        id: v.id,
        name: slug.replace(/-\d+$/, "").replace(/-/g, " "),
        url: hd?.link ?? v.url,
        previewUrl: sd?.link,
        pageUrl: v.url,
        posterUrl: v.image,
        durationSec: v.duration,
        width: hd?.width ?? v.width,
        height: hd?.height ?? v.height,
        credit: v.user?.name ? `Video by ${v.user.name} on Pexels` : "Pexels",
      };
    });
    return { ok: true, clips };
  } catch (e) {
    console.error("[clips] stock search failed", e);
    return { ok: false, clips: [], error: "Stock search is unreachable right now." };
  }
}

export const searchStockClips = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { query: string; orientation?: "portrait" | "landscape" | "square"; perPage?: number }) => ({
    query: String(d?.query ?? ""),
    orientation: d?.orientation ?? "portrait",
    perPage: Math.min(Math.max(Number(d?.perPage ?? 9) || 9, 1), 24),
  }))
  .handler(async ({ data }) => searchPexels(data.query, data.orientation, data.perPage));

export const stockSearchEnabled = createServerFn()
  .middleware([requireAdmin])
  .handler(async (): Promise<boolean> => Boolean(process.env.PEXELS_API_KEY));
