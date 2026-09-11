/**
 * The one dice engine for the financial health quiz.
 *
 * Every random number in the quiz comes through here. The default source is
 * crypto.getRandomValues with rejection sampling, so a d20 is exactly fair.
 * A seeded source exists for tests and QA so the same "luck" can be replayed.
 *
 * Nothing in here may be imported by the scoring code (wealthProfile.ts):
 * dice never touch the score.
 */

export interface Rng {
  /** Uniform integer from 1 to `sides` inclusive. */
  int: (sides: number) => number;
  /** Convenience: a fair d20. */
  d20: () => number;
}

function fromUnit(unit: () => number): Rng {
  const int = (sides: number) => {
    const n = Math.max(1, Math.floor(sides));
    return 1 + Math.floor(unit() * n);
  };
  return { int, d20: () => int(20) };
}

/** Cryptographically random source with no modulo bias. */
export function createCryptoRng(): Rng {
  const int = (sides: number) => {
    const n = Math.max(1, Math.floor(sides));
    const buf = new Uint32Array(1);
    const limit = Math.floor(0x100000000 / n) * n; // largest multiple of n that fits
    let x = 0;
    do {
      crypto.getRandomValues(buf);
      x = buf[0];
    } while (x >= limit);
    return 1 + (x % n);
  };
  return { int, d20: () => int(20) };
}

/** Deterministic source (mulberry32) for tests and QA replays. */
export function createSeededRng(seed: number): Rng {
  let a = seed >>> 0;
  return fromUnit(() => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  });
}

/** An RNG that answers a fixed script of values first, then falls back. */
export function createScriptedRng(script: number[], fallback: Rng = createCryptoRng()): Rng {
  const queue = [...script];
  const int = (sides: number) => {
    const next = queue.shift();
    if (next === undefined) return fallback.int(sides);
    return Math.max(1, Math.min(sides, Math.round(next)));
  };
  return { int, d20: () => int(20) };
}

export const defaultRng: Rng = createCryptoRng();
