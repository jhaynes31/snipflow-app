import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Lock } from 'lucide-react';
import { PACKS, STICKER_MAP, STICKERS, ruleMet, ruleProgress, type Sticker, type StickerStats } from '@/data/stickers';
import { db } from '@/db/db';
import { MAX_STICKERS_PER_DAY, placeSticker, removeSticker, stickerStats } from '@/db/sticker-service';
import { addDays, parseISODate, toISODate, weekdayOf } from '@/domain/dates';
import { Button } from './ui';

export function useStickerStats(deps: unknown[] = []): StickerStats | undefined {
  const [st, setSt] = useState<StickerStats>();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { stickerStats().then(setSt); }, deps);
  return st;
}

/** Pick a sticker for a day. Locked packs are shown with a gentle hint, never a nag. */
export function StickerPicker({ date, sessionId, onPlaced, compact = false }: { date: string; sessionId?: string; onPlaced?: (s: Sticker) => void; compact?: boolean }) {
  const stats = useStickerStats([]);
  const placed = useLiveQuery(() => db.stickers.where('date').equals(date).toArray(), [date]) ?? [];
  const [openPack, setOpenPack] = useState<string | null>(null);
  if (!stats) return null;
  const full = placed.length >= MAX_STICKERS_PER_DAY;

  const pick = async (s: Sticker) => {
    const row = await placeSticker(date, s.id, sessionId);
    if (row) onPlaced?.(s);
  };

  return (
    <div className="stack-sm">
      {placed.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="muted text-sm">On the chart:</span>
          {placed.map((p) => (
            <button key={p.id} type="button" className="chip text-2xl" title={`Remove ${STICKER_MAP[p.stickerId]?.name ?? 'sticker'}`} onClick={() => p.id != null && removeSticker(p.id)} aria-label={`Remove ${STICKER_MAP[p.stickerId]?.name ?? 'sticker'}`}>
              {STICKER_MAP[p.stickerId]?.emoji ?? '❔'} <span className="text-xs muted">×</span>
            </button>
          ))}
        </div>
      )}
      {full ? <p className="muted text-sm">That day is full ({MAX_STICKERS_PER_DAY} stickers). Remove one to swap.</p> : (
        <div className="stack-sm">
          {PACKS.map((pack) => {
            const open = ruleMet(pack.unlock, stats);
            const [have, need] = ruleProgress(pack.unlock, stats);
            const list = STICKERS.filter((x) => x.pack === pack.id);
            const expanded = compact ? openPack === pack.id || (openPack === null && pack.id === 'sprouts') : true;
            return (
              <div key={pack.id} className="card-soft">
                <button type="button" className="w-full flex items-center justify-between gap-2 text-left" onClick={() => setOpenPack(openPack === pack.id ? null : pack.id)} aria-expanded={expanded}>
                  <span className="font-bold flex items-center gap-2">{!open && <Lock size={14} aria-hidden="true" />}{pack.name}</span>
                  <span className="muted text-xs">{open ? `${list.length} stickers` : `${pack.blurb} (${have}/${need})`}</span>
                </button>
                {expanded && (
                  <div className="flex flex-wrap gap-1 mt-2" role="group" aria-label={`${pack.name} stickers`}>
                    {list.map((s) => (
                      <button key={s.id} type="button" disabled={!open} className="chip" style={{ fontSize: '1.7rem', padding: '0.25rem 0.5rem', opacity: open ? 1 : 0.35, filter: open ? undefined : 'grayscale(1)' }}
                        title={open ? s.name : `${s.name}: ${pack.blurb}`} aria-label={open ? `Place ${s.name}` : `${s.name}, locked. ${pack.blurb}`} onClick={() => open && pick(s)}>
                        {s.emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Monthly sticker chart. Tap a day to add or remove stickers. */
export function StickerChart({ initialMonth }: { initialMonth?: string }) {
  const [cursor, setCursor] = useState(() => { const d = initialMonth ? parseISODate(initialMonth) : new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selected, setSelected] = useState<string | null>(null);
  const year = cursor.getFullYear(), month = cursor.getMonth();
  const first = toISODate(cursor);
  const last = toISODate(new Date(year, month + 1, 0));
  const rows = useLiveQuery(() => db.stickers.where('date').between(first, last, true, true).toArray(), [first, last]) ?? [];
  const sessions = useLiveQuery(() => db.sessions.where('status').anyOf('completed', 'partial').toArray(), []) ?? [];
  const doneDays = useMemo(() => new Set(sessions.map((s) => (s.completedAt ?? '').slice(0, 10))), [sessions]);
  const byDay = useMemo(() => { const m = new Map<string, string[]>(); for (const r of rows) m.set(r.date, [...(m.get(r.date) ?? []), r.stickerId]); return m; }, [rows]);

  const days: (string | null)[] = [];
  const lead = (weekdayOf(first) + 6) % 7; // Monday first
  for (let i = 0; i < lead; i++) days.push(null);
  for (let d = first; d <= last; d = addDays(d, 1)) days.push(d);
  const today = toISODate(new Date());
  const label = cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <div className="stack-sm">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setCursor(new Date(year, month - 1, 1))} aria-label="Previous month">‹</Button>
        <h3>{label}</h3>
        <Button variant="ghost" size="sm" onClick={() => setCursor(new Date(year, month + 1, 1))} aria-label="Next month">›</Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs muted font-bold">{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <div key={i}>{d}</div>)}</div>
      <div className="grid grid-cols-7 gap-1" role="grid" aria-label={`Sticker chart for ${label}`}>
        {days.map((d, i) => d === null ? <div key={`e${i}`} /> : (
          <button key={d} type="button" role="gridcell" aria-label={`${d}${byDay.get(d)?.length ? `, ${byDay.get(d)!.length} stickers` : ''}`}
            onClick={() => setSelected(selected === d ? null : d)}
            className="rounded-xl flex flex-col items-center justify-start gap-0.5 p-1"
            style={{ minHeight: 56, background: selected === d ? 'var(--bg-callout)' : 'var(--bg-card-soft)', border: d === today ? '2px solid var(--accent)' : '2px solid transparent', outline: doneDays.has(d) && !byDay.get(d)?.length ? '1px dashed var(--fill)' : undefined }}>
            <span className="text-xs muted">{parseISODate(d).getDate()}</span>
            <span className="leading-none" style={{ fontSize: (byDay.get(d)?.length ?? 0) > 1 ? '0.95rem' : '1.4rem' }}>{(byDay.get(d) ?? []).map((id, k) => <span key={k}>{STICKER_MAP[id]?.emoji ?? '❔'}</span>)}</span>
          </button>
        ))}
      </div>
      <p className="muted text-xs">Dashed outline: a session was completed but no sticker chosen yet. Tap a day to add one.</p>
      {selected && (
        <div className="card fade-in stack-sm">
          <div className="flex justify-between items-center"><strong>{parseISODate(selected).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</strong><Button variant="ghost" size="sm" onClick={() => setSelected(null)}>Close</Button></div>
          <StickerPicker date={selected} compact />
        </div>
      )}
    </div>
  );
}

/** The whole collection with unlock hints. */
export function StickerCollection() {
  const stats = useStickerStats([]);
  if (!stats) return null;
  const unlocked = PACKS.filter((p) => ruleMet(p.unlock, stats)).length;
  return (
    <div className="stack-sm">
      <p className="muted text-sm">{unlocked} of {PACKS.length} packs unlocked. Packs open as you train; they never close.</p>
      {PACKS.map((pack) => {
        const open = ruleMet(pack.unlock, stats);
        const [have, need] = ruleProgress(pack.unlock, stats);
        return (
          <div key={pack.id} className="card-soft">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold flex items-center gap-2">{!open && <Lock size={14} aria-hidden="true" />}{pack.name}</span>
              <span className="muted text-xs">{pack.blurb}{!open && need > 1 ? ` (${have}/${need})` : ''}</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-1" style={{ fontSize: '1.6rem', opacity: open ? 1 : 0.35, filter: open ? undefined : 'grayscale(1)' }}>
              {STICKERS.filter((x) => x.pack === pack.id).map((x) => <span key={x.id} title={x.name}>{x.emoji}</span>)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
