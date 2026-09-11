/**
 * Trap or Treasure dealing rules (Section 8). This is the life insurance
 * quiz's only real randomness, and it never touches the estimate: the
 * engine (armorEngine.ts) knows nothing about myth cards.
 */
import { ALWAYS_DEALT, CARDS_PER_GAME, MYTH_DECK, RIGHT_LINES, WRONG_LINES, type MythAnswer, type MythCard } from "~/components/life/mythDeck";
import type { Rng } from "./wealthRng";

export interface MythGame {
  /** The encounter die shown when the cards are dealt (flavor only). */
  roll: number;
  /** Card ids in the order dealt. Drawn once and stored; never redrawn. */
  cards: string[];
  /** The player's call per card id. */
  guesses: Record<string, MythAnswer>;
}

/**
 * Deal the cards: `work_coverage` always, the rest drawn at random from the
 * remaining deck without repeats. `forced` (from the debug param) pins the
 * hand; anything missing is filled at random.
 */
export function dealMyths(rng: Rng, forced: string[] = []): string[] {
  const valid = forced.filter((id, i) => MYTH_DECK.some((c) => c.id === id) && forced.indexOf(id) === i);
  const hand = valid.includes(ALWAYS_DEALT) ? valid.slice(0, CARDS_PER_GAME) : [ALWAYS_DEALT, ...valid].slice(0, CARDS_PER_GAME);
  const pool = MYTH_DECK.map((c) => c.id).filter((id) => !hand.includes(id));
  while (hand.length < CARDS_PER_GAME && pool.length > 0) {
    const [picked] = pool.splice(rng.int(pool.length) - 1, 1);
    hand.push(picked);
  }
  return hand;
}

export function cardById(id: string): MythCard | undefined {
  return MYTH_DECK.find((c) => c.id === id);
}

/** Number right out of the cards dealt (only counts cards that were called). */
export function mythScore(game: MythGame | undefined): number {
  if (!game) return 0;
  return game.cards.filter((id) => {
    const card = cardById(id);
    return card && game.guesses[id] === card.answer;
  }).length;
}

/** John's feedback line for the card at `position` (0 based), rotating so it never repeats back to back. */
export function feedbackLine(correct: boolean, position: number): string {
  const lines = correct ? RIGHT_LINES : WRONG_LINES;
  return lines[position % lines.length];
}

/** Per-card context for the lead record: id, the call, and whether it was right. */
export function mythSummary(game: MythGame | undefined): Array<{ id: string; guess: MythAnswer | null; correct: boolean | null }> {
  if (!game) return [];
  return game.cards.map((id) => {
    const card = cardById(id);
    const guess = game.guesses[id] ?? null;
    return { id, guess, correct: card && guess ? guess === card.answer : null };
  });
}

/** `?debugMyths=work_coverage,taxes,conversion` → ["work_coverage","taxes","conversion"]. Unknown ids are ignored. */
export function parseDebugMyths(search: string): string[] {
  const raw = new URLSearchParams(search).get("debugMyths");
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((id) => MYTH_DECK.some((c) => c.id === id));
}
