import { useState, useEffect, useCallback, useRef } from "react";
import {
  getSavedConcepts,
  updateConcept,
  deleteConcept,
  fetchMemeTemplates,
  type SavedMemeConcept,
  type MemeTemplate,
  initMemesTable,
} from "~/server/memeGenerator";
import MemePreview from "~/components/MemePreview";
import type { TextBox } from "~/components/MemePreview";
import { downloadElementPng } from "~/lib/exportPng";

const PLATFORMS = ["", "TikTok", "Instagram", "Facebook", "LinkedIn"];

/** Sanitize a template name into a safe filename slug */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Parse text_boxes JSON into TextBox array, or build from legacy top/bottom text */
function parseTextBoxes(
  raw: string | null | undefined,
  topText: string,
  bottomText: string,
): TextBox[] {
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as TextBox[];
      }
    } catch {
      // fall through to legacy
    }
  }
  // Legacy fallback: build from top_text / bottom_text
  const boxes: TextBox[] = [];
  if (topText) {
    boxes.push({
      id: crypto.randomUUID(),
      text: topText,
      x: 50,
      y: 8,
      showBackground: true,
    });
  }
  if (bottomText) {
    boxes.push({
      id: crypto.randomUUID(),
      text: bottomText,
      x: 50,
      y: 85,
      showBackground: true,
    });
  }
  return boxes;
}

