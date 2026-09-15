import { useCallback, useRef, useState, useEffect } from "react";
import type { CarouselResult } from "~/server/carouselGenerator";
import { generateCarousel, saveCarousel } from "~/server/carouselGenerator";
import type { TopicSelection } from "~/server/topics";
import {
  slugify,
  downloadSlidePng,
  downloadAllSlidesZip,
  downloadCarouselText,
  buildCarouselText,
  buildCarouselCaption,
} from "~/lib/carouselUtils";
import {
  applyCtaSlides,
  buildEditableDeck,
  makeElement,
  collectCustomBackgrounds,
  type EditableSlide,
  type SlideElement,
} from "~/lib/slideEditor";
import CtaPanel from "~/components/generator/CtaPanel";
import { CTA_PLACEMENTS, DEFAULT_CTA_PLACEMENT, effectiveCta, type CtaPlacement } from "~/lib/cta";
import EditableSlideCard from "~/components/EditableSlideCard";
import SlideShapePicker from "~/components/SlideShapePicker";
import { readSlideAspect, writeSlideAspect, type SlideAspect } from "~/lib/slideEditor";
import SlideEditorPanel, { type SlideLook } from "~/components/SlideEditorPanel";
import { attachOutputToSlot } from "~/server/campaign";
import { contextOf, type CampaignBrief } from "~/lib/campaign";
import CaptionHashtagPanel from "~/components/generator/CaptionHashtagPanel";

/**
 * Carousel forge. Topic, pain point, tone, and D&D flavor come from the
 * shared picker in the parent; this component owns the deck and its editor.
 */
