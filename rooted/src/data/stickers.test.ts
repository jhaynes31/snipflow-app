import { describe, expect, it } from 'vitest';
import { EMPTY_STATS, PACKS, STICKERS, newlyUnlockedPacks, unlockedPacks, unlockedStickers } from './stickers';

describe('sticker book', () => {
  it('has a starter pack available from day one and a good-sized collection', () => {
    expect(unlockedPacks(EMPTY_STATS).map((p) => p.id)).toEqual(['sprouts']);
    expect(unlockedStickers(EMPTY_STATS).length).toBeGreaterThanOrEqual(10);
    expect(STICKERS.length).toBeGreaterThanOrEqual(70);
    expect(new Set(STICKERS.map((x) => x.id)).size).toBe(STICKERS.length);
  });
  it('every pack has stickers', () => {
    for (const p of PACKS) expect(STICKERS.some((x) => x.pack === p.id), p.id).toBe(true);
  });
  it('unlocks are cumulative and never tied to streaks', () => {
    const st = { ...EMPTY_STATS, sessions: 10, ptSessions: 3 };
    const ids = unlockedPacks(st).map((p) => p.id);
    expect(ids).toEqual(expect.arrayContaining(['sprouts', 'garden', 'forest-friends', 'golden-hour']));
    expect(ids).not.toContain('grove');
    expect(JSON.stringify(PACKS)).not.toMatch(/streak/i);
  });
  it('reports newly unlocked packs between snapshots', () => {
    const before = { ...EMPTY_STATS, sessions: 4 };
    const after = { ...before, sessions: 5, comebacks: 1 };
    expect(newlyUnlockedPacks(before, after).map((p) => p.id)).toEqual(['forest-friends', 'comeback']);
  });
});
