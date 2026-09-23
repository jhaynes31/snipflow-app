import { describe, expect, it } from 'vitest';
import { EXERCISE_MAP } from './exercises';
import { GUIDES, guideForTemplate } from './guides';
import { SESSION_ORDER_WEEK_EVEN, SESSION_ORDER_WEEK_ODD, TEMPLATES } from './templates';
import type { MuscleRegion, SessionType } from '@/domain/types';

const ALL_REGIONS: MuscleRegion[] = ['neck', 'upper-back', 'shoulders', 'chest', 'arms', 'forearms', 'core', 'lower-back', 'glutes', 'hips', 'quads', 'hamstrings', 'calves', 'ankles-feet'];

describe('templates (2026-09-23: somatic, fascia, pelvic floor, mobility)', () => {
  it('every exercise id in every template exists and is never an excluded one', () => {
    for (const t of Object.values(TEMPLATES)) {
      for (const b of t.blocks) for (const id of b.exerciseIds) {
        expect(EXERCISE_MAP[id], `${t.id}: ${id}`).toBeDefined();
        expect(EXERCISE_MAP[id].exclusionTags, `${t.id}: ${id}`).toEqual([]);
      }
    }
  });
  it('the four therapy sessions are in the weekly order, both weeks', () => {
    for (const order of [SESSION_ORDER_WEEK_ODD, SESSION_ORDER_WEEK_EVEN]) {
      expect(order).toContain('somatic');
      expect(order).toContain('fascia');
      expect(order).toContain('pelvicFloor');
      expect(order).toContain('ptMobility');
      expect(order.filter((s) => s.startsWith('strength'))).toHaveLength(2);
    }
  });
  it('a week addresses the whole body', () => {
    const covered = new Set<MuscleRegion>();
    for (const s of SESSION_ORDER_WEEK_ODD) for (const b of TEMPLATES[s].blocks) for (const id of b.exerciseIds) {
      for (const m of EXERCISE_MAP[id].musclesPrimary) covered.add(m);
      for (const m of EXERCISE_MAP[id].musclesSecondary) covered.add(m);
    }
    for (const r of ALL_REGIONS) expect(covered.has(r), r).toBe(true);
  });
  it('therapy exercises carry their category and are gentle (no impact, no caution locks)', () => {
    const cats = { somatic: 'somatic', fascia: 'fascia', pelvicFloor: 'pelvic', ptMobility: 'mobility' } as const;
    for (const [tpl, cat] of Object.entries(cats)) {
      const main = TEMPLATES[tpl as SessionType].blocks.find((b) => b.kind === 'main')!;
      const own = main.exerciseIds.filter((id) => id.startsWith(cat.slice(0, 3)));
      expect(own.length).toBeGreaterThan(4);
      for (const id of own) {
        expect(EXERCISE_MAP[id].category).toBe(cat);
        expect(EXERCISE_MAP[id].impact).toBe('none');
        expect(EXERCISE_MAP[id].cautionTags).toEqual([]);
        expect(EXERCISE_MAP[id].neckDemand).not.toBe('high');
      }
    }
  });
  it('every template has a guide, and every guide is trained on trauma, AuDHD and hypermobility', () => {
    for (const t of Object.keys(TEMPLATES) as SessionType[]) if (t !== 'freestyle') expect(guideForTemplate(t).leads).toContain(t);
    const text = GUIDES.map((g) => [g.approach, ...g.knows].join(' ')).join(' ').toLowerCase();
    for (const word of ['trauma', 'hypermob', 'pots']) expect(text).toContain(word);
    expect(guideForTemplate('somatic').name).toBe('Somatic guide');
    expect(guideForTemplate('pelvicFloor').role).toBe('Pelvic floor');
  });
});
