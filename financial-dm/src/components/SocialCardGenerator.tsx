import { useCallback, useRef, useState } from "react";
import {
  getRandomSocialTopics,
  generateSocialCards,
  saveSocialCards,
  type SocialCard,
  type SocialCardFormat,
  type TopicPick,
} from "~/server/socialCardGenerator";
import { downloadCardPng, downloadAllCardsZip } from "~/lib/socialCardUtils";
import {
  THEME_BACKGROUNDS,
  THEME_BORDERS,
} from "~/lib/slideEditor";
import SocialCardPreview from "./SocialCardPreview";

const TONES = ["Mix / Surprise Me", "Informative", "Warm", "Funny"];

/**
 * Roughly what fits a 2 to 3 line clamp on a square card. Headlines longer
 * than this warn the user so they can trim before generating a card.
 */
const HEADLINE_LIMIT = 90;

const FORMAT_OPTIONS: { id: SocialCardFormat; label: string; hint: string }[] = [
  {
    id: "trap",
    label: "🪤 Trap or Treasure",
    hint: "Myth vs Fact busting cards",
  },
  { id: "stat", label: "📊 Stat Card", hint: "One bold statistic per card" },
];

export default function SocialCardGenerator() {
  const [format, setFormat] = useState<SocialCardFormat>("trap");
  const [tone, setTone] = useState("Mix / Surprise Me");
  const [dndThemed, setDndThemed] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [loading, setLoading] = useState(false);
  const [topicOptions, setTopicOptions] = useState<TopicPick[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState("");
  const [cards, setCards] = useState<SocialCard[]>([]);
  const [themeBackground, setThemeBackground] = useState<string | undefined>(
    undefined,
  );
  const [themeBorder, setThemeBorder] = useState<string | undefined>(undefined);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [showRawText, setShowRawText] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [dlProgress, setDlProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleRollTopic = useCallback(async () => {
    setRolling(true);
    setError("");
    setCards([]);
    setEditingIdx(null);
    try {
      const picks = await getRandomSocialTopics();
      setTopicOptions(picks);
      setSelected(new Set(picks.map((_, i) => i)));
    } catch {
      setError("Could not roll the topics. Please try again.");
    } finally {
      setRolling(false);
    }
  }, []);

  const toggleSelect = useCallback((idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  const handleGenerate = useCallback(async () => {
    const topics = topicOptions.filter((_, i) => selected.has(i));
    if (topics.length === 0) {
      setError("Select at least one topic to forge a card.");
      return;
    }
    setLoading(true);
    setError("");
    setCards([]);
    setEditingIdx(null);
    try {
      const res = await generateSocialCards({
        data: { format, tone, dndThemed, topics },
      });
      if (!res || res.length === 0) {
        setError(
          "The card generator could not reach the AI service right now. Please check that the API key is set and try again.",
        );
        return;
      }
      setCards(res);
    } catch {
      setError("Failed to generate the cards. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [topicOptions, selected, format, tone, dndThemed]);

  const updateCard = useCallback(
    (idx: number, patch: Partial<SocialCard>) => {
      setCards((c) => c.map((card, i) => (i === idx ? { ...card, ...patch } : card)));
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (cards.length === 0) return;
    setSaving(true);
    setError("");
    try {
      const res = await saveSocialCards({
        data: { format, tone, dndThemed, cards },
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
  }, [cards, format, tone, dndThemed]);

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
        .map((ref, i) => (ref ? { el: ref, label: String(i + 1) } : null))
        .filter((x): x is { el: HTMLElement; label: string } => x !== null);
      await downloadAllCardsZip(format, items, (done) =>
        setDlProgress({ done, total: items.length }),
      );
    } catch {
      setError("Could not package the cards into a zip. Please try again.");
    } finally {
      setDownloading(false);
      setDlProgress(null);
    }
  }, [cards, format]);

  const selectedTopics = topicOptions.filter((_, i) => selected.has(i));

  return (
    <div className="space-y-6">
      {/* ── Format toggle ── */}
      <section className="rounded-xl border border-[#406080]/30 bg-[#111a28] p-5 space-y-4">
        <h2 className="font-fantasy text-[#c08020] text-lg">Step 1: Choose the Card Format</h2>
        <div className="flex flex-wrap gap-2 justify-center">
          {FORMAT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setFormat(opt.id)}
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

      {/* ── Step 2: Roll topics ── */}
      <section className="rounded-xl border border-[#406080]/30 bg-[#111a28] p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-fantasy text-[#c08020] text-lg">Step 2: Roll the Topics</h2>
          <button
            onClick={handleRollTopic}
            disabled={rolling}
            className="px-4 py-2 rounded-lg bg-[#204060]/30 border border-[#406080]/40 text-[#e0e0e0] hover:bg-[#204060]/50 transition-all text-sm font-fantasy disabled:opacity-50"
          >
            {rolling ? "Rolling the dice..." : "🎲 Roll 3 Topics"}
          </button>
        </div>
        {topicOptions.length === 0 && !rolling ? (
          <p className="text-[#a0a0a0] text-sm font-fantasy text-center">
            Roll the topics first, then tap to pick which ones to forge.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 justify-center">
            {topicOptions.map((t, i) => (
              <button
                key={i}
                onClick={() => toggleSelect(i)}
                className={`px-4 py-2 rounded-lg border text-sm transition-all font-fantasy text-left ${
                  selected.has(i)
                    ? "bg-[#c08020]/20 border-[#c08020]/50 text-[#e0e0e0]"
                    : "bg-[#204060]/30 border-[#406080]/30 text-[#a0a0a0] hover:border-[#c08020]/50"
                }`}
              >
                <span className="block text-[10px] text-[#e0b45a] uppercase tracking-wider">
                  {t.topic}
                </span>
                <span className="block text-xs mt-1 max-w-[220px]">{t.fact}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ── Step 3: Tone + D&D toggle ── */}
      <section className="rounded-xl border border-[#406080]/30 bg-[#111a28] p-5 space-y-4">
        <h2 className="font-fantasy text-[#c08020] text-lg">Step 3: Set the Tone</h2>
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
        <div className="flex items-center justify-center gap-3">
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
          D&D framing is off by default. Turn it on only if you want light
          fantasy wording on the cards.
        </p>
      </section>

      {/* ── Step 4: Forge ── */}
      <section className="rounded-xl border border-[#406080]/30 bg-[#111a28] p-5 space-y-4">
        <h2 className="font-fantasy text-[#c08020] text-lg">Step 4: Forge the Cards</h2>
        <div className="flex justify-center">
          <button
            onClick={handleGenerate}
            disabled={loading || selectedTopics.length === 0}
            className="px-8 py-4 rounded-lg bg-[#c08020] hover:bg-[#a06a18] disabled:bg-[#406080]/30 disabled:text-[#606080] text-[#0d1520] font-bold text-lg shadow-xl shadow-[#c08020]/20 transition-all font-fantasy tracking-wider"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-3 border-[#0d1520] border-t-transparent rounded-full animate-spin" />
                Forging {selectedTopics.length} card{selectedTopics.length > 1 ? "s" : ""}...
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

        {/* Theme backdrop picker */}
        {cards.length > 0 && (
          <div className="space-y-3 pt-2">
            <div>
              <p className="text-[#c08020] font-fantasy text-sm mb-2">
                🖼️ Card Backdrop
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  onClick={() => setThemeBackground(undefined)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-fantasy border ${
                    !themeBackground
                      ? "bg-[#c08020] text-[#0d1520] border-[#c08020]"
                      : "bg-[#204060]/30 border-[#406080]/30 text-[#a0a0a0] hover:border-[#c08020]/50"
                  }`}
                >
                  Classic
                </button>
                {THEME_BACKGROUNDS.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setThemeBackground(b.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-fantasy border ${
                      themeBackground === b.id
                        ? "bg-[#c08020] text-[#0d1520] border-[#c08020]"
                        : "bg-[#204060]/30 border-[#406080]/30 text-[#a0a0a0] hover:border-[#c08020]/50"
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[#c08020] font-fantasy text-sm mb-2">
                🪞 Border Frame
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  onClick={() => setThemeBorder(undefined)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-fantasy border ${
                    !themeBorder
                      ? "bg-[#c08020] text-[#0d1520] border-[#c08020]"
                      : "bg-[#204060]/30 border-[#406080]/30 text-[#a0a0a0] hover:border-[#c08020]/50"
                  }`}
                >
                  None
                </button>
                {THEME_BORDERS.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setThemeBorder(b.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-fantasy border ${
                      themeBorder === b.id
                        ? "bg-[#c08020] text-[#0d1520] border-[#c08020]"
                        : "bg-[#204060]/30 border-[#406080]/30 text-[#a0a0a0] hover:border-[#c08020]/50"
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-center text-[#606080] text-xs font-fantasy">
              Backdrop and border apply to every card in this batch and show up
              in the PNG export.
            </p>
          </div>
        )}
      </section>

      {/* ── Cards grid ── */}
      {cards.length > 0 && (
        <section className="space-y-5">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <h2 className="font-fantasy text-[#c08020] text-lg">Your Cards</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="shrink-0 px-4 py-2 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#c08020]/20 hover:border-[#c08020]/50 transition-all text-sm font-fantasy disabled:opacity-50"
              >
                {saving ? "💾 Saving..." : saved ? "✅ Saved!" : "💾 Save to Library"}
              </button>
              <button
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {cards.map((card, idx) => {
              const isEditing = editingIdx === idx;
              return (
                <div key={idx} className="space-y-2">
                  <SocialCardPreview
                    card={card}
                    themeBackground={themeBackground}
                    themeBorder={themeBorder}
                    refEl={(el) => {
                      cardRefs.current[idx] = el;
                    }}
                    className={isEditing ? "ring-2 ring-[#c08020]" : "opacity-95 hover:opacity-100"}
                  />
                  <div className="flex justify-center gap-2 flex-wrap">
                    <button
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
                          {card.format === "trap" ? "Myth (Trap)" : "Stat (Headline)"}
                        </span>
                        <textarea
                          value={card.headline}
                          onChange={(e) => updateCard(idx, { headline: e.target.value })}
                          rows={2}
                          className="mt-1 w-full bg-[#111a28] border border-[#406080]/40 rounded-md p-2 text-sm text-[#e0e0e0] font-fantasy focus:outline-none focus:border-[#c08020]"
                        />
                        <span
                          className={`mt-1 block text-[10px] font-fantasy ${
                            (card.headline || "").length > HEADLINE_LIMIT
                              ? "text-red-300"
                              : "text-[#606080]"
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
                          {card.format === "trap" ? "Truth (Treasure)" : "Supporting Line"}
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
                          onClick={() => setShowRawText((v) => !v)}
                          className="px-3 py-1.5 rounded-lg border border-[#406080]/40 text-xs font-fantasy text-[#a0a0a0] bg-[#111a28] hover:border-[#c08020]/50 hover:text-[#e0e0e0] transition-all"
                        >
                          {showRawText ? "🙈 Hide raw text" : "🔍 View raw text"}
                        </button>
                        {showRawText && (
                          <div className="mt-2 space-y-2 rounded-md bg-[#0d1520] border border-[#406080]/40 p-3">
                            <div>
                              <span className="text-[#e0b45a] text-[10px] font-fantasy uppercase tracking-wider">
                                {card.format === "trap" ? "Myth / Headline" : "Headline"}
                              </span>
                              <p className="text-[#f0e6d0] text-sm whitespace-pre-wrap break-words">
                                {card.headline || "(empty)"}
                              </p>
                            </div>
                            <div>
                              <span className="text-[#e0b45a] text-[10px] font-fantasy uppercase tracking-wider">
                                {card.format === "trap" ? "Fact / Body" : "Body"}
                              </span>
                              <p className="text-[#f0e6d0] text-sm whitespace-pre-wrap break-words">
                                {card.body || "(empty)"}
                              </p>
                            </div>
                            <div>
                              <span className="text-[#e0b45a] text-[10px] font-fantasy uppercase tracking-wider">
                                Punchline
                              </span>
                              <p className="text-[#f0e6d0] text-sm whitespace-pre-wrap break-words">
                                {card.punchline || "(empty)"}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
