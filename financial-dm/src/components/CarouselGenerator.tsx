import { useCallback, useRef, useState } from "react";
import type { TopicPick, CarouselResult } from "~/server/carouselGenerator";
import {
  getRandomCarouselTopics,
  generateCarousel,
  saveCarousel,
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
  buildEditableDeck,
  makeElement,
  collectCustomBackgrounds,
  isCustomBackground,
  type EditableSlide,
  type SlideElement,
} from "~/lib/slideEditor";
import EditableSlideCard from "~/components/EditableSlideCard";
import SlideEditorPanel from "~/components/SlideEditorPanel";

const TONES = ["Informative", "Warm", "Funny", "Mix / Surprise Me"];

export default function CarouselGenerator() {
  const [topicOptions, setTopicOptions] = useState<TopicPick[]>([]);
  const [topicPick, setTopicPick] = useState<TopicPick | null>(null);
  const [tone, setTone] = useState("Mix / Surprise Me");
  const [dndThemed, setDndThemed] = useState(false);
  const [result, setResult] = useState<CarouselResult | null>(null);
  const [deck, setDeck] = useState<EditableSlide[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [downloadedIdx, setDownloadedIdx] = useState<number | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);

  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleRollTopic = useCallback(async () => {
    setRolling(true);
    setError("");
    setResult(null);
    setDeck([]);
    setEditingIdx(null);
    setTopicPick(null);
    try {
      const picks = await getRandomCarouselTopics();
      setTopicOptions(picks);
    } catch {
      setError("Could not roll the topics. Please try again.");
    } finally {
      setRolling(false);
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!topicPick) {
      setError("Please select a topic first!");
      return;
    }
    setLoading(true);
    setError("");
    setCopied(false);
    setResult(null);
    setDeck([]);
    try {
      const res = await generateCarousel({
        data: {
          topic: topicPick.topic,
          fact: topicPick.fact,
          tone,
          dndThemed,
        },
      });
      if (!res) {
        setError(
          "The carousel generator could not reach the AI service right now. Please check that the API key is set and try again.",
        );
        return;
      }
      setResult(res);
      setDeck(buildEditableDeck(res));
      setEditingIdx(0);
    } catch {
      setError("Failed to generate the carousel. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [topicPick, tone, dndThemed]);

  const handleCopyCaption = useCallback(async () => {
    if (!result) return;
    const text = buildCarouselCaption(
      result.title,
      result.caption,
      result.callToAction,
      result.hashtags || [],
    );
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy to clipboard.");
    }
  }, [result]);

  const handleDownloadSlide = useCallback(
    async (idx: number) => {
      const ref = slideRefs.current[idx];
      if (!ref || !result) return;
      try {
        await downloadSlidePng(ref, slugify(result.title), String(idx + 1));
        setDownloadedIdx(idx);
        setTimeout(() => setDownloadedIdx(null), 2000);
      } catch (e) {
        setError("Could not download that slide. Please try again.");
      }
    },
    [result],
  );

  const handleDownloadAll = useCallback(async () => {
    if (!result) return;
    setDownloadingAll(true);
    setDownloadProgress(0);
    setError("");
    try {
      const slides = slideRefs.current
        .map((ref, i) =>
          ref ? { el: ref, label: String(i + 1) } : null,
        )
        .filter((x): x is { el: HTMLElement; label: string } => x !== null);
      await downloadAllSlidesZip(slugify(result.title), slides, (done, total) => {
        setDownloadProgress(done);
      });
    } catch {
      setError(
        "Could not package the slides into a zip. Please try again.",
      );
    } finally {
      setDownloadingAll(false);
      setDownloadProgress(null);
    }
  }, [result]);

  const handleDownloadText = useCallback(() => {
    if (!result) return;
    const text = buildCarouselText(
      result.title,
      result.topic,
      result.tone,
      result.dndThemed,
      result.caption,
      result.callToAction,
      result.hashtags || [],
      deck,
    );
    downloadCarouselText(`carousel-${slugify(result.title)}.txt`, text);
  }, [result, deck]);

  const handleSave = useCallback(async () => {
    if (!result) return;
    setSaving(true);
    setError("");
    try {
      const res = await saveCarousel({ data: { ...result, deck } });
      if (!res.ok) {
        setError(res.error || "Could not save the carousel.");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Could not save the carousel.");
    } finally {
      setSaving(false);
    }
  }, [result, deck]);

  // ── Editor state helpers ─────────────────────────────────────────

  const selectBackground = useCallback(
    (idx: number, bgId: string, image?: string) => {
      setDeck((d) =>
        d.map((s, i) =>
          i === idx
            ? {
                ...s,
                background: bgId,
                backgroundImage: image ?? undefined,
              }
            : s,
        ),
      );
    },
    [],
  );

  const uploadBackground = useCallback(
    (idx: number, image: string) => {
      const id = `custom-${Date.now().toString(36)}${Math.random()
        .toString(36)
        .slice(2, 7)}`;
      selectBackground(idx, id, image);
    },
    [selectBackground],
  );

  const updateElement = useCallback(
    (slideIdx: number, elId: string, patch: Partial<SlideElement>) => {
      setDeck((d) =>
        d.map((s, i) =>
          i === slideIdx
            ? {
                ...s,
                elements: s.elements.map((e) =>
                  e.id === elId ? { ...e, ...patch } : e,
                ),
              }
            : s,
        ),
      );
    },
    [],
  );

  const addCustom = useCallback(
    (slideIdx: number) => {
      const element = makeElement("custom", "Type something new", "center", "middle");
      setDeck((d) =>
        d.map((s, i) => (i === slideIdx ? { ...s, elements: [...s.elements, element] } : s)),
      );
    },
    [],
  );

  const removeElement = useCallback(
    (slideIdx: number, elId: string) => {
      setDeck((d) =>
        d.map((s, i) =>
          i === slideIdx
            ? { ...s, elements: s.elements.filter((e) => e.id !== elId) }
            : s,
        ),
      );
    },
    [],
  );

  const applyBackgroundToAll = useCallback((bgId: string, image?: string) => {
    setDeck((d) =>
      d.map((s) => ({
        ...s,
        background: bgId,
        backgroundImage: isCustomBackground(bgId) ? image : undefined,
      })),
    );
  }, []);

  const selectThemeBackground = useCallback(
    (idx: number, id: string | undefined) => {
      setDeck((d) =>
        d.map((s, i) =>
          i === idx ? { ...s, themeBackground: id } : s,
        ),
      );
    },
    [],
  );

  const selectThemeBorder = useCallback(
    (idx: number, id: string | undefined) => {
      setDeck((d) =>
        d.map((s, i) =>
          i === idx ? { ...s, themeBorder: id } : s,
        ),
      );
    },
    [],
  );

  const applyThemeToAll = useCallback(
    (themeBackground?: string, themeBorder?: string) => {
      setDeck((d) =>
        d.map((s) => ({
          ...s,
          themeBackground,
          themeBorder,
        })),
      );
    },
    [],
  );

  const toggleEdit = useCallback((idx: number) => {
    setEditingIdx((prev) => (prev === idx ? null : idx));
  }, []);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Step 1: Roll a Topic */}
      <section className="rounded-xl border border-[#406080]/30 bg-[#111a28] p-5 space-y-4">
        <h2 className="font-fantasy text-[#c08020] text-lg">Step 1: Roll a Topic</h2>
        <div className="flex justify-center">
          <button
            onClick={handleRollTopic}
            disabled={rolling}
            className="px-6 py-3 rounded-lg bg-[#c08020] hover:bg-[#a06a18] text-[#0d1520] font-bold shadow-lg shadow-[#c08020]/20 transition-all font-fantasy text-lg disabled:opacity-50"
          >
            {rolling ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-[#0d1520] border-t-transparent rounded-full animate-spin" />
                Rolling the dice...
              </span>
            ) : (
              "🎲 Roll a Topic"
            )}
          </button>
        </div>

        {topicOptions.length > 0 && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {topicOptions.map((opt) => {
                const selected = topicPick?.topic === opt.topic && topicPick?.fact === opt.fact;
                return (
                  <button
                    key={`${opt.topic}\u0000${opt.fact}`}
                    type="button"
                    onClick={() => setTopicPick(opt)}
                    className={`text-left p-4 rounded-xl border text-[#e0e0e0] text-sm font-fantasy space-y-1 transition-all ${
                      selected
                        ? "border-[#c08020] bg-[#c08020]/15 shadow-lg shadow-[#c08020]/20"
                        : "border-[#c08020]/30 bg-[#c08020]/5 hover:border-[#c08020]/60 hover:bg-[#c08020]/10"
                    }`}
                  >
                    <p className="text-[#c08020] font-bold text-base uppercase tracking-wide flex items-center justify-between gap-2">
                      <span>🏷️ {opt.topic}</span>
                      {selected && <span aria-hidden="true">✅</span>}
                    </p>
                    <p className="leading-relaxed">{opt.fact}</p>
                  </button>
                );
              })}
            </div>
            {!topicPick && (
              <p className="text-center text-[#a0a0a0] text-sm font-fantasy">
                Click a topic to select it, then set your tone below.
              </p>
            )}
          </div>
        )}
      </section>

      {/* Step 2: Set the Tone + D&D toggle */}
      <section className="rounded-xl border border-[#406080]/30 bg-[#111a28] p-5 space-y-4">
        <h2 className="font-fantasy text-[#c08020] text-lg">Step 2: Set the Tone</h2>
        <p className="text-[#a0a0a0] text-sm font-fantasy">
          Baseline is informative, warm, and funny. Pick a button to lean further
          into one tone.
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {TONES.map((t) => (
            <button
              key={t}
              onClick={() => setTone(t)}
              className={`px-4 py-2 rounded-lg font-fantasy text-sm transition-all border ${
                tone === t
                  ? "bg-[#c08020] text-[#0d1520] border-[#c08020] shadow-lg shadow-[#c08020]/20"
                  : "bg-[#111a28] text-[#a0a0a0] border-[#406080]/40 hover:border-[#c08020]/50 hover:text-[#e0e0e0]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-center gap-3 pt-1">
          <button
            onClick={() => setDndThemed((v) => !v)}
            aria-pressed={dndThemed}
            className={`px-4 py-2 rounded-lg border font-fantasy text-sm transition-all ${
              dndThemed
                ? "bg-[#c08020]/20 border-[#c08020]/50 text-[#c08020]"
                : "bg-[#204060]/30 border-[#406080]/30 text-[#a0a0a0] hover:border-[#c08020]/50 hover:text-[#e0e0e0]"
            }`}
          >
            {dndThemed ? "🛡️ D&D Theme: On" : "🛡️ D&D Theme: Off"}
          </button>
        </div>
        <p className="text-center text-[#606080] text-xs font-fantasy">
          D&D framing is off by default. Turn it on only if you want light fantasy
          wording in the carousel.
        </p>
      </section>

      {/* Step 3: Forge the Carousel */}
      <section className="rounded-xl border border-[#406080]/30 bg-[#111a28] p-5 space-y-4">
        <h2 className="font-fantasy text-[#c08020] text-lg">Step 3: Forge the Carousel</h2>
        <div className="flex justify-center">
          <button
            onClick={handleGenerate}
            disabled={loading || !topicPick}
            className="px-8 py-4 rounded-lg bg-[#c08020] hover:bg-[#a06a18] disabled:bg-[#406080]/30 disabled:text-[#606080] text-[#0d1520] font-bold text-lg shadow-xl shadow-[#c08020]/20 transition-all font-fantasy tracking-wider"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-3 border-[#0d1520] border-t-transparent rounded-full animate-spin" />
                Forging the deck...
              </span>
            ) : (
              "🧙 Forge Carousel"
            )}
          </button>
        </div>

        {error && (
          <div className="text-center p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-300 text-sm font-fantasy">
            {error}
          </div>
        )}

        {result && (
          <div className="p-5 rounded-xl border border-[#c08020]/30 bg-[#0d1520]/60 text-[#e0e0e0] space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="font-fantasy text-[#c08020] text-xl">{result.title}</h3>
              <div className="flex flex-wrap gap-2 shrink-0">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="shrink-0 px-4 py-2 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#c08020]/20 hover:border-[#c08020]/50 transition-all text-sm font-fantasy disabled:opacity-50"
                >
                  {saving ? "💾 Saving..." : saved ? "✅ Saved!" : "💾 Save Carousel"}
                </button>
                <button
                  onClick={handleCopyCaption}
                  className="shrink-0 px-4 py-2 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#204060]/50 transition-all text-sm font-fantasy"
                >
                  {copied ? "✅ Copied!" : "📋 Copy Caption"}
                </button>
                <button
                  onClick={handleDownloadText}
                  className="shrink-0 px-4 py-2 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#204060]/50 transition-all text-sm font-fantasy"
                >
                  📄 Text
                </button>
              </div>
            </div>

            <p className="text-[#a0a0a0] text-xs font-fantasy">
              🏷️ {result.topic} · Tone: {result.tone}
              {result.dndThemed ? " · 🛡️ D&D themed" : ""}
            </p>

            {/* Caption */}
            {result.caption && (
              <div className="p-3 rounded-lg border border-[#406080]/30 bg-[#204060]/10">
                <p className="text-[#c08020] font-bold font-fantasy text-sm mb-1">
                  📝 Caption
                </p>
                <p className="text-[#e0e0e0] leading-relaxed text-sm font-fantasy whitespace-pre-wrap">
                  {result.caption}
                </p>
              </div>
            )}

            {/* Hashtags */}
            {result.hashtags && result.hashtags.length > 0 && (
              <div className="p-3 rounded-lg border border-[#406080]/30 bg-[#111a28]">
                <p className="text-[#c08020] font-bold font-fantasy text-sm mb-2">
                  🏷️ Hashtags
                </p>
                <div className="flex flex-wrap gap-2">
                  {result.hashtags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-block px-2 py-1 rounded-md bg-[#c08020]/10 border border-[#c08020]/30 text-[#c08020] text-sm font-fantasy"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Slide deck + editor */}
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2 items-center justify-between">
                <p className="text-[#c08020] font-bold font-fantasy text-sm">
                  ✏️ Edit Any Slide
                </p>
                <button
                  onClick={handleDownloadAll}
                  disabled={downloadingAll}
                  className="shrink-0 px-4 py-2 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#204060]/50 transition-all text-sm font-fantasy disabled:opacity-50"
                >
                  {downloadingAll
                    ? `⏳ Packaging ${downloadProgress ?? 0} of ${deck.length} slides...`
                    : "⬇️ Download All Slides (.zip)"}
                </button>
              </div>

              {deck.map((slide, idx) => {
                const isSelected =
                  typeof editingIdx === "number" && editingIdx === idx;
                return (
                  <div key={idx} className="space-y-2">
                    <EditableSlideCard
                      slide={slide}
                      refEl={(el) => {
                        slideRefs.current[idx] = el;
                      }}
                      onClick={() => toggleEdit(idx)}
                      onMoveElement={(elId, offsetX, offsetY) =>
                        updateElement(idx, elId, { offsetX, offsetY })
                      }
                      className={
                        isSelected
                          ? "ring-2 ring-[#c08020] cursor-pointer"
                          : "cursor-pointer opacity-95 hover:opacity-100"
                      }
                    />
                    <div className="flex justify-center gap-2 flex-wrap">
                      <button
                        onClick={() => toggleEdit(idx)}
                        className={`shrink-0 px-3 py-1.5 rounded-lg border transition-all text-xs font-fantasy ${
                          isSelected
                            ? "bg-[#c08020] border-[#c08020] text-[#0d1520] font-bold"
                            : "bg-[#204060]/30 border-[#406080]/30 text-[#e0e0e0] hover:bg-[#c08020]/20 hover:border-[#c08020]/50"
                        }`}
                      >
                        {isSelected ? "✅ Done" : "✏️ Edit"}
                      </button>
                      <button
                        onClick={() => handleDownloadSlide(idx)}
                        className="shrink-0 px-3 py-1.5 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#204060]/50 transition-all text-xs font-fantasy"
                      >
                        {downloadedIdx === idx
                          ? "✅ Downloaded!"
                          : `⬇️ PNG Slide ${idx + 1}`}
                      </button>
                    </div>
                    {isSelected && (
                      <SlideEditorPanel
                        slide={slide}
                        customBackgrounds={collectCustomBackgrounds(deck)}
                        onSelectBackground={(bgId, image) =>
                          selectBackground(idx, bgId, image)
                        }
                        onUploadBackground={(image) =>
                          uploadBackground(idx, image)
                        }
                        onUpdateElement={(elId, patch) =>
                          updateElement(idx, elId, patch)
                        }
                        onAddCustom={() => addCustom(idx)}
                        onRemoveElement={(elId) => removeElement(idx, elId)}
                        onApplyBgToAll={applyBackgroundToAll}
                        onSelectThemeBackground={(id) =>
                          selectThemeBackground(idx, id)
                        }
                        onSelectThemeBorder={(id) =>
                          selectThemeBorder(idx, id)
                        }
                        onApplyThemeToAll={applyThemeToAll}
                      />
                    )}
                  </div>
                );
              })}

            </div>

            <div className="flex justify-center">
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="px-6 py-3 rounded-lg bg-[#204060]/40 border border-[#406080]/50 text-[#e0e0e0] hover:bg-[#204060]/60 transition-all font-fantasy text-sm disabled:opacity-50"
              >
                {loading ? "Rolling a fresh take..." : "🔄 Regenerate (Variety)"}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
