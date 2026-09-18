import { EMPTY_STATS, type StickerStats } from '@/data/stickers';
import { db, getTree, type PlacedSticker, type HeartwoodDB } from './db';

async function counter(key: string, database: HeartwoodDB): Promise<number> {
  const v = (await database.kv.get(`counter:${key}`))?.value;
  return typeof v === 'number' ? v : 0;
}

/** Lifetime stats that drive sticker-pack unlocks. Derived, so unlocks are retroactive and never lost. */
export async function stickerStats(database: HeartwoodDB = db): Promise<StickerStats> {
  const done = await database.sessions.where('status').anyOf('completed', 'partial').toArray();
  const tree = await getTree(database);
  return {
    ...EMPTY_STATS,
    sessions: done.length,
    ptSessions: done.filter((s) => s.templateId.startsWith('pt')).length,
    strengthSessions: done.filter((s) => s.templateId.startsWith('strength')).length,
    roots: tree.rootPoints,
    progressions: await counter('progressions', database),
    balanceProgressions: await counter('balanceProgressions', database),
    lessons: await database.lessons.count(),
    reassessments: await database.assessments.where('kind').equals('reassessment').count(),
    comebacks: done.filter((s) => s.isComeback).length,
  };
}

export const MAX_STICKERS_PER_DAY = 3;

export async function placeSticker(date: string, stickerId: string, sessionId: string | undefined, database: HeartwoodDB = db): Promise<PlacedSticker | null> {
  const existing = await database.stickers.where('date').equals(date).toArray();
  if (existing.length >= MAX_STICKERS_PER_DAY) return null;
  const row: PlacedSticker = { date, stickerId, sessionId, placedAt: new Date().toISOString() };
  row.id = (await database.stickers.add(row)) as number;
  return row;
}

export async function removeSticker(id: number, database: HeartwoodDB = db): Promise<void> {
  await database.stickers.delete(id);
}

export async function stickersForMonth(year: number, month0: number, database: HeartwoodDB = db): Promise<PlacedSticker[]> {
  const from = `${year}-${String(month0 + 1).padStart(2, '0')}-01`;
  const to = `${year}-${String(month0 + 1).padStart(2, '0')}-31`;
  return database.stickers.where('date').between(from, to, true, true).toArray();
}
