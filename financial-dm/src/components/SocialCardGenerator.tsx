import { useCallback, useRef, useState } from "react";
import { attachOutputToSlot } from "~/server/campaign";
import { contextOf, type CampaignBrief } from "~/lib/campaign";
import {
  generateSocialCards,
  saveSocialCards,
  type SocialCard,
  type SocialCardBatchResult,
  type SocialCardFormat,
} from "~/server/socialCardGenerator";
import type { TopicSelection } from "~/server/topics";
import { downloadCardPng, downloadAllCardsZip } from "~/lib/socialCardUtils";
import SocialCardPreview from "./SocialCardPreview";
import CardStylePicker from "./CardStylePicker";
import CaptionHashtagPanel from "~/components/generator/CaptionHashtagPanel";
import CtaPanel from "~/components/generator/CtaPanel";
import { effectiveCta, withCtaLine } from "~/lib/cta";

/**
 * Roughly what fits a 2 to 3 line clamp on a square card. Headlines longer
 * than this warn the user so they can trim before exporting a card.
 */
const HEADLINE_LIMIT = 90;

const FORMAT_OPTIONS: { id: SocialCardFormat; label: string; hint: string }[] = [
  { id: "trap", label: "🪤 Trap or Treasure", hint: "Myth vs Fact busting cards" },
  { id: "stat", label: "📊 Stat Card", hint: "One bold statistic per card" },
];

/**
 * Social card forge. Topics (up to three, each with its own pain point),
 * tone, and D&D flavor come from the shared picker in the parent; this
 * component owns the format, the cards, and the batch caption/hashtags.
 */
