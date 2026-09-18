import { useCallback, useEffect, useState } from "react";
import RecordThisButton from "~/components/studio/RecordThisButton";
import { stripLeadingHook } from "~/server/scriptGenerator";
import {
  deleteBroll,
  getSavedBroll,
  initBrollTable,
  updateBrollShots,
  type SavedBrollPlan,
} from "~/server/brollGenerator";
import { BROLL_STYLE_META, type BrollShot, type ClipSummary, buildBrollText, downloadBrollText, formatCue } from "~/lib/brollUtils";
import { getClips } from "~/server/clips";
import { slugify } from "~/lib/scriptUtils";
import BrollShotList from "~/components/generator/BrollShotList";

/** Library of saved shot lists. Expand one to edit, copy, download, or delete. */
export default function SavedBroll() {
  const [plans, setPlans] = useState<SavedBrollPlan[]>([]);
  const [clips, setClips] = useState<ClipSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, BrollShot[]>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [downloadedId, setDownloadedId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await initBrollTable();
      const [plans, lib] = await Promise.all([getSavedBroll(), getClips().catch(() => ({ clips: [] as ClipSummary[] }))]);
      setPlans(plans);
      setClips(lib.clips);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const shotsFor = (p: SavedBrollPlan) => drafts[p.id] ?? p.shots;
  const dirty = (p: SavedBrollPlan) => drafts[p.id] !== undefined && drafts[p.id] !== p.shots;

  const handleSaveEdits = async (p: SavedBrollPlan) => {
    const shots = shotsFor(p);
    setSavingId(p.id);
    setError("");
    try {
      const res = await updateBrollShots({ data: { id: p.id, shots } });
      if (!res.ok) {
        setError(res.error || "Could not save the edits.");
        return;
      }
      setPlans((prev) => prev.map((x) => (x.id === p.id ? { ...x, shots } : x)));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[p.id];
        return next;
      });
      setSavedId(p.id);
      setTimeout(() => setSavedId(null), 2000);
    } catch (e) {
      setError(String(e));
    } finally {
      setSavingId(null);
    }
  };

  const handleCopy = (p: SavedBrollPlan) => {
    navigator.clipboard.writeText(buildBrollText({ ...p, shots: shotsFor(p) })).then(() => {
      setCopiedId(p.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleDownload = (p: SavedBrollPlan) => {
    downloadBrollText(`broll-${slugify(p.title || "shot-list")}.txt`, buildBrollText({ ...p, shots: shotsFor(p) }));
    setDownloadedId(p.id);
    setTimeout(() => setDownloadedId(null), 2000);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Banish this shot list from the archives?")) return;
    setDeletingId(id);
    try {
      const res = await deleteBroll({ data: { id } });
      if (res.ok) setPlans((prev) => prev.filter((p) => p.id !== id));
      else setError(res.error || "Could not delete the shot list.");
    } catch (e) {
      setError(String(e));
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const q = search.toLowerCase();
  const filtered = q
    ? plans.filter((p) => p.title.toLowerCase().includes(q) || p.topic.toLowerCase().includes(q))
    : plans;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center justify-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title or topic"
          className="bg-[#111a28] border border-[#406080]/40 rounded-lg px-4 py-2 text-[#e0e0e0] font-fantasy text-sm focus:border-[#c08020] focus:outline-none w-full sm:w-72"
        />
        <button
          type="button"
          onClick={fetchPlans}
          className="px-4 py-2 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#204060]/50 transition-all text-sm font-fantasy"
        >
          🔄 Refresh
        </button>
      </div>

      {error && (
        <div className="text-center p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-300 text-sm font-fantasy">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-center text-[#a0a0a0] font-fantasy py-8">Opening the archives...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-[#606080] font-fantasy py-8">
          {plans.length === 0
            ? "No shot lists saved yet. Forge a script, then plan its b roll in Step 5."
            : "Nothing matches that search."}
        </p>
      ) : (
        <>
          <p className="text-center text-[#606080] text-xs font-fantasy">
            {filtered.length} shot list{filtered.length === 1 ? "" : "s"} in the archive
          </p>
          <div className="space-y-3">
            {filtered.map((p) => {
              const open = expandedId === p.id;
              return (
                <div key={p.id} className="rounded-xl border border-[#406080]/30 bg-[#111a28] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedId(open ? null : p.id)}
                    aria-expanded={open}
                    className="w-full text-left p-4 hover:bg-[#204060]/20 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <p className="font-fantasy text-[#e0e0e0] text-base">🎬 {p.title || "Untitled"}</p>
                        <p className="text-[#a0a0a0] text-xs font-fantasy mt-1">
                          🏷️ {p.topic}
                          {p.painPoint ? ` · 🎯 ${p.painPoint}` : ""} · Tone: {p.tone} · {BROLL_STYLE_META[p.style].label}
                        </p>
                      </div>
                      <p className="text-[#606080] text-xs font-fantasy shrink-0">
                        {p.shots.length} shots · about {formatCue(p.totalSeconds)} · {formatDate(p.createdAt)}
                      </p>
                    </div>
                  </button>

                  {open && (
                    <div className="px-4 pb-4 space-y-4 border-t border-[#406080]/20 pt-4">
                      <div className="p-3 rounded-lg border border-[#406080]/30 bg-[#0d1520]/60">
                        <p className="text-[#c08020] font-bold font-fantasy text-xs mb-1">📜 Script this plan follows</p>
                        <p className="text-[#a0a0a0] text-sm font-fantasy whitespace-pre-wrap leading-relaxed">
                          {p.script}
                          {p.callToAction ? `\n\n${p.callToAction}` : ""}
                        </p>
                      </div>

                      <BrollShotList
                        shots={shotsFor(p)}
                        clips={clips}
                        onClipSaved={(c) => setClips((prev) => [c, ...prev])}
                        onChange={(shots) => setDrafts((prev) => ({ ...prev, [p.id]: shots }))}
                      />

                      <div className="flex flex-wrap gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => handleSaveEdits(p)}
                          disabled={savingId === p.id || !dirty(p)}
                          className="px-4 py-2 rounded-lg bg-[#c08020]/20 border border-[#c08020]/50 text-[#c08020] hover:bg-[#c08020]/30 transition-all text-sm font-fantasy disabled:opacity-40"
                        >
                          {savingId === p.id ? "💾 Saving..." : savedId === p.id ? "✅ Saved!" : "💾 Save Edits"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(p)}
                          className="px-4 py-2 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#204060]/50 transition-all text-sm font-fantasy"
                        >
                          {copiedId === p.id ? "✅ Copied!" : "📋 Copy"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownload(p)}
                          className="px-4 py-2 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#204060]/50 transition-all text-sm font-fantasy"
                        >
                          {downloadedId === p.id ? "✅ Downloaded!" : "⬇️ Download"}
                        </button>
                        <RecordThisButton
                          handoff={() => ({ source: "broll", recruiting: false, title: p.title, topic: p.topic, painPoint: p.painPoint, tone: p.tone, script: { hook: p.hook, body: stripLeadingHook(p.script, p.hook), cta: p.callToAction }, scriptId: p.scriptId ?? null, brollId: p.id, shots: shotsFor(p) })}
                          onError={setError}
                        />
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id)}
                          disabled={deletingId === p.id}
                          className="px-4 py-2 rounded-lg bg-red-900/20 border border-red-700/30 text-red-300 hover:bg-red-900/40 transition-all text-sm font-fantasy disabled:opacity-50"
                        >
                          {deletingId === p.id ? "Banishing..." : "🗑️ Delete"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
