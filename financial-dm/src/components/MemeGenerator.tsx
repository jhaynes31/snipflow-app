import { useState, useCallback, useRef } from "react";
import { attachOutputToSlot } from "~/server/campaign";
import { contextOf, type CampaignBrief } from "~/lib/campaign";
import type { MemeConcept, MemeTemplate } from "~/server/memeGenerator";
import { generateMemeConcepts, saveConcept, findTemplateImage } from "~/server/memeGenerator";
import type { TopicSelection } from "~/server/topics";
import MemePreview from "~/components/MemePreview";
import type { TextBox } from "~/components/MemePreview";
import { slotsFor } from "~/lib/memeLayouts";
import CaptionHashtagPanel from "~/components/generator/CaptionHashtagPanel";
import CtaPanel from "~/components/generator/CtaPanel";
import { effectiveCta, withCtaLine } from "~/lib/cta";
import { downloadElementPng } from "~/lib/exportPng";
import { PLATFORMS } from "~/lib/contentOptions";

/** Sanitize a template name into a safe filename slug */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Create a TextBox from top/bottom legacy text */
function makeTextBox(id: string, text: string, x: number, y: number, showBackground: boolean): TextBox {
  return { id, text, x, y, showBackground };
}

/**
 * Place each slot's text where the template's layout says it belongs. With
 * no matched template yet (or no layout), the writer's lines fall back to
 * evenly spaced rows so nothing is lost.
 */
function boxesFor(concept: MemeConcept, template: MemeTemplate | null): TextBox[] {
  const texts = concept.texts?.length ? concept.texts : [concept.topText, concept.bottomText];
  const slots = slotsFor(template ?? { name: concept.template, boxCount: texts.length });
  const boxes: TextBox[] = [];
  texts.forEach((text, i) => {
    if (!text) return;
    const slot = slots[i] ?? slots[slots.length - 1] ?? { x: 50, y: 50, w: 92 };
    const box = makeTextBox(crypto.randomUUID(), text, slot.x, slot.y, !slot.dark);
    boxes.push({ ...box, w: slot.w, dark: slot.dark });
  });
  return boxes;
}

/**
 * Meme forge. Topic, pain point, tone, and D&D flavor come from the shared
 * picker in the parent. Each concept carries caption options and hashtags.
 */
