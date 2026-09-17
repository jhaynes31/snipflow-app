import type { CautionTag, Exercise, PTRestriction, UserProfile } from './types';

/**
 * Safety filter engine (Section 4.3 / 4.4 / 4.7).
 *
 * Hard exclusions can NEVER be bypassed. Caution exercises are locked unless the
 * user has unlocked that caution tag (via PT progression or manual confirmation).
 * PT restrictions entered by the user are applied on top.
 *
 * This function runs on every plan generation, every substitution and every
 * library listing. Tests in safety.test.ts prove excluded exercises cannot appear.
 */

export const HARD_EXCLUSION_TAGS = ['lunge', 'burpee', 'crunch', 'situp', 'neck-flexion-loaded', 'plyometric', 'jumping'] as const;
export const CAUTION_TAGS: CautionTag[] = ['unsupported-single-leg', 'deep-knee-flexion', 'heavy-overhead', 'step-up'];

export interface SafetyContext {
  unlockedCautions: CautionTag[];
  restrictions: PTRestriction[];
}

export type ExclusionReason =
  | { kind: 'hard'; tag: string }
  | { kind: 'neck'; }
  | { kind: 'impact'; }
  | { kind: 'caution'; tag: CautionTag }
  | { kind: 'pt-restriction'; restrictionId: string; label: string };

/** Returns the first reason an exercise is not allowed, or null if it is allowed. */
export function exclusionReason(ex: Exercise, ctx: SafetyContext): ExclusionReason | null {
  // --- Hard exclusions: never negotiable ---
  for (const tag of ex.exclusionTags) {
    if ((HARD_EXCLUSION_TAGS as readonly string[]).includes(tag)) return { kind: 'hard', tag };
  }
  if (ex.neckDemand === 'high') return { kind: 'neck' };
  if (ex.impact === 'high') return { kind: 'impact' };
  // Lunges can sneak in through naming: belt and braces.
  if (/\blunge\b|\bburpee\b|\bcrunch\b|\bsit-?up\b/i.test(ex.name)) return { kind: 'hard', tag: 'name-match' };

  // --- Caution list: locked unless unlocked ---
  for (const tag of ex.cautionTags) {
    if (!ctx.unlockedCautions.includes(tag)) return { kind: 'caution', tag };
  }

  // --- Real PT restrictions entered by the user ---
  for (const r of ctx.restrictions) {
    if (r.avoidExerciseIds?.includes(ex.id)) return { kind: 'pt-restriction', restrictionId: r.id, label: r.label };
    if (r.avoidJoints?.some((j) => ex.jointsLoaded.includes(j))) return { kind: 'pt-restriction', restrictionId: r.id, label: r.label };
    if (r.avoidPatterns?.some((p) => ex.movementPatterns.includes(p))) return { kind: 'pt-restriction', restrictionId: r.id, label: r.label };
    if (r.avoidStances?.includes(ex.stance)) return { kind: 'pt-restriction', restrictionId: r.id, label: r.label };
  }
  return null;
}

export function isAllowed(ex: Exercise, ctx: SafetyContext): boolean {
  return exclusionReason(ex, ctx) === null;
}

/** Is this exercise hard-excluded regardless of any unlocks? */
export function isHardExcluded(ex: Exercise): boolean {
  const r = exclusionReason(ex, { unlockedCautions: [...CAUTION_TAGS], restrictions: [] });
  return r !== null && r.kind !== 'caution' && r.kind !== 'pt-restriction';
}

export function filterAllowed(exercises: Exercise[], ctx: SafetyContext): Exercise[] {
  return exercises.filter((e) => isAllowed(e, ctx));
}

export function contextFromProfile(profile: Pick<UserProfile, 'unlockedCautions' | 'ptPlan'> | null | undefined): SafetyContext {
  return {
    unlockedCautions: profile?.unlockedCautions ?? [],
    restrictions: profile?.ptPlan?.restrictions ?? [],
  };
}

export const DEFAULT_SAFETY_CONTEXT: SafetyContext = { unlockedCautions: [], restrictions: [] };

/**
 * Find a safe alternative for an exercise (Section 9.3 "Swap this exercise").
 * Prefers the regression, then the progression, then any allowed exercise sharing a
 * movement pattern and category. Always returns something allowed, or null if the
 * library truly has nothing safe (which the tests show does not happen).
 */
export function findSafeAlternative(
  ex: Exercise,
  library: Exercise[],
  ctx: SafetyContext,
  exclude: string[] = [],
): Exercise | null {
  const byId = new Map(library.map((e) => [e.id, e]));
  const skip = new Set([ex.id, ...exclude]);
  const ok = (c: Exercise | undefined): c is Exercise => !!c && !skip.has(c.id) && isAllowed(c, ctx);

  const reg = ex.regressionId ? byId.get(ex.regressionId) : undefined;
  if (ok(reg)) return reg;
  const prog = ex.progressionId ? byId.get(ex.progressionId) : undefined;
  if (ok(prog)) return prog;

  const scored = library
    .filter((c) => ok(c))
    .map((c) => {
      let score = 0;
      if (c.category === ex.category) score += 3;
      score += c.movementPatterns.filter((p) => ex.movementPatterns.includes(p)).length * 2;
      score += c.musclesPrimary.filter((m) => ex.musclesPrimary.includes(m)).length;
      if (c.stance === ex.stance) score += 1;
      if (c.timerType === ex.timerType) score += 1;
      return { c, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.c ?? null;
}
