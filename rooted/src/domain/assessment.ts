import type { Assessment, AssessmentResult, CautionTag } from './types';

/** Movement screen (Section 5.6). Left and right recorded separately where relevant. */
export interface ScreenTest {
  id: string;
  name: string;
  instructions: string[];
  demoExerciseId: string;
  measure?: { kind: 'count' | 'seconds'; label: string };
  perSide: boolean;
  focus: 'knees' | 'balance' | 'shoulders' | 'ankles' | 'hips';
}

export const SCREEN_TESTS: ScreenTest[] = [
  { id: 'sit-to-stand-30', name: 'Sit-to-stand in 30 seconds', perSide: false, focus: 'knees', demoExerciseId: 'sit-to-stand',
    measure: { kind: 'count', label: 'Stands in 30s' },
    instructions: ['Sit in a sturdy chair, arms crossed over your chest.', 'When the timer starts, stand fully and sit back down as many times as you comfortably can in 30 seconds.', 'Stop early if anything hurts.'] },
  { id: 'sls-supported', name: 'Supported single-leg stance', perSide: true, focus: 'balance', demoExerciseId: 'pt-sls-two-hands',
    measure: { kind: 'seconds', label: 'Seconds held' },
    instructions: ['Stand facing a counter with both hands resting on it.', 'Lift one foot and hold as long as you comfortably can, up to 30 seconds.', 'Note the seconds. Then the other side.'] },
  { id: 'wall-reach', name: 'Wall overhead reach', perSide: false, focus: 'shoulders', demoExerciseId: 'band-wall-slide',
    instructions: ['Stand with your back to a wall, arms in a goalpost shape.', 'Slide the arms up the wall as far as you comfortably can.', 'How did that feel?'] },
  { id: 'chair-squat-depth', name: 'Chair squat depth comfort', perSide: false, focus: 'knees', demoExerciseId: 'goblet-squat-box',
    instructions: ['Stand in front of a chair and squat down to lightly touch it, then stand.', 'Do 5 slow reps.', 'How did the left knee feel? Rate the overall comfort.'] },
  { id: 'knee-to-wall', name: 'Ankle mobility (knee-to-wall)', perSide: true, focus: 'ankles', demoExerciseId: 'pt-knee-to-wall',
    instructions: ['Face a wall, one foot a hand-width away.', 'Keeping the heel down, try to touch the wall with your knee.', 'Rate each side.'] },
  { id: 'bridge-hold', name: 'Glute bridge hold', perSide: false, focus: 'hips', demoExerciseId: 'wu-glute-bridge',
    measure: { kind: 'seconds', label: 'Seconds held' },
    instructions: ['Lie on your back, knees bent, and lift your hips.', 'Hold as long as feels good, up to 30 seconds.'] },
];

export interface StartingLevels {
  knees: 'gentle' | 'standard';
  balance: 'gentle' | 'standard';
  ptFocus: ScreenTest['focus'][];
}

function ratingOf(a: Assessment, testId: string, side?: 'left' | 'right'): AssessmentResult | undefined {
  return a.results.find((r) => r.testId === testId && (side ? r.side === side : true));
}

const bad = (r?: AssessmentResult) => !r || r.rating === 'hard' || r.rating === 'painful';

export function startingLevelsFrom(a: Assessment): StartingLevels {
  const knees = bad(ratingOf(a, 'chair-squat-depth')) || bad(ratingOf(a, 'sit-to-stand-30')) ? 'gentle' : 'standard';
  const balance = bad(ratingOf(a, 'sls-supported', 'left')) || bad(ratingOf(a, 'sls-supported', 'right')) ? 'gentle' : 'standard';
  const ptFocus: ScreenTest['focus'][] = [];
  for (const t of SCREEN_TESTS) {
    const rs = a.results.filter((r) => r.testId === t.id);
    if (rs.length === 0 || rs.some(bad)) ptFocus.push(t.focus);
  }
  return { knees, balance, ptFocus: [...new Set(ptFocus)] };
}

/**
 * Caution unlock rules from reassessment (Section 4.4a). Conservative on purpose:
 * only unlocks are returned; nothing is ever re-locked automatically. Manual
 * unlocks (with confirmation) are handled in the UI.
 */
export function cautionUnlocksFrom(a: Assessment, previous?: Assessment): CautionTag[] {
  if (a.kind !== 'reassessment') return [];
  const out: CautionTag[] = [];
  const slsL = ratingOf(a, 'sls-supported', 'left');
  const slsR = ratingOf(a, 'sls-supported', 'right');
  const good = (r?: AssessmentResult) => !!r && (r.rating === 'easy' || r.rating === 'okay');
  if (good(slsL) && good(slsR) && (slsL!.value ?? 0) >= 30 && (slsR!.value ?? 0) >= 30) out.push('unsupported-single-leg');

  const sts = ratingOf(a, 'sit-to-stand-30');
  const depth = ratingOf(a, 'chair-squat-depth');
  const ktwL = ratingOf(a, 'knee-to-wall', 'left');
  const ktwR = ratingOf(a, 'knee-to-wall', 'right');
  const kneeReady = good(sts) && (sts!.value ?? 0) >= 12 && depth?.rating === 'easy';
  // Step-ups need the knee ready on this AND the previous screen.
  if (kneeReady) {
    const prevDepth = previous ? ratingOf(previous, 'chair-squat-depth') : undefined;
    if (!previous || good(prevDepth)) out.push('step-up');
  }
  if (kneeReady && good(ktwL) && good(ktwR) && ktwL?.rating === 'easy' && ktwR?.rating === 'easy') out.push('deep-knee-flexion');
  return out;
}

export const REASSESS_EVERY_DAYS = 35; // 4-6 weeks