export default function MemeGenerator({
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
  const [questIdx, setQuestIdx] = useState<number | null>(null);
  const [questNote, setQuestNote] = useState("");
  const [concepts, setConcepts] = useState<MemeConcept[]>([]);
  const [templateImages, setTemplateImages] = useState<(MemeTemplate | null)[]>([]);
  const [textBoxesArr, setTextBoxesArr] = useState<TextBox[][]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [savedIdx, setSavedIdx] = useState<number | null>(null);
  const [regeneratingIdx, setRegeneratingIdx] = useState<number | null>(null);
  const [downloadedIdx, setDownloadedIdx] = useState<number | null>(null);
  const [platformPickerIdx, setPlatformPickerIdx] = useState<number | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  /** Whether the call to action goes out at all (one switch for the batch). John's choice sticks across forges. */
  const [ctaOn, setCtaOn] = useState(true);

  // Refs for meme preview containers (captured by html-to-image for PNG export)
  const memePreviewRefs = useRef<(HTMLDivElement | null)[]>([]);

  const input = useCallback(() => {
    if (!selection) return null;
    return {
      topic: selection.topic,
      fact: selection.fact,
      painPoint: selection.painPoint,
      tone,
      dndThemed,
      campaign: campaign ? contextOf(campaign) : undefined,
    };
  }, [selection, tone, dndThemed, campaign]);

  const handleGenerate = useCallback(async () => {
    const data = input();
    if (!data) {
      setError("Roll and select a topic first!");
      return;
    }
    setLoading(true);
    setError("");
    setEditingIdx(null);
    try {
      const result = await generateMemeConcepts({ data });
      if (result.length === 0) {
        setError("The API returned no concepts. Check the server log or try again.");
      }
      setConcepts(result);
      setTextBoxesArr(result.map((c) => boxesFor(c, null)));
      const images = await Promise.all(
        result.map((c) => findTemplateImage({ data: { templateName: c.template } })),
      );
      setTemplateImages(images);
      // Now that the real template is known, place the text where its layout says.
      setTextBoxesArr(result.map((c, i) => boxesFor(c, images[i])));
    } catch {
      setError("Failed to generate concepts. Check the API key and try again.");
    } finally {
      setLoading(false);
    }
  }, [input]);

  const handleRegenerateOne = useCallback(
    async (idx: number) => {
      const data = input();
      if (!data) return;
      setRegeneratingIdx(idx);
      try {
        const result = await generateMemeConcepts({ data });
        if (result.length > 0) {
          const newConcept = result[idx] || result[0];
          setConcepts((prev) => prev.map((c, i) => (i === idx ? newConcept : c)));
          const img = await findTemplateImage({ data: { templateName: newConcept.template } });
          setTemplateImages((prev) => prev.map((t, i) => (i === idx ? img : t)));
          setTextBoxesArr((prev) => prev.map((b, i) => (i === idx ? boxesFor(newConcept, img) : b)));
        }
      } catch {
        // ignore
      } finally {
        setRegeneratingIdx(null);
      }
    },
    [input],
  );

  const selectCaption = useCallback((idx: number, caption: string) => {
    setConcepts((prev) => prev.map((c, i) => (i === idx ? { ...c, caption } : c)));
  }, []);

  const selectCta = useCallback((idx: number, callToAction: string) => {
    setConcepts((prev) => prev.map((c, i) => (i === idx ? { ...c, callToAction } : c)));
  }, []);

  const handleDownload = useCallback(async (idx: number, templateName: string) => {
    const ref = memePreviewRefs.current[idx];
    if (!ref) return;
    try {
      await downloadElementPng(ref, slugify(templateName) + "-meme.png");
      setDownloadedIdx(idx);
      setTimeout(() => setDownloadedIdx(null), 2000);
    } catch (e) {
      setError("Download failed: " + e);
    }
  }, []);

  const persist = useCallback(
    async (concept: MemeConcept, idx: number, extra: { platform?: string; isUsed?: boolean; isFavorite?: boolean; toQuest?: boolean }) => {
      if (!selection) return;
      setSavingId(idx);
      try {
        const boxes = textBoxesArr[idx] || [];
        // Derive top/bottom text from boxes with showBackground for backward compat
        const topBox = boxes.find((b) => b.showBackground && b.y < 50);
        const bottomBox = boxes.find((b) => b.showBackground && b.y >= 50);
        const result = await saveConcept({
          data: {
            fact: selection.fact,
            category: selection.topic,
            painPoint: selection.painPoint,
            tone,
            template: concept.template,
            topText: topBox?.text || concept.topText,
            bottomText: bottomBox?.text || concept.bottomText,
            caption: withCtaLine(concept.caption, effectiveCta(ctaOn, concept.callToAction)),
            hashtags: concept.hashtags,
            textBoxesJson: boxes.length > 0 ? JSON.stringify(boxes) : undefined,
            ...extra,
          },
        });
        if (!result.ok) {
          setError(result.error || "Save failed");
          return;
        }
        if (extra.toQuest && campaign && result.id) {
          const att = await attachOutputToSlot({ data: { slotId: campaign.slotId, ref: `meme:${result.id}`, text: [...boxes.map((b) => b.text), withCtaLine(concept.caption, effectiveCta(ctaOn, concept.callToAction))].join("\n") } });
          setQuestIdx(att.ok ? idx : null);
          setQuestNote(!att.ok ? att.error || "Could not save to the quest." : att.flags.length ? `⚠️ Flagged words to check before approval: ${att.flags.join(", ")}` : "Slot moved to Drafted.");
        }
        setSavedIdx(idx);
        setTimeout(() => setSavedIdx(null), 2000);
        setPlatformPickerIdx(null);
      } catch (e) {
        setError("Save failed: " + e);
      } finally {
        setSavingId(null);
      }
    },
    [selection, tone, textBoxesArr, campaign, ctaOn],
  );

  const handleToggleEdit = useCallback((idx: number) => {
    setEditingIdx((prev) => (prev === idx ? null : idx));
  }, []);

  const handleTextBoxesChange = useCallback((idx: number, boxes: TextBox[]) => {
    setTextBoxesArr((prev) => prev.map((b, i) => (i === idx ? boxes : b)));
  }, []);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[#406080]/30 bg-[#111a28] p-5 space-y-4">
        <h2 className="font-fantasy text-[#c08020] text-lg">Step 3: Forge the Memes</h2>
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
                Forging memes...
              </span>
            ) : (
              "⚒️ Generate 3 Meme Concepts"
            )}
          </button>
        </div>

        {questNote && <p className="text-xs font-fantasy text-[#e8c884]" data-quest-note>{questNote}</p>}
      {error && (
          <div className="text-center p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-300 text-sm font-fantasy">
            {error}
          </div>
        )}
      </section>

      {concepts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {concepts.map((concept, idx) => (
            <div
              key={idx}
              className="flex flex-col rounded-xl border border-[#406080]/30 bg-[#111a28] overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-[#406080]/20 bg-[#204060]/10">
                <span className="text-[#c08020] font-fantasy text-sm font-bold">🖼️ {concept.template}</span>
              </div>

              <div className="px-4 py-4 space-y-3 flex-1">
                <MemePreview
                  ref={(el) => {
                    memePreviewRefs.current[idx] = el;
                  }}
                  template={templateImages[idx] || null}
                  topText={concept.topText}
                  bottomText={concept.bottomText}
                  textBoxes={textBoxesArr[idx] || []}
                  onTextBoxesChange={(boxes) => handleTextBoxesChange(idx, boxes)}
                  interactive={editingIdx === idx}
                />
                <CtaPanel
                  compact
                  options={concept.callToActions || []}
                  value={concept.callToAction || ""}
                  on={ctaOn}
                  onSelect={(c) => selectCta(idx, c)}
                  onToggle={setCtaOn}
                  onError={setError}
                  note="The caption is saved and copied without it."
                />
                <CaptionHashtagPanel
                  compact
                  captions={concept.captions}
                  caption={concept.caption}
                  onSelectCaption={(c) => selectCaption(idx, c)}
                  hashtags={concept.hashtags}
                  onError={setError}
                  ctaLine={effectiveCta(ctaOn, concept.callToAction || "")}
                />
              </div>

              <div className="px-4 py-3 border-t border-[#406080]/20 bg-[#0d1520]/50 space-y-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleEdit(idx)}
                    className={`flex-1 px-2 py-2 rounded-lg border text-xs font-fantasy transition-all ${
                      editingIdx === idx
                        ? "bg-[#c08020]/20 border-[#c08020]/50 text-[#c08020]"
                        : "bg-[#204060]/30 border-[#406080]/30 text-[#e0e0e0] hover:bg-[#204060]/50"
                    }`}
                  >
                    {editingIdx === idx ? "💾 Done" : "✏️ Edit Text"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRegenerateOne(idx)}
                    disabled={regeneratingIdx === idx}
                    className="flex-1 px-2 py-2 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#204060]/50 transition-all text-xs font-fantasy disabled:opacity-50"
                  >
                    {regeneratingIdx === idx ? (
                      <span className="w-3 h-3 border-2 border-[#c08020] border-t-transparent rounded-full animate-spin inline-block" />
                    ) : (
                      "🔄 Redo"
                    )}
                  </button>
                </div>
                <div className="flex gap-2">
                  {campaign && (
                    <button
                      type="button"
                      onClick={() => persist(concept, idx, { isFavorite: true, toQuest: true })}
                      disabled={savingId === idx}
                      className="flex-1 px-2 py-2 rounded-lg bg-[#c08020]/15 border border-[#c08020]/40 text-[#c08020] hover:bg-[#c08020]/25 transition-all text-xs font-fantasy disabled:opacity-50"
                      data-save-to-quest
                    >
                      {questIdx === idx ? "✅ In quest" : "🗺️ Save to quest"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => persist(concept, idx, { isFavorite: true })}
                    disabled={savingId === idx}
                    className="flex-1 px-2 py-2 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#c08020]/20 hover:border-[#c08020]/50 transition-all text-xs font-fantasy disabled:opacity-50"
                  >
                    {savingId === idx ? "💾 Saving..." : savedIdx === idx ? "✅ Saved!" : "❤️ Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownload(idx, concept.template)}
                    className="flex-1 px-2 py-2 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#204060]/50 transition-all text-xs font-fantasy"
                  >
                    {downloadedIdx === idx ? "✅ Downloaded!" : "📥 Download"}
                  </button>
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setPlatformPickerIdx(platformPickerIdx === idx ? null : idx)}
                    className="w-full px-2 py-2 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#406080]/30 transition-all text-xs font-fantasy"
                  >
                    ✅ Mark Used
                  </button>
                  {platformPickerIdx === idx && (
                    <div className="absolute bottom-full left-0 right-0 mb-1 bg-[#111a28] border border-[#406080]/40 rounded-lg p-2 shadow-xl z-10">
                      <p className="text-[#a0a0a0] text-xs font-fantasy mb-1 text-center">Pick platform:</p>
                      <div className="flex flex-wrap gap-1">
                        {PLATFORMS.map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => persist(concept, idx, { platform: p, isUsed: true })}
                            className="flex-1 px-2 py-1 rounded bg-[#204060]/30 hover:bg-[#c08020]/30 text-[#e0e0e0] text-xs font-fantasy transition-colors"
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
