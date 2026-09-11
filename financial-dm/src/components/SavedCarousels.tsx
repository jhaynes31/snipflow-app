import { useState, useEffect, useCallback, useRef } from "react";
import {
  initCarouselsTable,
  getSavedCarousels,
  deleteCarousel,
  updateCarouselSlides,
  type SavedCarousel,
} from "~/server/carouselGenerator";
import {
  slugify,
  downloadSlidePng,
  downloadAllSlidesZip,
  downloadCarouselText,
  buildCarouselText,
  buildCarouselCaption,
} from "~/lib/carouselUtils";
import {
  makeElement,
  collectCustomBackgrounds,
  type EditableSlide,
  type SlideElement,
} from "~/lib/slideEditor";
import EditableSlideCard from "~/components/EditableSlideCard";
import SlideEditorPanel, { type SlideLook } from "~/components/SlideEditorPanel";

export default function SavedCarousels() {
  const [carousels, setCarousels] = useState<SavedCarousel[]>([]);
  const [deckById, setDeckById] = useState<Record<number, EditableSlide[]>>({});
  const [dirty, setDirty] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [downloadProgressId, setDownloadProgressId] = useState<{ id: number; done: number; total: number } | null>(null);
  const [downloadingIdx, setDownloadingIdx] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const slideRefs = useRef<Record<number, (HTMLDivElement | null)[]>>({});

  const fetchCarousels = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await initCarouselsTable();
      const data = await getSavedCarousels();
      setCarousels(data);
      const mapping: Record<number, EditableSlide[]> = {};
      data.forEach((c) => {
        mapping[c.id] = c.slides || [];
      });
      setDeckById(mapping);
      setDirty({});
      setEditingKey(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCarousels();
  }, [fetchCarousels]);

  // ── Inline editing helpers ───────────────────────────────────────

  const markDirty = (id: number) => setDirty((d) => ({ ...d, [id]: true }));

  const selectBackground = useCallback(
    (id: number, idx: number, bgId: string, image?: string) => {
      setDeckById((db) => {
        const arr = db[id] || [];
        const next = arr.map((s, i) =>
          i === idx
            ? { ...s, background: bgId, backgroundImage: image ?? undefined, themeBackground: undefined }
            : s,
        );
        return { ...db, [id]: next };
      });
      markDirty(id);
    },
    [],
  );

  const uploadBackground = useCallback(
    (id: number, idx: number, image: string) => {
      const bgId = `custom-${Date.now().toString(36)}${Math.random()
        .toString(36)
        .slice(2, 7)}`;
      selectBackground(id, idx, bgId, image);
    },
    [selectBackground],
  );

  const updateElement = useCallback(
    (id: number, slideIdx: number, elId: string, patch: Partial<SlideElement>) => {
      setDeckById((db) => {
        const arr = db[id] || [];
        const next = arr.map((s, i) =>
          i === slideIdx
            ? {
                ...s,
                elements: s.elements.map((e) =>
                  e.id === elId ? { ...e, ...patch } : e,
                ),
              }
            : s,
        );
        return { ...db, [id]: next };
      });
      markDirty(id);
    },
    [],
  );

  const addCustom = useCallback((id: number, slideIdx: number) => {
    const element = makeElement("custom", "Type something new", "center", "middle");
    setDeckById((db) => {
      const arr = db[id] || [];
      const next = arr.map((s, i) =>
        i === slideIdx ? { ...s, elements: [...s.elements, element] } : s,
      );
      return { ...db, [id]: next };
    });
    markDirty(id);
  }, []);

  const removeElement = useCallback((id: number, slideIdx: number, elId: string) => {
    setDeckById((db) => {
      const arr = db[id] || [];
      const next = arr.map((s, i) =>
        i === slideIdx
          ? { ...s, elements: s.elements.filter((e) => e.id !== elId) }
          : s,
      );
      return { ...db, [id]: next };
    });
    markDirty(id);
  }, []);

  const colorAll = useCallback((id: number, idx: number, color: string | undefined) => {
    setDeckById((db) => {
      const arr = db[id] || [];
      const next = arr.map((s, i) => (i === idx ? { ...s, elements: s.elements.map((e) => ({ ...e, color })) } : s));
      return { ...db, [id]: next };
    });
    markDirty(id);
  }, []);

  const colorAllSlides = useCallback((id: number, color: string | undefined) => {
    setDeckById((db) => {
      const arr = db[id] || [];
      const next = arr.map((s) => ({ ...s, elements: s.elements.map((e) => ({ ...e, color })) }));
      return { ...db, [id]: next };
    });
    markDirty(id);
  }, []);

  /** Copy one slide's whole look (background, scene, border) to every slide of that carousel. */
  const applyLookToAll = useCallback((id: number, look: SlideLook) => {
    setDeckById((db) => {
      const arr = db[id] || [];
      const next = arr.map((s) => ({ ...s, ...look }));
      return { ...db, [id]: next };
    });
    markDirty(id);
  }, []);

  const selectThemeBackground = useCallback(
    (id: number, idx: number, themeId: string | undefined) => {
      setDeckById((db) => {
        const arr = db[id] || [];
        const next = arr.map((s, i) =>
          i === idx ? { ...s, themeBackground: themeId } : s,
        );
        return { ...db, [id]: next };
      });
      markDirty(id);
    },
    [],
  );

  const selectThemeBorder = useCallback(
    (id: number, idx: number, borderId: string | undefined) => {
      setDeckById((db) => {
        const arr = db[id] || [];
        const next = arr.map((s, i) =>
          i === idx ? { ...s, themeBorder: borderId } : s,
        );
        return { ...db, [id]: next };
      });
      markDirty(id);
    },
    [],
  );

  const toggleEdit = useCallback((id: number, idx: number) => {
    setEditingKey((prev) => {
      const key = `${id}:${idx}`;
      const next = prev === key ? null : key;
      if (next) setTimeout(() => slideRefs.current[id]?.[idx]?.scrollIntoView({ block: "start", behavior: "smooth" }), 0);
      return next;
    });
  }, []);

  const handleSave = async (id: number) => {
    setSavingId(id);
    setError("");
    try {
      const slides = deckById[id] || [];
      const res = await updateCarouselSlides({ data: { id, slides } });
      if (res.ok) {
        setDirty((d) => ({ ...d, [id]: false }));
      } else {
        setError(res.error || "Could not save the edits.");
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setSavingId(null);
    }
  };

  // ── Downloads / actions ─────────────────────────────────────────

  const handleCopy = (c: SavedCarousel) => {
    const text = buildCarouselCaption(
      c.title,
      c.caption,
      c.callToAction,
      c.hashtags || [],
    );
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(c.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleDownloadSlide = async (c: SavedCarousel, idx: number) => {
    setDownloadingIdx(idx);
    try {
      const refs = slideRefs.current[c.id] || [];
      const ref = refs[idx];
      if (ref) await downloadSlidePng(ref, slugify(c.title), String(idx + 1));
    } catch {
      setError("Could not download that slide.");
    } finally {
      setDownloadingIdx(null);
    }
  };

  const handleDownloadAll = async (c: SavedCarousel) => {
    setDownloadingId(c.id);
    setDownloadProgressId({ id: c.id, done: 0, total: (deckById[c.id]?.length || 0) });
    try {
      const refs = slideRefs.current[c.id] || [];
      const slides = refs
        .map((ref, i) => (ref ? { el: ref as HTMLElement, label: String(i + 1) } : null))
        .filter((x): x is { el: HTMLElement; label: string } => x !== null);
      await downloadAllSlidesZip(slugify(c.title), slides, (done, total) => {
        setDownloadProgressId({ id: c.id, done, total });
      });
    } catch {
      setError("Could not package the slides into a zip. Please try again.");
    } finally {
      setDownloadingId(null);
      setDownloadProgressId(null);
    }
  };

  const handleDownloadText = (c: SavedCarousel) => {
    const text = buildCarouselText(
      c.title,
      c.topic,
      c.tone,
      c.dndThemed,
      c.caption,
      c.callToAction,
      c.hashtags || [],
      deckById[c.id] || c.slides || [],
      c.painPoint,
    );
    downloadCarouselText(`carousel-${slugify(c.title)}.txt`, text);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Banish this carousel from the archives?")) return;
    setDeletingId(id);
    try {
      const res = await deleteCarousel({ data: { id } });
      if (res.ok) {
        setCarousels((prev) => prev.filter((c) => c.id !== id));
        setDeckById((db) => {
          const next = { ...db };
          delete next[id];
          return next;
        });
        setDirty((d) => {
          const next = { ...d };
          delete next[id];
          return next;
        });
        if (editingKey && editingKey.startsWith(`${id}:`)) setEditingKey(null);
      } else {
        setError(res.error || "Could not delete the carousel.");
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
    ? carousels.filter(
        (c) =>
          c.title.toLowerCase().includes(search.toLowerCase()) ||
          c.topic.toLowerCase().includes(search.toLowerCase()),
      )
    : carousels;

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
          onClick={fetchCarousels}
          disabled={loading}
          className="px-3 py-2 rounded-lg border border-[#406080]/40 text-[#a0a0a0] hover:text-[#e0e0e0] hover:bg-[#204060]/20 transition-all text-xs font-fantasy disabled:opacity-50"
        >
          🔄 Refresh
        </button>
      </div>

      <p className="text-center text-[#606080] text-xs font-fantasy">
        {filtered.length} carousel{filtered.length !== 1 ? "s" : ""} in the
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
            {carousels.length === 0
              ? "No carousels saved yet. Forge one and save the best!"
              : "No carousels match your search."}
          </p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="space-y-4">
          {filtered.map((c) => {
            const isExpanded = expandedId === c.id;
            const slides = deckById[c.id] || c.slides || [];
            const isDirty = !!dirty[c.id];
            return (
              <div
                key={c.id}
                className="rounded-xl border border-[#406080]/30 bg-[#111a28] overflow-hidden"
              >
                {/* Header */}
                <div className="px-4 py-3 border-b border-[#406080]/20 bg-[#204060]/10">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <span className="text-[#c08020] font-fantasy text-sm font-bold block truncate">
                        📜 {c.title}
                      </span>
                      <span className="text-[#606080] text-xs font-fantasy">
                        {c.topic}
                        {c.painPoint && (
                          <span className="ml-2 px-1.5 py-0.5 rounded bg-[#406080]/20 text-[#a0a0a0] text-xs">
                            🎯 {c.painPoint}
                          </span>
                        )}
                        {c.tone && (
                          <span className="ml-2 px-1.5 py-0.5 rounded bg-[#406080]/20 text-[#a0a0a0] text-xs">
                            {c.tone}
                          </span>
                        )}
                        {c.dndThemed && (
                          <span className="ml-2 px-1.5 py-0.5 rounded bg-[#c08020]/15 text-[#c08020] text-xs">
                            🛡️ D&D
                          </span>
                        )}
                        {isDirty && (
                          <span className="ml-2 px-1.5 py-0.5 rounded bg-red-900/40 border border-red-700/40 text-red-300 text-xs">
                            Unsaved edits
                          </span>
                        )}
                      </span>
                    </div>
                    <span className="text-[#606080] text-xs font-fantasy whitespace-nowrap">
                      {formatDate(c.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Expanded body */}
                {isExpanded && (
                  <div className="px-4 py-4 space-y-4">
                    <div className="p-3 rounded-lg border border-[#406080]/30 bg-[#204060]/10">
                      <p className="text-[#c08020] font-bold font-fantasy text-sm mb-1">
                        📝 Caption
                      </p>
                      <p className="text-[#e0e0e0] leading-relaxed text-sm font-fantasy whitespace-pre-wrap">
                        {c.caption}
                      </p>
                    </div>
                    {slides.length > 0 && (
                      <div className={`space-y-4 ${editingKey && editingKey.startsWith(`${c.id}:`) ? "pb-[48vh]" : ""}`}>
                        <p className="text-[#c08020] font-bold font-fantasy text-sm">
                          🃏 Slides
                        </p>
                        {slides.map((slide, idx) => {
                          const isEditing = editingKey === `${c.id}:${idx}`;
                          return (
                            <div key={idx} className="space-y-2">
                              <EditableSlideCard
                                slide={slide}
                                refEl={(el) => {
                                  if (!slideRefs.current[c.id]) {
                                    slideRefs.current[c.id] = [];
                                  }
                                  slideRefs.current[c.id][idx] = el;
                                }}
                                onClick={() => toggleEdit(c.id, idx)}
                                onMoveElement={(elId, offsetX, offsetY) =>
                                  updateElement(c.id, idx, elId, {
                                    offsetX,
                                    offsetY,
                                  })
                                }
                                // Rendered at the same width as the forge view. The slide
                                // text is sized in fixed pixels, so a shrunken card clips the
                                // heading and body, and the PNG export captures the on screen
                                // render exactly as shown.
                                className={
                                  isEditing
                                    ? "ring-2 ring-[#c08020] cursor-pointer"
                                    : "cursor-pointer opacity-95 hover:opacity-100"
                                }
                              />
                              <div className="flex justify-center gap-2 flex-wrap">
                                <button
                                  onClick={() => toggleEdit(c.id, idx)}
                                  className={`shrink-0 px-3 py-1.5 rounded-lg border transition-all text-xs font-fantasy ${
                                    isEditing
                                      ? "bg-[#c08020] border-[#c08020] text-[#0d1520] font-bold"
                                      : "bg-[#204060]/30 border-[#406080]/30 text-[#e0e0e0] hover:bg-[#c08020]/20 hover:border-[#c08020]/50"
                                  }`}
                                >
                                  {isEditing ? "✅ Done" : "✏️ Edit"}
                                </button>
                                <button
                                  onClick={() => handleDownloadSlide(c, idx)}
                                  className="shrink-0 px-3 py-1.5 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#204060]/50 transition-all text-xs font-fantasy"
                                >
                                  {downloadingIdx === idx
                                    ? "⏳..."
                                    : `⬇️ PNG Slide ${idx + 1}`}
                                </button>
                              </div>
                              {isEditing && (
                                <SlideEditorPanel
                                  slide={slide}
                                  slideNumber={idx + 1}
                                  slideCount={slides.length}
                                  onClose={() => setEditingKey(null)}
                                  customBackgrounds={collectCustomBackgrounds(slides)}
                                  onSelectBackground={(bgId, image) =>
                                    selectBackground(c.id, idx, bgId, image)
                                  }
                                  onUploadBackground={(image) =>
                                    uploadBackground(c.id, idx, image)
                                  }
                                  onUpdateElement={(elId, patch) =>
                                    updateElement(c.id, idx, elId, patch)
                                  }
                                  onAddCustom={() => addCustom(c.id, idx)}
                                  onRemoveElement={(elId) =>
                                    removeElement(c.id, idx, elId)
                                  }
                                  onSelectThemeBackground={(id) =>
                                    selectThemeBackground(c.id, idx, id)
                                  }
                                  onSelectThemeBorder={(id) =>
                                    selectThemeBorder(c.id, idx, id)
                                  }
                                  onApplyLookToAll={(look) => applyLookToAll(c.id, look)}
                                  onColorAll={(color) => colorAll(c.id, idx, color)}
                                  onColorAllSlides={(color) => colorAllSlides(c.id, color)}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {c.hashtags && c.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {c.hashtags.map((tag) => (
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
                      setExpandedId((prev) => (prev === c.id ? null : c.id))
                    }
                    className="flex-1 px-2 py-2 rounded-lg border text-xs font-fantasy transition-colors bg-[#204060]/30 border-[#406080]/30 text-[#e0e0e0] hover:bg-[#204060]/50"
                  >
                    {isExpanded ? "🙈 Hide" : "👁️ View"}
                  </button>
                  {isDirty && (
                    <button
                      onClick={() => handleSave(c.id)}
                      disabled={savingId === c.id}
                      className="px-3 py-2 rounded-lg bg-[#c08020] border border-[#c08020] text-[#0d1520] font-bold text-xs font-fantasy transition-colors disabled:opacity-50"
                    >
                      {savingId === c.id ? "💾 Saving..." : "💾 Save edits"}
                    </button>
                  )}
                  <button
                    onClick={() => handleCopy(c)}
                    className="flex-1 px-2 py-2 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#204060]/50 text-xs font-fantasy transition-colors"
                  >
                    {copiedId === c.id ? "✅ Copied" : "📋 Copy Caption"}
                  </button>
                  <button
                    onClick={() => handleDownloadAll(c)}
                    disabled={downloadingId === c.id}
                    className="px-2 py-2 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#204060]/50 text-xs font-fantasy transition-colors disabled:opacity-50"
                  >
                    {downloadingId === c.id &&
                    downloadProgressId?.id === c.id &&
                    downloadProgressId.total > 0
                      ? `⏳ ${downloadProgressId.done}/${downloadProgressId.total}`
                      : downloadingId === c.id
                        ? "⏳..."
                        : "📥 Zip"}
                  </button>
                  <button
                    onClick={() => handleDownloadText(c)}
                    className="px-2 py-2 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#204060]/50 text-xs font-fantasy transition-colors"
                  >
                    📄 Text
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    disabled={deletingId === c.id}
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
