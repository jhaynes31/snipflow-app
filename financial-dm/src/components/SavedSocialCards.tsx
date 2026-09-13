import { useState, useEffect, useCallback, useRef } from "react";
import {
  initSocialCardsTable,
  getSavedSocialCards,
  updateSocialCards,
  deleteSocialCards,
  type SavedSocialCardBatch,
  type SocialCard,
} from "~/server/socialCardGenerator";
import { downloadCardPng, downloadAllCardsZip } from "~/lib/socialCardUtils";
import SocialCardPreview from "./SocialCardPreview";
import CardStylePicker from "./CardStylePicker";
import CaptionHashtagPanel from "~/components/generator/CaptionHashtagPanel";

export default function SavedSocialCards() {
  const [batches, setBatches] = useState<SavedSocialCardBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [styleStatus, setStyleStatus] = useState<Record<number, string>>({});
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await initSocialCardsTable();
      const data = await getSavedSocialCards();
      setBatches(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const updateCardInBatch = useCallback((batchId: number, idx: number, patch: Partial<SocialCard>) => {
    setBatches((bs) =>
      bs.map((b) =>
        b.id === batchId
          ? {
              ...b,
              cards: b.cards.map((c, i) => (i === idx ? { ...c, ...patch } : c)),
            }
          : b,
      ),
    );
  }, []);

  const handleSave = useCallback(
    async (batchId: number) => {
      const batch = batches.find((b) => b.id === batchId);
      if (!batch) return;
      setSavingId(batchId);
      try {
        const res = await updateSocialCards({
          data: { id: batchId, cards: batch.cards },
        });
        if (!res.ok) setError(res.error || "Could not save the changes.");
        else setEditingId(null);
      } catch {
        setError("Could not save the changes.");
      } finally {
        setSavingId(null);
      }
    },
    [batches],
  );

  /** Backdrop or border changed in the library: show it at once and save it with the batch. */
  const handleStyle = useCallback(
    async (batchId: number, patch: { themeBackground?: string; themeBorder?: string }) => {
      const current = batches.find((b) => b.id === batchId);
      if (!current) return;
      const next = { ...current, ...patch };
      setBatches((bs) => bs.map((b) => (b.id === batchId ? next : b)));
      setStyleStatus((m) => ({ ...m, [batchId]: "Saving..." }));
      try {
        const res = await updateSocialCards({ data: { id: batchId, cards: next.cards, themeBackground: next.themeBackground, themeBorder: next.themeBorder, style: true } });
        if (!res.ok) {
          setError(res.error || "Could not save the new look.");
          setStyleStatus((m) => ({ ...m, [batchId]: "" }));
          return;
        }
        setStyleStatus((m) => ({ ...m, [batchId]: "Saved" }));
        setTimeout(() => setStyleStatus((m) => ({ ...m, [batchId]: "" })), 1500);
      } catch {
        setError("Could not save the new look.");
        setStyleStatus((m) => ({ ...m, [batchId]: "" }));
      }
    },
    [batches],
  );

  const handleDelete = useCallback(
    async (batchId: number) => {
      setDeletingId(batchId);
      try {
        await deleteSocialCards({ data: { id: batchId } });
        setBatches((bs) => bs.filter((b) => b.id !== batchId));
      } catch {
        setError("Could not delete that batch.");
      } finally {
        setDeletingId(null);
      }
    },
    [],
  );

  const handleDownloadCard = useCallback(
    async (batchId: number, idx: number, format: string) => {
      const ref = cardRefs.current[`${batchId}-${idx}`];
      if (!ref) return;
      try {
        await downloadCardPng(ref, `card-${idx + 1}`, format);
      } catch {
        setError("Could not download that card. Please try again.");
      }
    },
    [],
  );

  const handleDownloadAll = useCallback(
    async (batch: SavedSocialCardBatch) => {
      setDownloadingId(batch.id);
      try {
        const items = batch.cards
          .map((_, i) => {
            const el = cardRefs.current[`${batch.id}-${i}`];
            return el ? { el: el as HTMLElement, label: String(i + 1) } : null;
          })
          .filter((x): x is { el: HTMLElement; label: string } => x !== null);
        await downloadAllCardsZip(batch.format, items);
      } catch {
        setError("Could not package the cards into a zip. Please try again.");
      } finally {
        setDownloadingId(null);
      }
    },
    [],
  );

  const filtered = batches.filter((b) =>
    b.cards.some((c) =>
      `${c.topic} ${c.headline} ${c.body}`.toLowerCase().includes(search.toLowerCase()),
    ),
  );

  if (loading) {
    return <p className="text-center text-[#a0a0a0] text-sm font-fantasy py-8">Loading your library...</p>;
  }
  if (error) {
    return (
      <div className="text-center p-4 rounded-lg bg-red-900/20 border border-red-700/30 text-red-300 text-sm font-fantasy">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-[#a0a0a0] text-sm font-fantasy">
          {batches.length === 0
            ? "No saved card batches yet. Forge some cards and save them to reload, re edit, and re export here."
            : `${batches.length} saved batch${batches.length > 1 ? "es" : ""}`}
        </p>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search saved cards..."
          className="px-3 py-2 rounded-lg bg-[#111a28] border border-[#406080]/40 text-sm text-[#e0e0e0] font-fantasy focus:outline-none focus:border-[#c08020]"
        />
      </div>

      {filtered.length === 0 && !error && (
        <p className="text-center text-[#606080] text-sm font-fantasy py-8">
          No matching saved cards.
        </p>
      )}

      {filtered.map((batch) => {
        const isExpanded = expandedId === batch.id;
        return (
          <div
            key={batch.id}
            className="rounded-xl border border-[#406080]/30 bg-[#111a28] p-4 space-y-3"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="font-fantasy text-[#c08020] text-lg">
                  {batch.format === "trap" ? "🪤 Trap or Treasure" : "📊 Stat Cards"}
                </p>
                <p className="text-[#606080] text-xs font-fantasy">
                  Tone: {batch.tone} · Saved {batch.createdAt}
                  {batch.dndThemed ? " · 🛡️ D&D themed" : ""} · {batch.cards.length} card{batch.cards.length > 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : batch.id)}
                  className="px-3 py-1.5 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#204060]/50 transition-all text-xs font-fantasy"
                >
                  {isExpanded ? "▴ Hide" : "▾ View"}
                </button>
                <button
                  onClick={() => handleDownloadAll(batch)}
                  disabled={downloadingId === batch.id}
                  className="px-3 py-1.5 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#204060]/50 transition-all text-xs font-fantasy disabled:opacity-50"
                >
                  {downloadingId === batch.id ? "⏳ Zipping..." : "⬇️ All (.zip)"}
                </button>
                <button
                  onClick={() => handleDelete(batch.id)}
                  disabled={deletingId === batch.id}
                  className="px-3 py-1.5 rounded-lg bg-red-900/20 border border-red-700/40 text-red-300 hover:bg-red-900/40 transition-all text-xs font-fantasy disabled:opacity-50"
                >
                  {deletingId === batch.id ? "..." : "🗑️ Delete"}
                </button>
              </div>
            </div>
            {isExpanded && (
              <CardStylePicker
                themeBackground={batch.themeBackground}
                themeBorder={batch.themeBorder}
                onBackground={(id) => handleStyle(batch.id, { themeBackground: id })}
                onBorder={(id) => handleStyle(batch.id, { themeBorder: id })}
                note="Pick a backdrop or border and it saves with this batch right away."
                status={styleStatus[batch.id]}
              />
            )}
            {isExpanded && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {batch.cards.map((card, idx) => {
                  const isEditing = editingId === batch.id;
                  return (
                    <div key={idx} className="space-y-2">
                      <SocialCardPreview
                        card={card}
                        themeBackground={batch.themeBackground}
                        themeBorder={batch.themeBorder}
                        refEl={(el) => {
                          cardRefs.current[`${batch.id}-${idx}`] = el;
                        }}
                        className={isEditing ? "ring-2 ring-[#c08020]" : "opacity-95 hover:opacity-100"}
                      />
                      <div className="flex justify-center gap-2 flex-wrap">
                        <button
                          onClick={() => setEditingId(isEditing ? null : batch.id)}
                          className={`shrink-0 px-3 py-1.5 rounded-lg border transition-all text-xs font-fantasy ${
                            isEditing
                              ? "bg-[#c08020] border-[#c08020] text-[#0d1520] font-bold"
                              : "bg-[#204060]/30 border-[#406080]/30 text-[#e0e0e0] hover:bg-[#c08020]/20 hover:border-[#c08020]/50"
                          }`}
                        >
                          {isEditing ? "✅ Done" : "✏️ Edit"}
                        </button>
                        <button
                          onClick={() => handleDownloadCard(batch.id, idx, batch.format)}
                          className="shrink-0 px-3 py-1.5 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#204060]/50 transition-all text-xs font-fantasy"
                        >
                          ⬇️ PNG
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
                              onChange={(e) => updateCardInBatch(batch.id, idx, { headline: e.target.value })}
                              rows={2}
                              className="mt-1 w-full bg-[#111a28] border border-[#406080]/40 rounded-md p-2 text-sm text-[#e0e0e0] font-fantasy focus:outline-none focus:border-[#c08020]"
                            />
                          </label>
                          <label className="block">
                            <span className="text-[#e0b45a] text-xs font-fantasy">
                              {card.format === "trap" ? "Truth (Treasure)" : "Supporting Line"}
                            </span>
                            <textarea
                              value={card.body}
                              onChange={(e) => updateCardInBatch(batch.id, idx, { body: e.target.value })}
                              rows={2}
                              className="mt-1 w-full bg-[#111a28] border border-[#406080]/40 rounded-md p-2 text-sm text-[#e0e0e0] font-fantasy focus:outline-none focus:border-[#c08020]"
                            />
                          </label>
                          <label className="block">
                            <span className="text-[#e0b45a] text-xs font-fantasy">Kicker / Punchline</span>
                            <textarea
                              value={card.punchline}
                              onChange={(e) => updateCardInBatch(batch.id, idx, { punchline: e.target.value })}
                              rows={1}
                              className="mt-1 w-full bg-[#111a28] border border-[#406080]/40 rounded-md p-2 text-sm text-[#e0e0e0] font-fantasy focus:outline-none focus:border-[#c08020]"
                            />
                          </label>
                          <button
                            onClick={() => handleSave(batch.id)}
                            disabled={savingId === batch.id}
                            className="w-full px-3 py-2 rounded-lg bg-[#c08020] text-[#0d1520] font-bold text-sm font-fantasy transition-all disabled:opacity-50"
                          >
                            {savingId === batch.id ? "💾 Saving..." : "💾 Save Changes"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {isExpanded && (batch.caption || batch.hashtags.length > 0) && (
              <CaptionHashtagPanel
                compact
                captions={batch.caption ? [batch.caption] : []}
                caption={batch.caption}
                hashtags={batch.hashtags}
                onError={setError}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
