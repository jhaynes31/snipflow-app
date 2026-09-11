import { useCallback, useRef, useState } from "react";
import { put } from "@vercel/blob/client";
import { deleteClip, getClipUploadToken, saveClip, updateClip } from "~/server/clips";
import { type ClipSummary, formatCue } from "~/lib/brollUtils";

/**
 * John's b roll clip library: upload a video (straight to Vercel Blob) or
 * add a link, name and tag it, and it is available to every shot list.
 */
export default function ClipLibrary({
  clips,
  uploadsEnabled,
  onChange,
  defaultOpen = false,
}: {
  clips: ClipSummary[];
  uploadsEnabled: boolean;
  onChange: (clips: ClipSummary[]) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [mode, setMode] = useState<"upload" | "link" | "bulk">(uploadsEnabled ? "upload" : "link");
  const [bulk, setBulk] = useState("");
  const [bulkReport, setBulkReport] = useState("");
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTags, setEditTags] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const parseTags = (raw: string) => raw.split(/[,\n]/).map((t) => t.trim().toLowerCase()).filter(Boolean);

  const resetForm = () => {
    setName("");
    setTags("");
    setDescription("");
    setLink("");
    setFile(null);
    setProgress(null);
    if (fileInput.current) fileInput.current.value = "";
  };

  const onPickFile = (f: File | null) => {
    setFile(f);
    if (f && !name) setName(f.name.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " "));
  };

  const handleAdd = useCallback(async () => {
    setError("");
    if (!name.trim()) {
      setError("Give the clip a name John will recognize, like \"kitchen paycheck envelope\".");
      return;
    }
    setBusy(true);
    try {
      if (mode === "link") {
        const res = await saveClip({ data: { name, tags: parseTags(tags), description, url: link.trim(), kind: "link" } });
        if (!res.ok || !res.clip) {
          setError(res.error || "Could not save the clip.");
          return;
        }
        onChange([res.clip, ...clips]);
        resetForm();
        return;
      }
      if (!file) {
        setError("Choose a video file first.");
        return;
      }
      const meta = await readVideoMeta(file).catch(() => ({ durationSec: undefined, poster: null as Blob | null }));
      const tok = await getClipUploadToken({ data: { filename: file.name, contentType: file.type || "video/mp4", size: file.size } });
      if (!tok.ok || !tok.token || !tok.pathname) {
        setError(tok.error || "Could not start the upload.");
        return;
      }
      setProgress(0);
      const uploaded = await put(tok.pathname, file, {
        access: "public",
        token: tok.token,
        contentType: file.type || "video/mp4",
        multipart: file.size > 8 * 1024 * 1024,
        onUploadProgress: (p) => setProgress(Math.round(p.percentage)),
      });
      let posterUrl: string | undefined;
      let posterPathname: string | undefined;
      if (meta.poster) {
        const ptok = await getClipUploadToken({ data: { filename: file.name.replace(/\.[a-z0-9]+$/i, "") + "-poster.jpg", contentType: "image/jpeg", size: meta.poster.size } });
        if (ptok.ok && ptok.token && ptok.pathname) {
          const p = await put(ptok.pathname, meta.poster, { access: "public", token: ptok.token, contentType: "image/jpeg" }).catch(() => null);
          if (p) {
            posterUrl = p.url;
            posterPathname = p.pathname;
          }
        }
      }
      const res = await saveClip({
        data: {
          name,
          tags: parseTags(tags),
          description,
          url: uploaded.url,
          pathname: uploaded.pathname,
          posterUrl,
          posterPathname,
          contentType: file.type || "video/mp4",
          sizeBytes: file.size,
          durationSec: meta.durationSec,
          kind: "upload",
        },
      });
      if (!res.ok || !res.clip) {
        setError(res.error || "Uploaded, but could not save the clip details.");
        return;
      }
      onChange([res.clip, ...clips]);
      resetForm();
    } catch (e) {
      setError("Upload failed: " + String(e));
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }, [mode, name, tags, description, link, file, clips, onChange]);

  const handleBulk = useCallback(async () => {
    setError("");
    setBulkReport("");
    const lines = bulk.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return;
    setBusy(true);
    const added: ClipSummary[] = [];
    const problems: string[] = [];
    try {
      for (const line of lines) {
        const parts = line.split("|").map((p) => p.trim());
        let [n, u, t] = parts;
        // Allow "link" alone or "link | name" too.
        if (n && /^https?:\/\//i.test(n)) {
          [n, u] = [u || n.split("/").pop() || "clip", n];
        }
        if (!u || !/^https?:\/\//i.test(u)) {
          problems.push(`Skipped (no link): ${line.slice(0, 60)}`);
          continue;
        }
        const res = await saveClip({ data: { name: n || "clip", url: u, tags: parseTags(t || ""), description: "", kind: "link" } });
        if (res.ok && res.clip) added.push(res.clip);
        else problems.push(`Could not add: ${(n || u).slice(0, 60)}`);
      }
      if (added.length) onChange([...added.reverse(), ...clips]);
      setBulkReport(`Added ${added.length} clip${added.length === 1 ? "" : "s"}.${problems.length ? "\n" + problems.join("\n") : ""}`);
      if (!problems.length) setBulk("");
    } finally {
      setBusy(false);
    }
  }, [bulk, clips, onChange]);

  const handleSaveTags = async (clip: ClipSummary) => {
    const next = parseTags(editTags);
    const res = await updateClip({ data: { id: clip.id, tags: next } });
    if (res.ok) onChange(clips.map((c) => (c.id === clip.id ? { ...c, tags: next } : c)));
    else setError(res.error || "Could not save the tags.");
    setEditingId(null);
  };

  const handleDelete = async (clip: ClipSummary) => {
    if (!confirm(`Remove "${clip.name}" from the library?`)) return;
    setDeletingId(clip.id);
    try {
      const res = await deleteClip({ data: { id: clip.id } });
      if (res.ok) onChange(clips.filter((c) => c.id !== clip.id));
      else setError(res.error || "Could not remove the clip.");
    } finally {
      setDeletingId(null);
    }
  };

  const inputClass =
    "w-full bg-[#0d1520] border border-[#406080]/40 rounded-lg px-3 py-2 text-[#e0e0e0] font-fantasy text-sm focus:border-[#c08020] focus:outline-none";

  return (
    <section className="rounded-xl border border-[#406080]/30 bg-[#111a28] p-5 space-y-4">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="w-full flex items-center justify-between gap-2 text-left">
        <h2 className="font-fantasy text-[#c08020] text-lg">📁 Your Clip Library ({clips.length})</h2>
        <span className="text-[#a0a0a0] text-xs font-fantasy">{open ? "Hide ▲" : "Show ▼"}</span>
      </button>
      <p className="text-[#a0a0a0] text-sm font-fantasy">
        Footage John already has. Every shot list can point at these clips, and the
        planner reaches for them before suggesting stock.
      </p>

      {open && (
        <>
          {/* Add a clip */}
          <div className="p-4 rounded-lg border border-[#406080]/30 bg-[#0d1520]/60 space-y-3">
            <div className="flex gap-2">
              {(["upload", "link", "bulk"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  aria-pressed={mode === m}
                  className={`px-3 py-1.5 rounded-lg border font-fantasy text-xs transition-all ${
                    mode === m ? "bg-[#c08020]/20 border-[#c08020]/50 text-[#c08020]" : "bg-[#111a28] border-[#406080]/40 text-[#a0a0a0] hover:border-[#c08020]/50"
                  }`}
                >
                  {m === "upload" ? "⬆️ Upload a video" : m === "link" ? "🔗 Add a link" : "📋 Paste many links"}
                </button>
              ))}
            </div>
            {mode === "upload" && !uploadsEnabled && (
              <p className="text-amber-300/90 text-xs font-fantasy">
                Uploads switch on once a Blob store is connected to the Vercel project (Storage tab, Create, Blob). Until then, add clips as links.
              </p>
            )}
            {mode === "bulk" ? (
              <div className="space-y-2">
                <p className="text-[#a0a0a0] text-xs font-fantasy">
                  One clip per line: <span className="text-[#e0e0e0]">name | link | tags</span>. Tags are optional. Google Drive share links work; set the file to "Anyone with the link".
                </p>
                <textarea
                  value={bulk}
                  onChange={(e) => setBulk(e.target.value)}
                  rows={6}
                  placeholder={"Kitchen paycheck envelope | https://drive.google.com/file/d/... | paycheck, kitchen\nTavern corner wide shot | https://drive.google.com/file/d/... | tavern, john"}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={handleBulk}
                  disabled={busy || !bulk.trim()}
                  className="px-5 py-2.5 rounded-lg bg-[#c08020] text-[#0d1520] font-bold font-fantasy text-sm hover:bg-[#e0b45a] transition-all disabled:opacity-50"
                >
                  {busy ? "Adding..." : "➕ Add all to Library"}
                </button>
                {bulkReport && <p className="text-[#a0a0a0] text-xs font-fantasy whitespace-pre-wrap">{bulkReport}</p>}
              </div>
            ) : mode === "upload" ? (
              <input
                ref={fileInput}
                type="file"
                accept="video/mp4,video/quicktime,video/webm,video/x-m4v"
                onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                disabled={!uploadsEnabled || busy}
                className="block w-full text-[#a0a0a0] text-xs font-fantasy file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-[#c08020] file:text-[#0d1520] file:font-fantasy file:text-xs disabled:opacity-50"
              />
            ) : (
              <input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://... (Drive, Dropbox, YouTube, or any video link)" className={inputClass} />
            )}
            {mode !== "bulk" && (<>
            <div className="grid gap-3 sm:grid-cols-2">
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name, e.g. kitchen paycheck envelope" className={inputClass} />
              <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags, comma separated: paycheck, kitchen, money" className={inputClass} />
            </div>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What happens in the clip (helps the planner match it)" className={inputClass} />
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={handleAdd}
                disabled={busy || (mode === "upload" && !uploadsEnabled)}
                className="px-5 py-2.5 rounded-lg bg-[#c08020] text-[#0d1520] font-bold font-fantasy text-sm hover:bg-[#e0b45a] transition-all disabled:opacity-50"
              >
                {busy ? (progress !== null ? `Uploading ${progress}%` : "Saving...") : mode === "upload" ? "⬆️ Upload to Library" : "➕ Add to Library"}
              </button>
              {progress !== null && (
                <div className="flex-1 min-w-[8rem] h-2 rounded bg-[#204060]/40 overflow-hidden">
                  <div className="h-full bg-[#c08020] transition-all" style={{ width: `${progress}%` }} />
                </div>
              )}
            </div>
            </>)}
            {error && <p className="text-red-300 text-xs font-fantasy">{error}</p>}
          </div>

          {/* The clips */}
          {clips.length === 0 ? (
            <p className="text-center text-[#606080] text-sm font-fantasy py-2">No clips yet. Add the footage John shoots most, like his tavern corner, a paycheck, or a bank app.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {clips.map((c) => (
                <li key={c.id} className="rounded-lg border border-[#406080]/30 bg-[#0d1520]/60 overflow-hidden" data-clip-id={c.id}>
                  {c.kind === "upload" ? (
                    <video src={c.url} poster={c.posterUrl} controls preload="metadata" className="w-full aspect-video bg-black object-cover" />
                  ) : (
                    <a href={c.url} target="_blank" rel="noreferrer" className="block w-full aspect-video bg-[#204060]/30 flex items-center justify-center text-3xl" title="Open link">
                      🔗
                    </a>
                  )}
                  <div className="p-3 space-y-1">
                    <p className="text-[#e0e0e0] font-fantasy text-sm truncate" title={c.name}>
                      {c.name}
                      {c.durationSec ? <span className="text-[#606080] text-xs"> · {formatCue(c.durationSec)}</span> : null}
                    </p>
                    {editingId === c.id ? (
                      <div className="flex gap-1">
                        <input type="text" value={editTags} onChange={(e) => setEditTags(e.target.value)} className={inputClass} placeholder="tags, comma separated" />
                        <button type="button" onClick={() => handleSaveTags(c)} className="px-2 rounded bg-[#c08020]/20 border border-[#c08020]/50 text-[#c08020] text-xs font-fantasy">Save</button>
                      </div>
                    ) : (
                      <p className="text-[#a0a0a0] text-xs font-fantasy truncate">{c.tags.length ? c.tags.map((t) => `#${t}`).join(" ") : "no tags yet"}</p>
                    )}
                    {c.description && <p className="text-[#606080] text-xs font-fantasy line-clamp-2">{c.description}</p>}
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(c.id);
                          setEditTags(c.tags.join(", "));
                        }}
                        className="text-[#a0a0a0] hover:text-[#c08020] text-xs font-fantasy"
                      >
                        ✏️ Tags
                      </button>
                      <button type="button" onClick={() => handleDelete(c)} disabled={deletingId === c.id} className="text-[#a0a0a0] hover:text-red-300 text-xs font-fantasy disabled:opacity-50">
                        🗑️ Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

/** Read the duration and grab a poster frame from a local video file before upload. */
function readVideoMeta(file: File): Promise<{ durationSec?: number; poster: Blob | null }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    const done = (poster: Blob | null) => {
      const d = Number.isFinite(video.duration) ? video.duration : undefined;
      URL.revokeObjectURL(url);
      resolve({ durationSec: d, poster });
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unreadable video"));
    };
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1, (video.duration || 2) / 2);
    };
    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 480 / (video.videoWidth || 480));
        canvas.width = Math.round((video.videoWidth || 480) * scale);
        canvas.height = Math.round((video.videoHeight || 270) * scale);
        canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((b) => done(b), "image/jpeg", 0.8);
      } catch {
        done(null);
      }
    };
    video.src = url;
  });
}
