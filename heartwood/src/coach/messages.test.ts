import { describe, expect, it } from 'vitest';
import { BANNED_PHRASES, MESSAGES, pickMessage } from './messages';

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
  it('covers every moment for every tone', () => {
    for (const moment of ['pre-session', 'mid-set', 'post-session', 'milestone', 'comeback', 'quit', 'rest', 'sabbath'] as const) {
      for (const tone of ['gentle', 'fierce', 'calm'] as const) expect(pickMessage({ moment, tone, faithTrack: false }), `${moment}/${tone}`).not.toBeNull();
    }
  });
});
