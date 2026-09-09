import { useState, useEffect, useCallback } from "react";
import {
  initScriptsTable,
  getSavedScripts,
  deleteScript,
  HOOK_TYPE_LABELS,
  type SavedScript,
} from "~/server/scriptGenerator";
import { buildScriptText, downloadScript, slugify } from "~/lib/scriptUtils";

export default function SavedScripts() {
  const [scripts, setScripts] = useState<SavedScript[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [downloadedId, setDownloadedId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const fetchScripts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await initScriptsTable();
      const data = await getSavedScripts();
      setScripts(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScripts();
  }, [fetchScripts]);

  const handleCopy = (s: SavedScript) => {
    const text = buildScriptText({
      title: s.title,
      topic: s.topic,
      tone: s.tone,
      dndThemed: s.dndThemed,
      hookType: s.hookType,
      targetViewer: s.targetViewer,
      hook: s.hook,
      script: s.script,
      callToAction: s.callToAction,
      caption: s.caption,
      hashtags: s.hashtags || [],
    });
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(s.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleDownload = (s: SavedScript) => {
    const text = buildScriptText({
      title: s.title,
      topic: s.topic,
      tone: s.tone,
      dndThemed: s.dndThemed,
      hookType: s.hookType,
      targetViewer: s.targetViewer,
      hook: s.hook,
      script: s.script,
      callToAction: s.callToAction,
      caption: s.caption,
      hashtags: s.hashtags || [],
    });
    downloadScript(`script-${slugify(s.title)}.txt`, text);
    setDownloadedId(s.id);
    setTimeout(() => setDownloadedId(null), 2000);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Banish this script from the archives?")) return;
    setDeletingId(id);
    try {
      const res = await deleteScript({ data: { id } });
      if (res.ok) {
        setScripts((prev) => prev.filter((s) => s.id !== id));
      } else {
        setError(res.error || "Could not delete the script.");
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const filtered = search
    ? scripts.filter(
        (s) =>
          s.title.toLowerCase().includes(search.toLowerCase()) ||
          s.topic.toLowerCase().includes(search.toLowerCase()),
      )
    : scripts;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center justify-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search titles or topics..."
          className="px-3 py-2 rounded-lg bg-[#111a28] border border-[#406080]/40 text-[#e0e0e0] placeholder-[#606080] text-xs font-fantasy focus:outline-none focus:border-[#c08020]/50 min-w-[220px]"
        />
        <button
          onClick={fetchScripts}
          disabled={loading}
          className="px-3 py-2 rounded-lg border border-[#406080]/40 text-[#a0a0a0] hover:text-[#e0e0e0] hover:bg-[#204060]/20 transition-all text-xs font-fantasy disabled:opacity-50"
        >
          🔄 Refresh
        </button>
      </div>

      <p className="text-center text-[#606080] text-xs font-fantasy">
        {filtered.length} script{filtered.length !== 1 ? "s" : ""} in the
        archive
      </p>

      {error && (
        <div className="text-center p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-300 text-sm font-fantasy">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center gap-3 py-12">
          <div className="w-10 h-10 border-3 border-[#c08020] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#a0a0a0] font-fantasy text-sm">
            Consulting the archives...
          </p>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-[#606080] font-fantasy text-lg">
            {scripts.length === 0
              ? "Nothing saved yet. Forge a posting package and save the best!"
              : "No saved items match your search."}
          </p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="space-y-4">
          {filtered.map((s) => {
            const isExpanded = expandedId === s.id;
            return (
              <div
                key={s.id}
                className="rounded-xl border border-[#406080]/30 bg-[#111a28] overflow-hidden"
              >
                {/* Header */}
                <div className="px-4 py-3 border-b border-[#406080]/20 bg-[#204060]/10">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <span className="text-[#c08020] font-fantasy text-sm font-bold block truncate">
                        📜 {s.title}
                      </span>
                      <span className="text-[#606080] text-xs font-fantasy">
                        {s.topic}
                        {s.hookType && (
                          <span className="ml-2 px-1.5 py-0.5 rounded bg-[#406080]/20 text-[#a0a0a0] text-xs">
                            🪝 {HOOK_TYPE_LABELS[s.hookType] ?? s.hookType}
                          </span>
                        )}
                        {s.tone && (
                          <span className="ml-2 px-1.5 py-0.5 rounded bg-[#406080]/20 text-[#a0a0a0] text-xs">
                            {s.tone}
                          </span>
                        )}
                        {s.dndThemed && (
                          <span className="ml-2 px-1.5 py-0.5 rounded bg-[#c08020]/15 text-[#c08020] text-xs">
                            🛡️ D&D
                          </span>
                        )}
                      </span>
                    </div>
                    <span className="text-[#606080] text-xs font-fantasy whitespace-nowrap">
                      {formatDate(s.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Expanded script body */}
                {isExpanded && (
                  <div className="px-4 py-4 space-y-4">
                    {s.hook && (
                      <div className="p-4 rounded-lg border border-[#c08020]/30 bg-[#204060]/10">
                        <p className="text-[#c08020] font-bold font-fantasy text-sm mb-1">
                          🪝 Hook
                        </p>
                        <p className="text-[#e0e0e0] leading-relaxed text-sm font-fantasy whitespace-pre-wrap">
                          {s.hook}
                        </p>
                      </div>
                    )}
                    {s.script && (
                      <div className="p-4 rounded-lg border border-[#406080]/30 bg-[#0d1520]/50">
                        <p className="text-[#c08020] font-bold font-fantasy text-sm mb-1">
                          🎬 Script
                        </p>
                        <p className="text-[#e0e0e0] leading-relaxed text-sm font-fantasy whitespace-pre-wrap">
                          {s.script}
                        </p>
                      </div>
                    )}
                    {s.callToAction && (
                      <div className="p-3 rounded-lg border border-[#406080]/30 bg-[#204060]/10">
                        <p className="text-[#c08020] font-bold font-fantasy text-sm mb-1">
                          🎯 Call to Action
                        </p>
                        <p className="text-[#e0e0e0] leading-relaxed text-sm font-fantasy">
                          {s.callToAction}
                        </p>
                      </div>
                    )}
                    {s.caption && (
                      <div className="p-4 rounded-lg border border-[#406080]/30 bg-[#0d1520]/50">
                        <p className="text-[#c08020] font-bold font-fantasy text-sm mb-1">
                          ✍️ Caption
                        </p>
                        <p className="text-[#e0e0e0] leading-relaxed text-sm font-fantasy whitespace-pre-wrap">
                          {s.caption}
                        </p>
                      </div>
                    )}
                    {s.hashtags && s.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {s.hashtags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-block px-2 py-1 rounded-md bg-[#c08020]/10 border border-[#c08020]/30 text-[#c08020] text-sm font-fantasy"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="px-4 py-3 border-t border-[#406080]/20 bg-[#0d1520]/50 flex gap-2 flex-wrap">
                  <button
                    onClick={() =>
                      setExpandedId((prev) => (prev === s.id ? null : s.id))
                    }
                    className="flex-1 px-2 py-2 rounded-lg border text-xs font-fantasy transition-colors bg-[#204060]/30 border-[#406080]/30 text-[#e0e0e0] hover:bg-[#204060]/50"
                  >
                    {isExpanded ? "🙈 Hide" : "👁️ View"}
                  </button>
                  <button
                    onClick={() => handleCopy(s)}
                    className="flex-1 px-2 py-2 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#204060]/50 text-xs font-fantasy transition-colors"
                  >
                    {copiedId === s.id ? "✅ Copied" : "📋 Copy"}
                  </button>
                  <button
                    onClick={() => handleDownload(s)}
                    className="px-2 py-2 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#204060]/50 text-xs font-fantasy transition-colors"
                  >
                    {downloadedId === s.id ? "✅ Downloaded!" : "📥 Download"}
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    disabled={deletingId === s.id}
                    className="px-2 py-2 rounded-lg bg-red-900/10 border border-red-700/20 text-red-400/60 hover:text-red-400 text-xs font-fantasy transition-colors disabled:opacity-30"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
