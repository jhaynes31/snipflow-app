import { describe, expect, it } from 'vitest';
import { cautionUnlocksFrom, startingLevelsFrom } from './assessment';
import type { Assessment } from './types';

const good: Assessment = { date: '2026-10-20', kind: 'reassessment', results: [
  { testId: 'sit-to-stand-30', value: 14, rating: 'okay' },
  { testId: 'sls-supported', side: 'left', value: 30, rating: 'okay' },
  { testId: 'sls-supported', side: 'right', value: 30, rating: 'easy' },
  { testId: 'wall-reach', rating: 'okay' },
  { testId: 'chair-squat-depth', rating: 'easy' },
  { testId: 'knee-to-wall', side: 'left', rating: 'easy' },
  { testId: 'knee-to-wall', side: 'right', rating: 'easy' },
  { testId: 'bridge-hold', value: 30, rating: 'okay' },
] };

describe('assessment', () => {
  it('onboarding never unlocks cautions', () => {
    expect(cautionUnlocksFrom({ ...good, kind: 'onboarding' })).toEqual([]);
  });
  it('reassessment unlocks balance, step-ups and deep knee flexion only when ready', () => {
    expect(cautionUnlocksFrom(good)).toEqual(['unsupported-single-leg', 'step-up', 'deep-knee-flexion']);
    const painful: Assessment = { ...good, results: good.results.map((r) => (r.testId === 'chair-squat-depth' ? { ...r, rating: 'painful' } : r)) };
    expect(cautionUnlocksFrom(painful)).toEqual(['unsupported-single-leg']);
    const wobbly: Assessment = { ...good, results: good.results.map((r) => (r.testId === 'sls-supported' && r.side === 'left' ? { ...r, value: 12, rating: 'hard' } : r)) };
    expect(cautionUnlocksFrom(wobbly)).not.toContain('unsupported-single-leg');
  });
  it('step-ups need the knee ready on the previous screen too', () => {
    const prevBad: Assessment = { ...good, kind: 'onboarding', results: good.results.map((r) => (r.testId === 'chair-squat-depth' ? { ...r, rating: 'hard' } : r)) };
    expect(cautionUnlocksFrom(good, prevBad)).not.toContain('step-up');
  });
  it('starting levels go gentle when anything is hard or painful', () => {
    expect(startingLevelsFrom(good)).toMatchObject({ knees: 'standard', balance: 'standard', ptFocus: [] });
    const hard: Assessment = { ...good, kind: 'onboarding', results: good.results.map((r) => (r.testId === 'sit-to-stand-30' ? { ...r, rating: 'hard' } : r)) };
    expect(startingLevelsFrom(hard).knees).toBe('gentle');
    expect(startingLevelsFrom(hard).ptFocus).toContain('knees');
  });
});