export default function SavedConcepts() {
  const [concepts, setConcepts] = useState<SavedMemeConcept[]>([]);
  const [templates, setTemplates] = useState<MemeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const categories = Array.from(new Set(concepts.map((c) => c.category).filter(Boolean))).sort();
  const [filterPlatform, setFilterPlatform] = useState("");
  const [filterUsed, setFilterUsed] = useState<"" | "used" | "unused">("");
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [downloadedId, setDownloadedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  // Per-concept textBoxes state for editing
  const [editingBoxes, setEditingBoxes] = useState<Record<number, TextBox[]>>({});

  // Refs for meme preview containers (captured by html-to-image for PNG export)
  const memePreviewRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());

  const fetchConcepts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await initMemesTable();
      const [data, tmpls] = await Promise.all([
        getSavedConcepts(),
        fetchMemeTemplates(),
      ]);
      setConcepts(data);
      setTemplates(tmpls);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConcepts();
  }, [fetchConcepts]);

  const handleMarkUsed = async (id: number, platform: string) => {
    setUpdatingId(id);
    try {
      const result = await updateConcept({
        data: { id, updates: { is_used: true, platform } },
      });
      if (result.ok) {
        setConcepts((prev) =>
          prev.map((c) =>
            c.id === id ? { ...c, is_used: true, platform } : c,
          ),
        );
      }
    } catch {
      // ignore
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleFavorite = async (concept: SavedMemeConcept) => {
    setUpdatingId(concept.id);
    try {
      const result = await updateConcept({
        data: {
          id: concept.id,
          updates: { is_favorite: !concept.is_favorite },
        },
      });
      if (result.ok) {
        setConcepts((prev) =>
          prev.map((c) =>
            c.id === concept.id
              ? { ...c, is_favorite: !concept.is_favorite }
              : c,
          ),
        );
      }
    } catch {
      // ignore
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Banish this meme from the archives?")) return;
    setUpdatingId(id);
    try {
      const result = await deleteConcept({ data: { id } });
      if (result.ok) {
        setConcepts((prev) => prev.filter((c) => c.id !== id));
      }
    } catch {
      // ignore
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStartEdit = (concept: SavedMemeConcept) => {
    const boxes = parseTextBoxes(
      (concept as any).text_boxes,
      concept.top_text,
      concept.bottom_text,
    );
    setEditingBoxes((prev) => ({ ...prev, [concept.id]: boxes }));
    setEditingId(concept.id);
  };

  const handleFinishEdit = async (id: number) => {
    setUpdatingId(id);
    const boxes = editingBoxes[id] || [];
    try {
      // Derive legacy text for backward compat
      const topBox = boxes.find((b) => b.showBackground && b.y < 50);
      const bottomBox = boxes.find((b) => b.showBackground && b.y >= 50);
      const result = await updateConcept({
        data: {
          id,
          updates: {
            top_text: topBox?.text || "",
            bottom_text: bottomBox?.text || "",
            text_boxes: boxes.length > 0 ? JSON.stringify(boxes) : null,
          },
        },
      });
      if (result.ok) {
        setConcepts((prev) =>
          prev.map((c) =>
            c.id === id
              ? {
                  ...c,
                  top_text: topBox?.text || "",
                  bottom_text: bottomBox?.text || "",
                  text_boxes: boxes.length > 0 ? JSON.stringify(boxes) : null,
                }
              : c,
          ),
        );
      }
    } catch {
      // ignore
    } finally {
      setUpdatingId(null);
      setEditingId(null);
      setEditingBoxes((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleTextBoxesChange = useCallback(
    (id: number, boxes: TextBox[]) => {
      setEditingBoxes((prev) => ({ ...prev, [id]: boxes }));
    },
    [],
  );

  const handleCopyCaption = (caption: string, id: number) => {
    navigator.clipboard.writeText(caption).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleDownload = useCallback(
    async (id: number, templateName: string) => {
      const ref = memePreviewRefs.current.get(id);
      if (!ref) return;

      try {
        await downloadElementPng(ref, slugify(templateName) + "-meme.png");

        setDownloadedId(id);
        setTimeout(() => setDownloadedId(null), 2000);
      } catch (e) {
        setError("Download failed: " + e);
      }
    },
    [],
  );

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

  // Memoized template lookup by name
  const getTemplateImage = useCallback(
    (templateName: string): MemeTemplate | null => {
      if (!templateName || !templates.length) return null;
      const name = templateName.toLowerCase().trim();

      // Direct substring match
      let match = templates.find(
        (t) =>
          t.name.toLowerCase().includes(name) ||
          name.includes(t.name.toLowerCase()),
      );

      // Try individual words
      if (!match) {
        const words = name
          .split(/[\s,]+/)
          .filter((w) => w.length > 3)
          .filter((w) => !["meme", "template", "blank"].includes(w));
        for (const word of words) {
          match = templates.find((t) => t.name.toLowerCase().includes(word));
          if (match) break;
        }
      }

      return match || null;
    },
    [templates],
  );

  // Filtering logic
  const filtered = concepts.filter((c) => {
    if (filterCategory && c.category !== filterCategory) return false;
    if (filterPlatform && c.platform !== filterPlatform) return false;
    if (filterUsed === "used" && !c.is_used) return false;
    if (filterUsed === "unused" && c.is_used) return false;
    if (filterFavorites && !c.is_favorite) return false;
    if (search) {
      const s = search.toLowerCase();
      if (
        !c.fact.toLowerCase().includes(s) &&
        !c.caption.toLowerCase().includes(s)
      )
        return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center justify-center">
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 rounded-lg bg-[#111a28] border border-[#406080]/40 text-[#e0e0e0] text-xs font-fantasy focus:outline-none focus:border-[#c08020]/50"
          style={{ background: "#111a28" }}
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <select
          value={filterPlatform}
          onChange={(e) => setFilterPlatform(e.target.value)}
          className="px-3 py-2 rounded-lg bg-[#111a28] border border-[#406080]/40 text-[#e0e0e0] text-xs font-fantasy focus:outline-none focus:border-[#c08020]/50"
          style={{ background: "#111a28" }}
        >
          <option value="">All Platforms</option>
          {PLATFORMS.filter(Boolean).map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <select
          value={filterUsed}
          onChange={(e) =>
            setFilterUsed(e.target.value as "" | "used" | "unused")
          }
          className="px-3 py-2 rounded-lg bg-[#111a28] border border-[#406080]/40 text-[#e0e0e0] text-xs font-fantasy focus:outline-none focus:border-[#c08020]/50"
          style={{ background: "#111a28" }}
        >
          <option value="">All Status</option>
          <option value="used">Used</option>
          <option value="unused">Unused</option>
        </select>

        <button
          onClick={() => setFilterFavorites(!filterFavorites)}
          className={`px-3 py-2 rounded-lg border text-xs font-fantasy transition-all ${
            filterFavorites
              ? "bg-[#c08020]/20 border-[#c08020]/40 text-[#c08020]"
              : "bg-[#111a28] border-[#406080]/40 text-[#a0a0a0]"
          }`}
        >
          ❤️ Favorites
        </button>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search facts or captions..."
          className="px-3 py-2 rounded-lg bg-[#111a28] border border-[#406080]/40 text-[#e0e0e0] placeholder-[#606080] text-xs font-fantasy focus:outline-none focus:border-[#c08020]/50 min-w-[200px]"
        />

        <button
          onClick={fetchConcepts}
          disabled={loading}
          className="px-3 py-2 rounded-lg border border-[#406080]/40 text-[#a0a0a0] hover:text-[#e0e0e0] hover:bg-[#204060]/20 transition-all text-xs font-fantasy disabled:opacity-50"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Count */}
      <p className="text-center text-[#606080] text-xs font-fantasy">
        {filtered.length} meme{filtered.length !== 1 ? "s" : ""} in the archive
      </p>

      {/* Error */}
      {error && (
        <div className="text-center p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-300 text-sm font-fantasy">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center gap-3 py-12">
          <div className="w-10 h-10 border-3 border-[#c08020] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#a0a0a0] font-fantasy text-sm">
            Consulting the archives...
          </p>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-[#606080] font-fantasy text-lg">
            {concepts.length === 0
              ? "No memes saved yet. Generate some and save the best ones!"
              : "No memes match your filters."}
          </p>
        </div>
      )}

      {/* Grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((concept) => {
            const isEditing = editingId === concept.id;
            const boxes = isEditing
              ? editingBoxes[concept.id] || parseTextBoxes(
                  (concept as any).text_boxes,
                  concept.top_text,
                  concept.bottom_text,
                )
              : parseTextBoxes(
                  (concept as any).text_boxes,
                  concept.top_text,
                  concept.bottom_text,
                );

            return (
              <div
                key={concept.id}
                className="flex flex-col rounded-xl border border-[#406080]/30 bg-[#111a28] overflow-hidden"
              >
                {/* Header */}
                <div className="px-4 py-3 border-b border-[#406080]/20 bg-[#204060]/10 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[#c08020] font-fantasy text-sm font-bold block">
                      🖼️ {concept.template}
                    </span>
                    <span className="text-[#606080] text-xs font-fantasy">
                      {concept.category}
                      {concept.pain_point && (
                        <span className="ml-2 px-1.5 py-0.5 rounded bg-[#406080]/20 text-[#a0a0a0] text-xs">
                          🎯 {concept.pain_point}
                        </span>
                      )}
                      {concept.platform && (
                        <span className="ml-2 px-1.5 py-0.5 rounded bg-[#406080]/20 text-[#a0a0a0] text-xs">
                          {concept.platform}
                        </span>
                      )}
                      {concept.is_used && (
                        <span className="ml-2 px-1.5 py-0.5 rounded bg-green-900/30 text-green-400 text-xs">
                          Used
                        </span>
                      )}
                    </span>
                  </div>
                  <span className="text-[#606080] text-xs font-fantasy whitespace-nowrap">
                    {formatDate(concept.created_at)}
                  </span>
                </div>

                {/* Meme text */}
                <div className="px-4 py-3 space-y-2 flex-1">
                  <MemePreview
                    ref={(el) => {
                      memePreviewRefs.current.set(concept.id, el);
                    }}
                    template={getTemplateImage(concept.template)}
                    topText={concept.top_text}
                    bottomText={concept.bottom_text}
                    textBoxes={boxes}
                    onTextBoxesChange={
                      isEditing
                        ? (newBoxes) => handleTextBoxesChange(concept.id, newBoxes)
                        : undefined
                    }
                    interactive={isEditing}
                    size="sm"
                  />
                  <p className="text-[#a0a0a0] text-xs leading-relaxed pt-1 font-fantasy">
                    {concept.caption}
                  </p>
                  {concept.hashtags && concept.hashtags.length > 0 && (
                    <p className="text-[#c08020]/80 text-[11px] leading-relaxed font-fantasy break-words">
                      {concept.hashtags.join(" ")}
                    </p>
                  )}
                </div>

                {/* Source fact */}
                <div className="px-4 py-2 border-t border-[#406080]/10">
                  <p className="text-[#606080] text-xs italic line-clamp-2">
                    "{concept.fact}"
                  </p>
                </div>

                {/* Actions */}
                <div className="px-4 py-3 border-t border-[#406080]/20 bg-[#0d1520]/50 flex gap-2 flex-wrap">
                  {/* Edit text toggle */}
                  <button
                    onClick={() =>
                      isEditing
                        ? handleFinishEdit(concept.id)
                        : handleStartEdit(concept)
                    }
                    disabled={updatingId === concept.id && !isEditing}
                    className={`flex-1 px-2 py-2 rounded-lg border text-xs font-fantasy transition-colors disabled:opacity-50 ${
                      isEditing
                        ? "bg-[#c08020]/20 border-[#c08020]/50 text-[#c08020]"
                        : "bg-[#204060]/30 border-[#406080]/30 text-[#e0e0e0] hover:bg-[#204060]/50"
                    }`}
                  >
                    {isEditing ? "💾 Done" : "✏️ Edit Text"}
                  </button>
                  <button
                    onClick={() =>
                      handleCopyCaption(
                        [concept.caption, (concept.hashtags || []).join(" ")].filter(Boolean).join("\n\n"),
                        concept.id,
                      )
                    }
                    className="flex-1 px-2 py-2 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#204060]/50 text-xs font-fantasy transition-colors"
                  >
                    {copiedId === concept.id ? "✅ Copied" : "📋 Copy"}
                  </button>
                  <button
                    onClick={() =>
                      handleDownload(concept.id, concept.template)
                    }
                    className="px-2 py-2 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#204060]/50 text-xs font-fantasy transition-colors"
                  >
                    {downloadedId === concept.id
                      ? "✅ Downloaded!"
                      : "📥 Download"}
                  </button>
                  <button
                    onClick={() => handleToggleFavorite(concept)}
                    disabled={updatingId === concept.id}
                    className={`px-2 py-2 rounded-lg border text-xs font-fantasy transition-colors disabled:opacity-50 ${
                      concept.is_favorite
                        ? "bg-[#c08020]/10 border-[#c08020]/30 text-[#c08020]"
                        : "bg-[#204060]/30 border-[#406080]/30 text-[#e0e0e0]"
                    }`}
                  >
                    {concept.is_favorite ? "❤️" : "🤍"}
                  </button>
                  {!concept.is_used && (
                    <div className="relative flex-1">
                      <button
                        onClick={() => {
                          const el = document.getElementById(
                            `platform-picker-${concept.id}`,
                          );
                          if (el) {
                            el.classList.toggle("hidden");
                          }
                        }}
                        className="w-full px-2 py-2 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#406080]/30 text-xs font-fantasy transition-colors"
                      >
                        ✅ Mark Used
                      </button>
                      <div
                        id={`platform-picker-${concept.id}`}
                        className="hidden absolute bottom-full left-0 right-0 mb-1 bg-[#111a28] border border-[#406080]/40 rounded-lg p-2 shadow-xl z-10"
                      >
                        <div className="flex flex-wrap gap-1">
                          {PLATFORMS.filter(Boolean).map((p) => (
                            <button
                              key={p}
                              onClick={() => handleMarkUsed(concept.id, p)}
                              className="flex-1 px-2 py-1 rounded bg-[#204060]/30 hover:bg-[#c08020]/30 text-[#e0e0e0] text-xs font-fantasy transition-colors"
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => handleDelete(concept.id)}
                    disabled={updatingId === concept.id}
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
