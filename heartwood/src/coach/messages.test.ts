import { describe, expect, it } from 'vitest';
import { BANNED_PHRASES, MESSAGES, dailyWord, pickMessage } from './messages';

describe('motivation library', () => {
  it('has 100+ messages', () => expect(MESSAGES.length).toBeGreaterThanOrEqual(100));
  it('never uses shaming language (Section 11.6)', () => {
    for (const msg of MESSAGES) for (const b of BANNED_PHRASES) expect(new RegExp(`\\b${b}\\b`, 'i').test(msg.text), `${msg.id}: ${b}`).toBe(false);
  });
  it('faith lines only appear when the faith track is on', () => {
    for (let k = 0; k < 200; k++) {
      const p = pickMessage({ moment: 'sabbath', tone: 'gentle', faithTrack: false });
      expect(p?.faith).toBeFalsy();
    }
  });
  it('why-lines are skipped without a why', () => {
    for (let k = 0; k < 100; k++) expect(pickMessage({ moment: 'gap-why', tone: 'calm', faithTrack: false })).toBeNull();
    expect(pickMessage({ moment: 'gap-why', tone: 'calm', faithTrack: false, vars: { why: 'my grandkids' } })?.text).toContain('my grandkids');
  });
  it('has encouragement for perfectionism, overthinking, shame and small steps, with and without faith', () => {
    for (const theme of ['perfectionism', 'overthinking', 'shame', 'small-steps'] as const) {
      expect(MESSAGES.some((x) => x.theme === theme && !x.faith), theme).toBe(true);
      expect(MESSAGES.some((x) => x.theme === theme && x.faith), theme).toBe(true);
    }
    expect(MESSAGES.filter((x) => x.ref).length).toBeGreaterThanOrEqual(30);
  });
  it('word for today is stable within a day and never scripture when faith is off', () => {
    expect(dailyWord('2026-09-18', true).id).toBe(dailyWord('2026-09-18', true).id);
    for (let d = 1; d <= 28; d++) expect(dailyWord(`2026-09-${String(d).padStart(2, '0')}`, false).faith).toBeFalsy();
    const withFaith = Array.from({ length: 10 }, (_, d) => dailyWord(`2026-10-${String(d + 1).padStart(2, '0')}`, true));
    expect(withFaith.some((x) => x.faith)).toBe(true);
    expect(withFaith.some((x) => !x.faith)).toBe(true);
  });
  it('covers every moment for every tone', () => {
    for (const moment of ['pre-session', 'mid-set', 'post-session', 'milestone', 'comeback', 'quit', 'rest', 'sabbath'] as const) {
      for (const tone of ['gentle', 'fierce', 'calm'] as const) expect(pickMessage({ moment, tone, faithTrack: false }), `${moment}/${tone}`).not.toBeNull();
    }
  });
});