export default function SocialCardGenerator({
  selections,
  tone,
  dndThemed,
  campaign,
}: {
  selections: TopicSelection[];
  tone: string;
  dndThemed: boolean;
  /** A Quest Board brief. Optional: without it the forge works exactly as before. */
  campaign?: CampaignBrief;
}) {
  const [questState, setQuestState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [questNote, setQuestNote] = useState("");
  const [format, setFormat] = useState<SocialCardFormat>("trap");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [batch, setBatch] = useState<SocialCardBatchResult | null>(null);
  const [themeBackground, setThemeBackground] = useState<string | undefined>(undefined);
  const [themeBorder, setThemeBorder] = useState<string | undefined>(undefined);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [showRawText, setShowRawText] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [dlProgress, setDlProgress] = useState<{ done: number; total: number } | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  /** Whether the call to action goes out at all, and whether it also gets its own card at the end. John's choices stick across forges. */
  const [ctaOn, setCtaOn] = useState(true);
  const [ctaCardOn, setCtaCardOn] = useState(false);
  const cta = effectiveCta(ctaOn, batch?.callToAction ?? "");
  const ctaIdx = batch ? (batch.callToActions || []).indexOf(batch.callToAction) : -1;
  const ctaCard = ctaOn && ctaCardOn && batch && ctaIdx >= 0 ? batch.ctaCards?.[ctaIdx] ?? null : null;
  /** Everything that renders, exports, and saves: the content cards plus the call to action card when it is on. */
  const cards = batch ? (ctaCard ? [...batch.cards, ctaCard] : batch.cards) : [];
  /** The caption that gets saved: the chosen caption with the call to action after it. */
  const savedCaption = batch ? withCtaLine(batch.caption, cta) : "";

  const handleGenerate = useCallback(async () => {
    if (selections.length === 0) {
      setError("Select at least one topic to forge a card.");
      return;
    }
    setLoading(true);
    setError("");
    setBatch(null);
    setEditingIdx(null);
    setSaved(false);
    try {
      const res = await generateSocialCards({
        data: { format, tone, dndThemed, topics: selections.slice(0, 3), campaign: campaign ? contextOf(campaign) : undefined },
      });
      setQuestState("idle");
      setQuestNote("");
      if (!res || res.cards.length === 0) {
        setError(
          "The card generator could not reach the AI service right now. Please check that the API key is set and try again.",
        );
        return;
      }
      setBatch(res);
    } catch {
      setError("Failed to generate the cards. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [selections, format, tone, dndThemed, campaign]);

  const updateCard = useCallback(
    (idx: number, patch: Partial<SocialCard>) => {
      setBatch((b) => {
        if (!b) return b;
        // Past the content cards sits the call to action card; edits land on the chosen option's card.
        if (idx >= b.cards.length) return ctaIdx >= 0 ? { ...b, ctaCards: b.ctaCards.map((card, i) => (i === ctaIdx ? { ...card, ...patch } : card)) } : b;
        return { ...b, cards: b.cards.map((card, i) => (i === idx ? { ...card, ...patch } : card)) };
      });
    },
    [ctaIdx],
  );

  const selectCta = useCallback((callToAction: string) => {
    setBatch((b) => (b ? { ...b, callToAction } : b));
    setSaved(false);
  }, []);

  const selectCaption = useCallback((caption: string) => {
    setBatch((b) => (b ? { ...b, caption } : b));
    setSaved(false);
  }, []);

  const handleSaveToQuest = useCallback(async () => {
    if (!batch || batch.cards.length === 0 || !campaign) return;
    setQuestState("saving");
    setQuestNote("");
    try {
      const res = await saveSocialCards({ data: { format, tone, dndThemed, caption: savedCaption, hashtags: batch.hashtags, cards, themeBackground, themeBorder } });
      if (!res.ok || !res.id) {
        setQuestState("error");
        setQuestNote(res.error || "Could not save the cards.");
        return;
      }
      const text = [...cards.flatMap((c) => [c.headline, c.body, c.punchline]), savedCaption].join("\n");
      const att = await attachOutputToSlot({ data: { slotId: campaign.slotId, ref: `cards:${res.id}`, text } });
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
  }, [batch, cards, savedCaption, campaign, format, tone, dndThemed, themeBackground, themeBorder]);

  const handleSave = useCallback(async () => {
    if (!batch || batch.cards.length === 0) return;
    setSaving(true);
    setError("");
    try {
      const res = await saveSocialCards({
        data: {
          format,
          tone,
          dndThemed,
          caption: savedCaption,
          hashtags: batch.hashtags,
          cards,
          themeBackground,
          themeBorder,
        },
      });
      if (!res.ok) {
        setError(res.error || "Could not save the cards.");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Could not save the cards.");
    } finally {
      setSaving(false);
    }
  }, [batch, cards, savedCaption, format, tone, dndThemed, themeBackground, themeBorder]);

  const handleDownloadCard = useCallback(
    async (idx: number) => {
      const ref = cardRefs.current[idx];
      if (!ref) return;
      try {
        await downloadCardPng(ref, `card-${idx + 1}`, format);
      } catch {
        setError("Could not download that card. Please try again.");
      }
    },
    [format],
  );

  const handleDownloadAll = useCallback(async () => {
    if (cards.length === 0) return;
    setDownloading(true);
    setDlProgress({ done: 0, total: cards.length });
    setError("");
    try {
      const items = cardRefs.current
        .map((ref, i) => (ref ? { el: ref as HTMLElement, label: String(i + 1) } : null))
        .filter((x): x is { el: HTMLElement; label: string } => x !== null);
      await downloadAllCardsZip(format, items, (done) => setDlProgress({ done, total: items.length }));
    } catch {
      setError("Could not package the cards into a zip. Please try again.");
    } finally {
      setDownloading(false);
      setDlProgress(null);
    }
  }, [cards, format]);

  return (
    <div className="space-y-6">
      {/* Format toggle */}
      <section className="rounded-xl border border-[#406080]/30 bg-[#111a28] p-5 space-y-4">
        <h2 className="font-fantasy text-[#c08020] text-lg">Step 3: Choose the Card Format</h2>
        <div className="flex flex-wrap gap-2 justify-center">
          {FORMAT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setFormat(opt.id)}
              aria-pressed={format === opt.id}
              className={`px-4 py-3 rounded-lg font-fantasy text-sm transition-all border ${
                format === opt.id
                  ? "bg-[#c08020] text-[#0d1520] border-[#c08020] shadow-lg shadow-[#c08020]/20"
                  : "bg-[#111a28] text-[#a0a0a0] border-[#406080]/40 hover:border-[#c08020]/50 hover:text-[#e0e0e0]"
              }`}
            >
              <span className="block font-bold">{opt.label}</span>
              <span className={`block text-[10px] ${format === opt.id ? "text-[#0d1520]/80" : "text-[#606080]"}`}>
                {opt.hint}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Forge */}
      <section className="rounded-xl border border-[#406080]/30 bg-[#111a28] p-5 space-y-4">
        <h2 className="font-fantasy text-[#c08020] text-lg">Step 4: Forge the Cards</h2>
        <p className="text-center text-[#606080] text-xs font-fantasy">
          {selections.length === 0
            ? "Tap up to three topics above. Each selected topic becomes one card."
            : `${selections.length} card${selections.length > 1 ? "s" : ""}: ${selections
                .map((s) => s.topic)
                .join(", ")} · Tone: ${tone}${dndThemed ? " · 🛡️ D&D" : ""}`}
        </p>
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading || selections.length === 0}
            className="px-8 py-4 rounded-lg bg-[#c08020] hover:bg-[#a06a18] disabled:bg-[#406080]/30 disabled:text-[#606080] text-[#0d1520] font-bold text-lg shadow-xl shadow-[#c08020]/20 transition-all font-fantasy tracking-wider"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-3 border-[#0d1520] border-t-transparent rounded-full animate-spin" />
                Forging {selections.length} card{selections.length > 1 ? "s" : ""}...
              </span>
            ) : (
              "🎲 Forge Cards"
            )}
          </button>
        </div>
        {error && (
          <div className="text-center p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-300 text-sm font-fantasy">
            {error}
          </div>
        )}

      </section>

      {/* Cards grid */}
      {batch && cards.length > 0 && (
        <section className="space-y-5">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <h2 className="font-fantasy text-[#c08020] text-lg">Your Cards</h2>
            <div className="flex flex-wrap gap-2">
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
                {saving ? "💾 Saving..." : saved ? "✅ Saved!" : "💾 Save to Library"}
              </button>
              {questNote && <p className={`w-full text-xs font-fantasy ${questState === "error" ? "text-red-300" : "text-[#e8c884]"}`} data-quest-note>{questNote}</p>}
              <button
                type="button"
                onClick={handleDownloadAll}
                disabled={downloading}
                className="shrink-0 px-4 py-2 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#204060]/50 transition-all text-sm font-fantasy disabled:opacity-50"
              >
                {downloading
                  ? `⏳ Packaging ${dlProgress?.done ?? 0} of ${dlProgress?.total ?? 0}...`
                  : "⬇️ Download All (.zip)"}
              </button>
            </div>
          </div>


          {/* Style pickers sit right above the cards they change */}
          <CardStylePicker themeBackground={themeBackground} themeBorder={themeBorder} onBackground={setThemeBackground} onBorder={setThemeBorder} />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {cards.map((card, idx) => {
              const isEditing = editingIdx === idx;
              const isCta = idx >= (batch?.cards.length ?? 0);
              return (
                <div key={idx} className="space-y-2" data-card-slot={isCta ? "cta" : "content"}>
                  <SocialCardPreview
                    card={card}
                    themeBackground={themeBackground}
                    themeBorder={themeBorder}
                    refEl={(el) => {
                      cardRefs.current[idx] = el;
                    }}
                    className={isEditing ? "ring-2 ring-[#c08020]" : "opacity-95 hover:opacity-100"}
                  />
                  {card.painPoint && (
                    <p className="text-center text-[#606080] text-[11px] font-fantasy">🎯 {card.painPoint}</p>
                  )}
                  {isCta && <p className="text-center text-[#e8c884] text-[11px] font-fantasy">🎯 Call to action card</p>}
                  <div className="flex justify-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setEditingIdx(isEditing ? null : idx)}
                      className={`shrink-0 px-3 py-1.5 rounded-lg border transition-all text-xs font-fantasy ${
                        isEditing
                          ? "bg-[#c08020] border-[#c08020] text-[#0d1520] font-bold"
                          : "bg-[#204060]/30 border-[#406080]/30 text-[#e0e0e0] hover:bg-[#c08020]/20 hover:border-[#c08020]/50"
                      }`}
                    >
                      {isEditing ? "✅ Done" : "✏️ Edit"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadCard(idx)}
                      className="shrink-0 px-3 py-1.5 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#204060]/50 transition-all text-xs font-fantasy"
                    >
                      ⬇️ PNG Card {idx + 1}
                    </button>
                  </div>
                  {isEditing && (
                    <div className="space-y-2 p-3 rounded-lg bg-[#0d1520]/60 border border-[#406080]/30">
                      <label className="block">
                        <span className="text-[#e0b45a] text-xs font-fantasy">
                          {isCta ? "Invitation (Headline)" : card.format === "trap" ? "Myth (Trap)" : "Stat (Headline)"}
                        </span>
                        <textarea
                          value={card.headline}
                          onChange={(e) => updateCard(idx, { headline: e.target.value })}
                          rows={2}
                          className="mt-1 w-full bg-[#111a28] border border-[#406080]/40 rounded-md p-2 text-sm text-[#e0e0e0] font-fantasy focus:outline-none focus:border-[#c08020]"
                        />
                        <span
                          className={`mt-1 block text-[10px] font-fantasy ${
                            (card.headline || "").length > HEADLINE_LIMIT ? "text-red-300" : "text-[#606080]"
                          }`}
                        >
                          {`${(card.headline || "").length} of ${HEADLINE_LIMIT} characters`}
                          {(card.headline || "").length > HEADLINE_LIMIT
                            ? "  ·  That headline is long and may clip on a square card. Trim it for a clean look."
                            : ""}
                        </span>
                      </label>
                      <label className="block">
                        <span className="text-[#e0b45a] text-xs font-fantasy">
                          {isCta ? "Call to Action" : card.format === "trap" ? "Truth (Treasure)" : "Supporting Line"}
                        </span>
                        <textarea
                          value={card.body}
                          onChange={(e) => updateCard(idx, { body: e.target.value })}
                          rows={2}
                          className="mt-1 w-full bg-[#111a28] border border-[#406080]/40 rounded-md p-2 text-sm text-[#e0e0e0] font-fantasy focus:outline-none focus:border-[#c08020]"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[#e0b45a] text-xs font-fantasy">Kicker / Punchline</span>
                        <textarea
                          value={card.punchline}
                          onChange={(e) => updateCard(idx, { punchline: e.target.value })}
                          rows={1}
                          className="mt-1 w-full bg-[#111a28] border border-[#406080]/40 rounded-md p-2 text-sm text-[#e0e0e0] font-fantasy focus:outline-none focus:border-[#c08020]"
                        />
                      </label>

                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setShowRawText((v) => !v)}
                          className="px-3 py-1.5 rounded-lg border border-[#406080]/40 text-xs font-fantasy text-[#a0a0a0] bg-[#111a28] hover:border-[#c08020]/50 hover:text-[#e0e0e0] transition-all"
                        >
                          {showRawText ? "🙈 Hide raw text" : "🔍 View raw text"}
                        </button>
                        {showRawText && (
                          <div className="mt-2 space-y-2 rounded-md bg-[#0d1520] border border-[#406080]/40 p-3">
                            {(
                              [
                                [card.format === "trap" ? "Myth / Headline" : "Headline", card.headline],
                                [card.format === "trap" ? "Fact / Body" : "Body", card.body],
                                ["Punchline", card.punchline],
                              ] as const
                            ).map(([label, value]) => (
                              <div key={label}>
                                <span className="text-[#e0b45a] text-[10px] font-fantasy uppercase tracking-wider">
                                  {label}
                                </span>
                                <p className="text-[#f0e6d0] text-sm whitespace-pre-wrap break-words">
                                  {value || "(empty)"}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <CtaPanel
            options={batch.callToActions || []}
            value={batch.callToAction}
            on={ctaOn}
            onSelect={selectCta}
            onToggle={(on) => {
              setCtaOn(on);
              setSaved(false);
            }}
            onError={setError}
            note="The caption goes out without it and there is no call to action card."
          >
            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  if (!ctaOn) setCtaOn(true);
                  setCtaCardOn((v) => !(ctaOn && v));
                  setEditingIdx(null);
                  setSaved(false);
                }}
                aria-pressed={ctaOn && ctaCardOn}
                data-cta-card
                className={`px-3 py-1.5 rounded-lg border text-xs font-fantasy transition-all ${
                  ctaOn && ctaCardOn
                    ? "border-[#c08020] bg-[#c08020]/15 text-[#c08020]"
                    : "border-[#406080]/40 bg-[#0d1520]/40 text-[#a0a0a0] hover:border-[#c08020]/50 hover:text-[#e0e0e0]"
                }`}
              >
                {ctaOn && ctaCardOn ? "✅ Call to action card added at the end" : "○ Add a call to action card at the end"}
              </button>
              <p className="text-[#606080] text-xs font-fantasy mt-1">The card takes the chosen call to action, shows above with the same style, and exports and saves with the batch.</p>
            </div>
          </CtaPanel>

          <CaptionHashtagPanel
            captions={batch.captions}
            caption={batch.caption}
            onSelectCaption={selectCaption}
            hashtags={batch.hashtags}
            onError={setError}
            ctaLine={cta}
          />
        </section>
      )}
    </div>
  );
}
