/**
 * All the words John says during the financial health quiz's dice moments.
 * Kept in one place so they can be edited without touching the flow.
 */

export function openingRollCopy(n: number): string {
  if (n === 20) return "A natural 20! Lucky start. But luck ain't a plan, friend. Pull up a stool and let's see what you're really carrying.";
  if (n === 1) return "A 1. Good news: this one doesn't count. The dice don't decide how this story ends. Your preparation does. Pull up a stool.";
  return `A ${n}. Don't get attached to it, traveler. The dice don't decide how this story ends. Your preparation does. Pull up a stool and let's see what you're carrying.`;
}

export const OPENING_BUTTON = "Build My Character";
