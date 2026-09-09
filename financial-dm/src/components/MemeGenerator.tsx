import { useState, useCallback, useRef } from "react";
import type { MemeConcept, MemeTemplate } from "~/server/memeGenerator";
import {
  getRandomFact,
  generateMemeConcepts,
  saveConcept,
  findTemplateImage,
} from "~/server/memeGenerator";
import MemePreview from "~/components/MemePreview";
import type { TextBox } from "~/components/MemePreview";

const CATEGORIES = [
  "Term Life Insurance",
  "Investments",
  "Getting Out of Debt",
  "Financial Freedom",
];

const PLATFORMS = ["TikTok", "Instagram", "Facebook", "LinkedIn"];

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

export default function MemeGenerator() {
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [fact, setFact] = useState("");
  const [customFact, setCustomFact] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [concepts, setConcepts] = useState<MemeConcept[]>([]);
  const [templateImages, setTemplateImages] = useState<(MemeTemplate | null)[]>(
    [],
  );
  const [textBoxesArr, setTextBoxesArr] = useState<TextBox[][]>([]);
  const [loading, setLoading] = useState(false);
  const [pullingFact, setPullingFact] = useState(false);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [regeneratingIdx, setRegeneratingIdx] = useState<number | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [downloadedIdx, setDownloadedIdx] = useState<number | null>(null);
  const [platformPickerIdx, setPlatformPickerIdx] = useState<number | null>(
    null,
  );
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  // Refs for meme preview containers (for html2canvas capture)
  const memePreviewRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handlePullFact = useCallback(async () => {
    setPullingFact(true);
    setError("");
    setIsCustom(false);
    try {
      const result = await getRandomFact({ data: { category: selectedCategory } });
      setFact(result);
    } catch (e) {
      setError("Failed to pull a fact. Try again!");
    } finally {
      setPullingFact(false);
    }
  }, [selectedCategory]);

  const handleGenerate = useCallback(async () => {
    const factToUse = isCustom ? customFact.trim() : fact;
    if (!factToUse) {
      setError("Pull a fact or write your own first!");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await generateMemeConcepts({ data: { fact: factToUse } });
      if (result.length === 0) {
        setError(
          "The API returned no concepts. Check the server log or try again.",
        );
      }
      setConcepts(result);

      // Initialize textBoxes from Claude's topText/bottomText
      const initialBoxesArr = result.map((c) => {
        const boxes: TextBox[] = [];
        if (c.topText) {
          boxes.push(makeTextBox(crypto.randomUUID(), c.topText, 50, 8, true));
        }
        if (c.bottomText) {
          boxes.push(makeTextBox(crypto.randomUUID(), c.bottomText, 50, 85, true));
        }
        return boxes;
      });
      setTextBoxesArr(initialBoxesArr);

      // Fetch matching template images for each concept
      const images = await Promise.all(
        result.map((c) =>
          findTemplateImage({ data: { templateName: c.template } }),
        ),
      );
      setTemplateImages(images);
    } catch (e) {
      setError("Failed to generate concepts. Check the API key and try again.");
    } finally {
      setLoading(false);
    }
  }, [fact, customFact, isCustom]);

  const handleRegenerateOne = useCallback(
    async (idx: number) => {
      const factToUse = isCustom ? customFact.trim() : fact;
      if (!factToUse) return;
      setRegeneratingIdx(idx);
      try {
        const result = await generateMemeConcepts({ data: { fact: factToUse } });
        if (result.length > 0) {
          const newConcept = result[idx] || result[0];
          setConcepts((prev) => {
            const next = [...prev];
            next[idx] = newConcept;
            return next;
          });

          // Initialize textBoxes for this regenerated concept
          const boxes: TextBox[] = [];
          if (newConcept.topText) {
            boxes.push(makeTextBox(crypto.randomUUID(), newConcept.topText, 50, 8, true));
          }
          if (newConcept.bottomText) {
            boxes.push(makeTextBox(crypto.randomUUID(), newConcept.bottomText, 50, 85, true));
          }
          setTextBoxesArr((prev) => {
            const next = [...prev];
            next[idx] = boxes;
            return next;
          });

          // Fetch template image for the new concept
          const img = await findTemplateImage({
            data: { templateName: newConcept.template },
          });
          setTemplateImages((prev) => {
            const next = [...prev];
            next[idx] = img;
            return next;
          });
        }
      } catch {
        // ignore
      } finally {
        setRegeneratingIdx(null);
      }
    },
    [fact, customFact, isCustom],
  );

  const handleCopyCaption = useCallback((caption: string, idx: number) => {
    navigator.clipboard.writeText(caption).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    });
  }, []);

  const handleDownload = useCallback(async (idx: number, templateName: string) => {
    const ref = memePreviewRefs.current[idx];
    if (!ref) return;

    try {
      // html-to-image uses SVG foreignObject, the browser's own renderer,
      // so it handles oklch(), object-fit, and layout naturally.
      const { toPng } = await import("html-to-image");

      const rect = ref.getBoundingClientRect();
      const dataUrl = await toPng(ref, {
        width: rect.width * 2,
        height: rect.height * 2,
        pixelRatio: 1,
        cacheBust: true,
      });

      // Convert data URL to blob for download
      const res = await fetch(dataUrl);
      const blob = await res.blob();

      const filename = slugify(templateName) + "-meme.png";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = filename;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      setDownloadedIdx(idx);
      setTimeout(() => setDownloadedIdx(null), 2000);
    } catch (e) {
      setError("Download failed: " + e);
    }
  }, []);

  const handleSave = useCallback(
    async (concept: MemeConcept, idx: number) => {
      setSavingId(idx);
      try {
        const boxes = textBoxesArr[idx] || [];
        // Derive top/bottom text from boxes with showBackground for backward compat
        const topBox = boxes.find((b) => b.showBackground && b.y < 50);
        const bottomBox = boxes.find((b) => b.showBackground && b.y >= 50);
        const result = await saveConcept({
          data: {
            fact: isCustom ? customFact.trim() : fact,
            category: isCustom ? "Custom" : selectedCategory,
            template: concept.template,
            topText: topBox?.text || concept.topText,
            bottomText: bottomBox?.text || concept.bottomText,
            caption: concept.caption,
            isFavorite: true,
            textBoxesJson: boxes.length > 0 ? JSON.stringify(boxes) : undefined,
          },
        });
        if (!result.ok) {
          setError(result.error || "Save failed");
          return;
        }
      } catch (e) {
        setError("Save failed: " + e);
      } finally {
        setSavingId(null);
      }
    },
    [fact, customFact, isCustom, selectedCategory, textBoxesArr],
  );

  const handleMarkUsed = useCallback(
    async (concept: MemeConcept, platform: string, idx: number) => {
      setSavingId(idx);
      try {
        const boxes = textBoxesArr[idx] || [];
        const topBox = boxes.find((b) => b.showBackground && b.y < 50);
        const bottomBox = boxes.find((b) => b.showBackground && b.y >= 50);
        const result = await saveConcept({
          data: {
            fact: isCustom ? customFact.trim() : fact,
            category: isCustom ? "Custom" : selectedCategory,
            template: concept.template,
            topText: topBox?.text || concept.topText,
            bottomText: bottomBox?.text || concept.bottomText,
            caption: concept.caption,
            platform,
            isUsed: true,
            textBoxesJson: boxes.length > 0 ? JSON.stringify(boxes) : undefined,
          },
        });
        if (!result.ok) {
          setError(result.error || "Save failed");
          return;
        }
        setPlatformPickerIdx(null);
      } catch (e) {
        setError("Save failed: " + e);
      } finally {
        setSavingId(null);
      }
    },
    [fact, customFact, isCustom, selectedCategory, textBoxesArr],
  );

  const handleToggleEdit = useCallback((idx: number) => {
    setEditingIdx((prev) => (prev === idx ? null : idx));
  }, []);

  const handleTextBoxesChange = useCallback(
    (idx: number, boxes: TextBox[]) => {
      setTextBoxesArr((prev) => {
        const next = [...prev];
        next[idx] = boxes;
        return next;
      });
    },
    [],
  );

  return (
    <div className="space-y-6">
      {/* Category Selector */}
      <div className="flex flex-wrap gap-2 justify-center">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setSelectedCategory(cat);
              setFact("");
              setConcepts([]);
              setTemplateImages([]);
              setTextBoxesArr([]);
            }}
            className={`px-4 py-2 rounded-lg font-fantasy text-sm transition-all border ${
              selectedCategory === cat
                ? "bg-[#c08020] text-[#0d1520] border-[#c08020] shadow-lg shadow-[#c08020]/20"
                : "bg-[#111a28] text-[#a0a0a0] border-[#406080]/40 hover:border-[#c08020]/50 hover:text-[#e0e0e0]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Fact Source */}
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={handlePullFact}
          disabled={pullingFact}
          className="px-6 py-3 rounded-lg bg-[#204060]/40 border border-[#406080]/50 text-[#e0e0e0] hover:bg-[#204060]/60 transition-all font-fantasy text-lg disabled:opacity-50"
        >
          {pullingFact ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-[#c08020] border-t-transparent rounded-full animate-spin" />
              Scrying the scrolls...
            </span>
          ) : (
            "📜 Pull Random Fact"
          )}
        </button>

        {fact && !isCustom && (
          <div className="w-full max-w-2xl p-4 rounded-xl border border-[#c08020]/30 bg-[#c08020]/5 text-[#e0e0e0] text-sm font-fantasy relative">
            <p className="pr-20 leading-relaxed">{fact}</p>
            <button
              onClick={() => {
                setIsCustom(true);
                setCustomFact(fact);
              }}
              className="absolute top-2 right-2 text-xs text-[#a0a0a0] hover:text-[#c08020] transition-colors"
              title="Edit this fact"
            >
              ✏️ Edit
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 w-full max-w-2xl">
          <span className="text-[#606080] text-xs font-fantasy">or</span>
        </div>

        <textarea
          value={customFact}
          onChange={(e) => {
            setCustomFact(e.target.value);
            setIsCustom(true);
          }}
          placeholder="Type your own financial fact or D&D themed insurance wisdom..."
          rows={3}
          className="w-full max-w-2xl p-4 rounded-xl border border-[#406080]/40 bg-[#111a28] text-[#e0e0e0] placeholder-[#606080] font-fantasy text-sm resize-none focus:outline-none focus:border-[#c08020]/50 transition-colors"
        />
      </div>

      {/* Generate Button */}
      <div className="flex justify-center">
        <button
          onClick={handleGenerate}
          disabled={loading || (!fact && !customFact.trim())}
          className="px-8 py-4 rounded-lg bg-[#c08020] hover:bg-[#a06a18] disabled:bg-[#406080]/30 disabled:text-[#606080] text-[#0d1520] font-bold text-lg shadow-xl shadow-[#c08020]/20 transition-all font-fantasy tracking-wider"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-5 h-5 border-3 border-[#0d1520] border-t-transparent rounded-full animate-spin" />
              Forging memes...
            </span>
          ) : (
            "⚒️ Generate Meme Concepts"
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="text-center p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-300 text-sm font-fantasy">
          {error}
        </div>
      )}

      {/* Results */}
      {concepts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {concepts.map((concept, idx) => (
            <div
              key={idx}
              className="flex flex-col rounded-xl border border-[#406080]/30 bg-[#111a28] overflow-hidden"
            >
              {/* Meme template name */}
              <div className="px-4 py-3 border-b border-[#406080]/20 bg-[#204060]/10">
                <span className="text-[#c08020] font-fantasy text-sm font-bold">
                  🖼️ {concept.template}
                </span>
              </div>

              {/* Meme text preview */}
              <div className="px-4 py-4 space-y-2 flex-1">
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

                {/* Caption */}
                <p className="text-[#a0a0a0] text-xs leading-relaxed pt-2 font-fantasy">
                  {concept.caption}
                </p>
              </div>

              {/* Action buttons */}
              <div className="px-4 py-3 border-t border-[#406080]/20 bg-[#0d1520]/50 space-y-2">
                {/* Edit text toggle */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleEdit(idx)}
                    className={`flex-1 px-2 py-2 rounded-lg border text-xs font-fantasy transition-all ${
                      editingIdx === idx
                        ? "bg-[#c08020]/20 border-[#c08020]/50 text-[#c08020]"
                        : "bg-[#204060]/30 border-[#406080]/30 text-[#e0e0e0] hover:bg-[#204060]/50"
                    }`}
                  >
                    {editingIdx === idx ? "💾 Done" : "✏️ Edit Text"}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopyCaption(concept.caption, idx)}
                    className="flex-1 px-2 py-2 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#204060]/50 transition-all text-xs font-fantasy"
                  >
                    {copiedIdx === idx ? "✅ Copied!" : "📋 Copy"}
                  </button>
                  <button
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
                  <button
                    onClick={() => handleSave(concept, idx)}
                    disabled={savingId === idx}
                    className="flex-1 px-2 py-2 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#c08020]/20 hover:border-[#c08020]/50 transition-all text-xs font-fantasy disabled:opacity-50"
                  >
                    {savingId === idx ? "💾 Saving..." : "❤️ Save"}
                  </button>
                  <button
                    onClick={() => handleDownload(idx, concept.template)}
                    className="flex-1 px-2 py-2 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#204060]/50 transition-all text-xs font-fantasy"
                  >
                    {downloadedIdx === idx ? "✅ Downloaded!" : "📥 Download"}
                  </button>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <button
                      onClick={() =>
                        setPlatformPickerIdx(
                          platformPickerIdx === idx ? null : idx,
                        )
                      }
                      className="w-full px-2 py-2 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#406080]/30 transition-all text-xs font-fantasy"
                    >
                      ✅ Mark Used
                    </button>
                    {platformPickerIdx === idx && (
                      <div className="absolute bottom-full left-0 right-0 mb-1 bg-[#111a28] border border-[#406080]/40 rounded-lg p-2 shadow-xl z-10">
                        <p className="text-[#a0a0a0] text-xs font-fantasy mb-1 text-center">
                          Pick platform:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {PLATFORMS.map((p) => (
                            <button
                              key={p}
                              onClick={() => handleMarkUsed(concept, p, idx)}
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
