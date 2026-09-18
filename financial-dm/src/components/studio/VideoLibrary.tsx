import { Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { STUDIO_SOURCES, STUDIO_STATUSES, filterVideos, fmtLength, scriptText, studioLink, topicsOf, type LibraryFilter, type StudioSource, type StudioStatus, type VideoProject } from "~/lib/studio";
import { deleteStudioVideo, duplicateStudioVideo, listStudioVideos, startStudioVideo, updateStudioVideo } from "~/server/studio";

const card = "rounded-xl border border-[#406080]/30 bg-[#111a28]";
const focus = "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c08020]";
const input = `px-3 py-2 rounded-lg bg-[#0d1520]/60 border border-[#406080]/40 text-[#e0e0e0] text-sm ${focus}`;
const btnPrimary = `px-4 py-2 rounded-lg bg-[#c08020] hover:bg-[#a06a18] text-[#0d1520] font-bold font-fantasy text-sm disabled:opacity-50 ${focus}`;
const btnGhost = `px-3 py-1.5 rounded-lg border border-[#406080]/40 text-[#a0a0a0] hover:text-[#e0e0e0] hover:border-[#c08020]/50 font-fantasy text-xs disabled:opacity-50 ${focus}`;

const fmtDate = (s: string) => (s ? new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");

/**
 * Every video John has made, so he always knows where his posts are
 * (Recording Studio spec, Saving and library). Filter by status, source,
 * shelf, and topic; search titles and script text; reopen, duplicate, mark
 * posted, or delete. Guild recruiting videos sit on their own shelf.
 */
export default function VideoLibrary() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<VideoProject[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [filter, setFilter] = useState<LibraryFilter>({ status: "all", source: "all", shelf: "all", topic: "", q: "" });

  const load = useCallback(() => listStudioVideos().then(setRows).catch((e) => setError(String(e))), []);
  useEffect(() => {
    load();
  }, [load]);

  const shown = useMemo(() => (rows ? filterVideos(rows, filter) : []), [rows, filter]);
  const topics = useMemo(() => (rows ? topicsOf(rows) : []), [rows]);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy("");
    }
  };

  const newVideo = () =>
    run("new", async () => {
      const res = await startStudioVideo({ data: { source: "freestyle", recruiting: false, title: "", topic: "", painPoint: "", tone: "", script: { hook: "", body: "", cta: "" }, fresh: true } });
      if (!res.ok || !res.id) throw new Error(res.error || "Could not start a video.");
      navigate(studioLink(res.id));
    });

  const setStatus = (v: VideoProject, status: StudioStatus) =>
    run(`status-${v.id}`, async () => {
      const res = await updateStudioVideo({ data: { id: v.id, version: v.version, patch: { status } } });
      if (!res.ok && !res.conflict) throw new Error(res.error || "Could not change the status.");
      await load();
    });

  const duplicate = (v: VideoProject) =>
    run(`dup-${v.id}`, async () => {
      const res = await duplicateStudioVideo({ data: { id: v.id } });
      if (!res.ok || !res.id) throw new Error(res.error || "Could not duplicate.");
      navigate(studioLink(res.id));
    });

  const remove = (v: VideoProject) => {
    if (!confirm(`Delete "${v.title}" from the library? Its takes go with it.`)) return;
    void run(`del-${v.id}`, async () => {
      const res = await deleteStudioVideo({ data: { id: v.id } });
      if (!res.ok) throw new Error(res.error || "Could not delete.");
      await load();
    });
  };

  const guildCount = rows?.filter((r) => r.recruiting).length ?? 0;

  return (
    <div className="space-y-4" data-video-library>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-fantasy text-[#c08020] text-lg">🎬 Video Library</h2>
          <p className="text-[#606080] text-xs font-fantasy">
            {rows === null ? "Opening the library..." : rows.length === 0 ? "Nothing recorded yet. Press Record this in any forge, or start a new video here." : `${rows.length} video${rows.length === 1 ? "" : "s"}${guildCount ? ` · ${guildCount} on the Guild shelf` : ""}`}
          </p>
        </div>
        <button type="button" onClick={newVideo} disabled={busy === "new"} className={btnPrimary} data-studio-new>
          {busy === "new" ? "Starting..." : "🎤 New video"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2" data-library-filters>
        <input value={filter.q ?? ""} onChange={(e) => setFilter((f) => ({ ...f, q: e.target.value }))} placeholder="Search titles and scripts..." className={`${input} flex-1 min-w-[12rem]`} data-library-search />
        <select value={filter.shelf} onChange={(e) => setFilter((f) => ({ ...f, shelf: e.target.value as LibraryFilter["shelf"] }))} className={input} aria-label="Shelf" data-library-shelf>
          <option value="all">Both shelves</option>
          <option value="dm">Financial DM</option>
          <option value="guild">Guild recruiting</option>
        </select>
        <select value={filter.status} onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value as StudioStatus | "all" }))} className={input} aria-label="Status" data-library-status>
          <option value="all">Any status</option>
          {(Object.keys(STUDIO_STATUSES) as StudioStatus[]).map((s) => (
            <option key={s} value={s}>{STUDIO_STATUSES[s].label}</option>
          ))}
        </select>
        <select value={filter.source} onChange={(e) => setFilter((f) => ({ ...f, source: e.target.value as StudioSource | "all" }))} className={input} aria-label="Source" data-library-source>
          <option value="all">Any source</option>
          {(Object.keys(STUDIO_SOURCES) as StudioSource[]).map((s) => (
            <option key={s} value={s}>{STUDIO_SOURCES[s].label}</option>
          ))}
        </select>
        {topics.length > 0 && (
          <select value={filter.topic ?? ""} onChange={(e) => setFilter((f) => ({ ...f, topic: e.target.value }))} className={input} aria-label="Topic" data-library-topic>
            <option value="">Any topic</option>
            {topics.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        )}
      </div>

      {error && <p className="text-red-300 text-sm font-fantasy" data-library-error>{error}</p>}

      {rows && rows.length > 0 && shown.length === 0 && <p className="text-[#606080] font-fantasy text-sm py-6 text-center">No videos match those filters.</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {shown.map((v) => {
          const src = STUDIO_SOURCES[v.source];
          const words = scriptText(v.script);
          return (
            <article key={v.id} className={`${card} overflow-hidden flex flex-col`} data-video-card={v.id} data-video-status={v.status} data-video-recruiting={v.recruiting ? "1" : "0"}>
              <Link {...studioLink(v.id)} className="block relative aspect-[9/16] max-h-56 bg-[#0d1520] overflow-hidden" aria-label={`Open ${v.title}`}>
                {v.thumbnailUrl ? (
                  <img src={v.thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <span className="absolute inset-0 grid place-items-center text-5xl opacity-60" aria-hidden="true">{src.icon}</span>
                )}
                <span className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[11px] font-fantasy ${v.status === "posted" ? "bg-[#2e7d4f] text-white" : v.status === "ready" ? "bg-[#c08020] text-[#0d1520]" : "bg-[#204060] text-[#e0e0e0]"}`}>{STUDIO_STATUSES[v.status].label}</span>
                {v.recruiting && <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-[#2e7d4f]/80 text-white text-[11px] font-fantasy">🛡️ Guild</span>}
                {v.durationSec ? <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/60 text-white text-[11px] tabular-nums">{fmtLength(v.durationSec)}</span> : null}
              </Link>
              <div className="p-3 space-y-2 flex-1 flex flex-col">
                <Link {...studioLink(v.id)} className="text-[#e8c884] font-fantasy leading-snug hover:underline" data-video-title>{v.title}</Link>
                <p className="text-[#606080] text-[11px] font-fantasy">
                  {src.icon} {src.label}
                  {v.topic ? ` · ${v.topic}` : ""} · {fmtDate(v.updatedAt)}
                </p>
                {words && <p className="text-[#a0a0a0] text-xs font-fantasy line-clamp-2">{words}</p>}
                <div className="mt-auto flex flex-wrap gap-2 pt-1">
                  <Link {...studioLink(v.id)} className={btnGhost} data-video-open>✏️ Open</Link>
                  <button type="button" onClick={() => duplicate(v)} disabled={busy === `dup-${v.id}`} className={btnGhost} data-video-duplicate>⧉ Duplicate</button>
                  {v.status !== "posted" ? (
                    <button type="button" onClick={() => setStatus(v, "posted")} disabled={busy === `status-${v.id}`} className={btnGhost} data-video-mark-posted>✅ Mark posted</button>
                  ) : (
                    <button type="button" onClick={() => setStatus(v, "ready")} disabled={busy === `status-${v.id}`} className={btnGhost} data-video-unpost>↩ Not posted yet</button>
                  )}
                  <button type="button" onClick={() => remove(v)} disabled={busy === `del-${v.id}`} className="ml-auto text-red-400/70 hover:text-red-400 text-xs font-fantasy" aria-label="Delete video" data-video-delete>🗑️</button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