export default function CarouselGenerator({
  selection,
  tone,
  dndThemed,
  campaign,
}: {
  selection: TopicSelection | null;
  tone: string;
  dndThemed: boolean;
  /** A Quest Board brief. Optional: without it the forge works exactly as before. */
  campaign?: CampaignBrief;
}) {
  const [questState, setQuestState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [questNote, setQuestNote] = useState("");
  const [result, setResult] = useState<CarouselResult | null>(null);
  const [deck, setDeck] = useState<EditableSlide[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [downloadedIdx, setDownloadedIdx] = useState<number | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);

  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  /** Whether the call to action goes out at all, and where its slide sits. John's choices stick across forges. */
  const [ctaOn, setCtaOn] = useState(true);
  const [placement, setPlacement] = useState<CtaPlacement>(DEFAULT_CTA_PLACEMENT);
  const cta = effectiveCta(ctaOn, result?.callToAction ?? "");
  const ctaSlideText = useCallback(
    (r: CarouselResult, line: string) => ({ heading: r.ctaSlides?.find((sl) => sl.body === line)?.heading ?? "", body: line }),
    [],
  );
  const [aspect, setAspect] = useState<SlideAspect>("1:1");
  useEffect(() => setAspect(readSlideAspect()), []);
  const chooseAspect = (v: SlideAspect) => {
    setAspect(v);
    writeSlideAspect(v);
  };

  const handleGenerate = useCallback(async () => {
    if (!selection) {
      setError("Roll and select a topic first!");
      return;
    }
    setLoading(true);
    setError("");
    setCopied(false);
    setSaved(false);
    setResult(null);
    setDeck([]);
    try {
      const res = await generateCarousel({
        data: {
          topic: selection.topic,
          fact: selection.fact,
          painPoint: selection.painPoint,
          tone,
          dndThemed,
          campaign: campaign ? contextOf(campaign) : undefined,
        },
      });
      setQuestState("idle");
      setQuestNote("");
      if (!res) {
        setError(
          "The carousel generator could not reach the AI service right now. Please check that the API key is set and try again.",
        );
        return;
      }
      setResult(res);
      setDeck(buildEditableDeck({ ...res, ctaHeading: ctaSlideText(res, res.callToAction).heading }, ctaOn ? placement : "none"));
      setEditingIdx(0);
    } catch {
      setError("Failed to generate the carousel. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [selection, tone, dndThemed, campaign, ctaOn, placement, ctaSlideText]);

  const selectCaption = useCallback(
    (caption: string) => {
      if (!result) return;
      setResult({ ...result, caption });
      setSaved(false);
    },
    [result],
  );

  /** Pick a call to action: the post text and the call to action slide(s) follow. */
  const selectCta = useCallback(
    (line: string) => {
      if (!result) return;
      setResult({ ...result, callToAction: line });
      setDeck((d) => applyCtaSlides(d, ctaOn ? placement : "none", ctaSlideText(result, line)));
      setSaved(false);
    },
    [result, ctaOn, placement, ctaSlideText],
  );

  const toggleCta = useCallback(
    (on: boolean) => {
      setCtaOn(on);
      if (result) setDeck((d) => applyCtaSlides(d, on ? placement : "none", ctaSlideText(result, result.callToAction)));
      setSaved(false);
    },
    [result, placement, ctaSlideText],
  );

  const choosePlacement = useCallback(
    (p: CtaPlacement) => {
      setPlacement(p);
      if (result) setDeck((d) => applyCtaSlides(d, ctaOn ? p : "none", ctaSlideText(result, result.callToAction)));
      setSaved(false);
    },
    [result, ctaOn, ctaSlideText],
  );

  const handleCopyCaption = useCallback(async () => {
    if (!result) return;
    const text = buildCarouselCaption(result.title, result.caption, cta, result.hashtags || []);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy to clipboard.");
    }
  }, [result, cta]);

  const handleDownloadSlide = useCallback(
    async (idx: number) => {
      const ref = slideRefs.current[idx];
      if (!ref || !result) return;
      try {
        await downloadSlidePng(ref, slugify(result.title), String(idx + 1));
        setDownloadedIdx(idx);
        setTimeout(() => setDownloadedIdx(null), 2000);
      } catch {
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
        .map((ref, i) => (ref ? { el: ref as HTMLElement, label: String(i + 1) } : null))
        .filter((x): x is { el: HTMLElement; label: string } => x !== null);
      await downloadAllSlidesZip(slugify(result.title), slides, (done) => {
        setDownloadProgress(done);
      });
    } catch {
      setError("Could not package the slides into a zip. Please try again.");
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
      cta,
      result.hashtags || [],
      deck,
      result.painPoint,
    );
    downloadCarouselText(`carousel-${slugify(result.title)}.txt`, text);
  }, [result, deck, cta]);

  const handleSaveToQuest = useCallback(async () => {
    if (!result || !campaign) return;
    setQuestState("saving");
    setQuestNote("");
    try {
      const res = await saveCarousel({ data: { ...result, callToAction: cta, deck } });
      if (!res.ok || !res.id) {
        setQuestState("error");
        setQuestNote(res.error || "Could not save the carousel.");
        return;
      }
      const text = [result.title, ...deck.flatMap((s) => s.elements.map((e) => e.text)), result.caption, cta].join("\n");
      const att = await attachOutputToSlot({ data: { slotId: campaign.slotId, ref: `carousel:${res.id}`, text } });
      if (!att.ok) {
        setQuestState("error");
        setQuestNote(att.error || "Could not save to the quest.");
        return;
      }
      setQuestState("saved");
      setQuestNote(att.flags.length ? `⚠️ Flagged words to check before approval: ${att.flags.join(", ")}` : "Slot moved to Drafted.");
    } catch {
      setQuestState("error");
      setQuestNote("Could not save to the quest.");
    }
  }, [result, deck, campaign, cta]);

  const handleSave = useCallback(async () => {
    if (!result) return;
    setSaving(true);
    setError("");
    try {
      const res = await saveCarousel({ data: { ...result, callToAction: cta, deck } });
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
  }, [result, deck, cta]);

  // ── Editor state helpers ─────────────────────────────────────────

  // A plain color or an uploaded image replaces any D&D scene, so what John
  // clicks is what shows. The border is kept.
  const selectBackground = useCallback((idx: number, bgId: string, image?: string) => {
    setDeck((d) =>
      d.map((s, i) => (i === idx ? { ...s, background: bgId, backgroundImage: image ?? undefined, themeBackground: undefined } : s)),
    );
  }, []);

  const uploadBackground = useCallback(
    (idx: number, image: string) => {
      const id = `custom-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
      selectBackground(idx, id, image);
    },
    [selectBackground],
  );

  const updateElement = useCallback((slideIdx: number, elId: string, patch: Partial<SlideElement>) => {
    setDeck((d) =>
      d.map((s, i) =>
        i === slideIdx
          ? { ...s, elements: s.elements.map((e) => (e.id === elId ? { ...e, ...patch } : e)) }
          : s,
      ),
    );
  }, []);

  const addCustom = useCallback((slideIdx: number) => {
    const element = makeElement("custom", "Type something new", "center", "middle");
    setDeck((d) => d.map((s, i) => (i === slideIdx ? { ...s, elements: [...s.elements, element] } : s)));
  }, []);

  const removeElement = useCallback((slideIdx: number, elId: string) => {
    setDeck((d) =>
      d.map((s, i) => (i === slideIdx ? { ...s, elements: s.elements.filter((e) => e.id !== elId) } : s)),
    );
  }, []);

  const colorAll = useCallback((idx: number, color: string | undefined) => {
    setDeck((d) => d.map((s, i) => (i === idx ? { ...s, elements: s.elements.map((e) => ({ ...e, color })) } : s)));
  }, []);

  const colorAllSlides = useCallback((color: string | undefined) => {
    setDeck((d) => d.map((s) => ({ ...s, elements: s.elements.map((e) => ({ ...e, color })) })));
  }, []);

  /** Copy one slide's whole look (background, scene, border) to every slide. */
  const applyLookToAll = useCallback((look: SlideLook) => {
    setDeck((d) => d.map((s) => ({ ...s, ...look })));
  }, []);

  const selectThemeBackground = useCallback((idx: number, id: string | undefined) => {
    setDeck((d) => d.map((s, i) => (i === idx ? { ...s, themeBackground: id } : s)));
  }, []);

  const selectThemeBorder = useCallback((idx: number, id: string | undefined) => {
    setDeck((d) => d.map((s, i) => (i === idx ? { ...s, themeBorder: id } : s)));
  }, []);

  const toggleEdit = useCallback((idx: number) => {
    setEditingIdx((prev) => {
      const next = prev === idx ? null : idx;
      // Bring the slide being edited to the top so it sits above the docked editor.
      if (next !== null) setTimeout(() => slideRefs.current[idx]?.scrollIntoView({ block: "start", behavior: "smooth" }), 0);
      return next;
    });
  }, []);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[#406080]/30 bg-[#111a28] p-5 space-y-4">
        <h2 className="font-fantasy text-[#c08020] text-lg">Step 3: Forge the Carousel</h2>
        {selection ? (
          <p className="text-center text-[#606080] text-xs font-fantasy">
            🏷️ {selection.topic} · 🎯 “{selection.painPoint || "no pain point chosen"}” · Tone: {tone}
            {dndThemed ? " · 🛡️ D&D" : ""}
          </p>
        ) : (
          <p className="text-center text-[#606080] text-xs font-fantasy">
            Roll a topic and pick a pain point above to unlock the forge.
          </p>
        )}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading || !selection}
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
                {campaign && <button
                  type="button"
                  onClick={handleSaveToQuest}
                  disabled={questState === "saving"}
                  className="px-4 py-2 rounded-lg bg-[#c08020]/15 border border-[#c08020]/40 text-[#c08020] hover:bg-[#c08020]/25 transition-all text-sm font-fantasy disabled:opacity-50"
                  data-save-to-quest
                >
                  {questState === "saving" ? "🗺️ Saving to quest..." : questState === "saved" ? "✅ Saved to quest" : "🗺️ Save to quest"}
                </button>
                }
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="shrink-0 px-4 py-2 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#c08020]/20 hover:border-[#c08020]/50 transition-all text-sm font-fantasy disabled:opacity-50"
                >
                  {saving ? "💾 Saving..." : saved ? "✅ Saved!" : "💾 Save Carousel"}
                </button>
                {questNote && <p className={`w-full text-xs font-fantasy ${questState === "error" ? "text-red-300" : "text-[#e8c884]"}`} data-quest-note>{questNote}</p>}
                <button
                  type="button"
                  onClick={handleCopyCaption}
                  className="shrink-0 px-4 py-2 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#204060]/50 transition-all text-sm font-fantasy"
                >
                  {copied ? "✅ Copied!" : "📋 Copy Post Text"}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadText}
                  className="shrink-0 px-4 py-2 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#204060]/50 transition-all text-sm font-fantasy"
                >
                  📄 Text
                </button>
              </div>
            </div>

            <p className="text-[#a0a0a0] text-xs font-fantasy">
              🏷️ {result.topic} · 🎯 {result.painPoint || "no pain point"} · Tone: {result.tone}
              {result.dndThemed ? " · 🛡️ D&D themed" : ""}
            </p>

            <CaptionHashtagPanel
              captions={result.captions}
              caption={result.caption}
              onSelectCaption={selectCaption}
              hashtags={result.hashtags || []}
              onError={setError}
              ctaLine={cta}
            />

            <CtaPanel
              options={result.callToActions || []}
              value={result.callToAction}
              on={ctaOn}
              onSelect={selectCta}
              onToggle={toggleCta}
              onError={setError}
              note="The post text has no call to action and the deck has no call to action slide."
            >
              <div className="pt-1 space-y-1">
                <p className="text-[#e0b45a] text-xs font-fantasy">Call to action slide</p>
                <div className="flex flex-wrap gap-2">
                  {CTA_PLACEMENTS.map((opt) => {
                    const selected = ctaOn && placement === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          if (!ctaOn) toggleCta(true);
                          choosePlacement(opt.id);
                        }}
                        aria-pressed={selected}
                        title={opt.note}
                        data-cta-placement={opt.id}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-fantasy transition-all ${
                          selected
                            ? "border-[#c08020] bg-[#c08020]/15 text-[#c08020]"
                            : "border-[#406080]/40 bg-[#0d1520]/40 text-[#a0a0a0] hover:border-[#c08020]/50 hover:text-[#e0e0e0]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[#606080] text-xs font-fantasy">
                  {ctaOn ? CTA_PLACEMENTS.find((o) => o.id === placement)?.note : "Turn the call to action on to place its slide."}{" "}
                  Switching placement rebuilds the call to action slide; the other slides keep their edits.
                </p>
              </div>
            </CtaPanel>

            {/* Slide deck + editor (extra room at the bottom while the docked editor is open) */}
            <div className={`space-y-5 ${editingIdx !== null ? "pb-[48vh]" : ""}`}>
              <SlideShapePicker value={aspect} onChange={chooseAspect} />
              <div className="flex flex-wrap gap-2 items-center justify-between">
                <p className="text-[#c08020] font-bold font-fantasy text-sm">✏️ Edit Any Slide</p>
                <button
                  type="button"
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
                const isSelected = typeof editingIdx === "number" && editingIdx === idx;
                return (
                  <div key={idx} className="space-y-2">
                    <EditableSlideCard
                      slide={slide}
                      aspect={aspect}
                      refEl={(el) => {
                        slideRefs.current[idx] = el;
                      }}
                      onClick={() => toggleEdit(idx)}
                      onMoveElement={(elId, offsetX, offsetY) => updateElement(idx, elId, { offsetX, offsetY })}
                      className={
                        isSelected ? "ring-2 ring-[#c08020] cursor-pointer" : "cursor-pointer opacity-95 hover:opacity-100"
                      }
                    />
                    <div className="flex justify-center gap-2 flex-wrap">
                      <button
                        type="button"
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
                        type="button"
                        onClick={() => handleDownloadSlide(idx)}
                        className="shrink-0 px-3 py-1.5 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#204060]/50 transition-all text-xs font-fantasy"
                      >
                        {downloadedIdx === idx ? "✅ Downloaded!" : `⬇️ PNG Slide ${idx + 1}`}
                      </button>
                    </div>
                    {isSelected && (
                      <SlideEditorPanel
                        slide={slide}
                        slideNumber={idx + 1}
                        slideCount={deck.length}
                        customBackgrounds={collectCustomBackgrounds(deck)}
                        onClose={() => setEditingIdx(null)}
                        onSelectBackground={(bgId, image) => selectBackground(idx, bgId, image)}
                        onUploadBackground={(image) => uploadBackground(idx, image)}
                        onUpdateElement={(elId, patch) => updateElement(idx, elId, patch)}
                        onAddCustom={() => addCustom(idx)}
                        onRemoveElement={(elId) => removeElement(idx, elId)}
                        onSelectThemeBackground={(id) => selectThemeBackground(idx, id)}
                        onSelectThemeBorder={(id) => selectThemeBorder(idx, id)}
                        onApplyLookToAll={applyLookToAll}
                        onColorAll={(color) => colorAll(idx, color)}
                        onColorAllSlides={colorAllSlides}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-center">
              <button
                type="button"
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
