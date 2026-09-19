/**
 * The Character Sheet: who this character is, in his own words. Filled in
 * slowly, one question a day, never all at once. Session Zero is the first
 * handful. He chooses which parts the coach may read.
 */
export interface SheetQuestion {
  key: string;
  label: string;
  hint: string;
  sessionZero?: boolean;
}

export const SHEET: SheetQuestion[] = [
  { key: "name", label: "What do you want to be called in here?", hint: "Your name, a nickname, a character name. This room will use it.", sessionZero: true },
  { key: "alive", label: "What makes you feel alive?", hint: "Not what you're supposed to say. Water, a good table, a story, building something.", sessionZero: true },
  { key: "goodAt", label: "What are you actually good at?", hint: "You are. Name three, even if they feel small.", sessionZero: true },
  { key: "loyalty", label: "Who and what are you loyal to?", hint: "Loyalty is one of your strengths. Name where it goes.", sessionZero: true },
  { key: "want", label: "What do you want? Right now, this season.", hint: "Not what's needed of you. What you want. Even if it's small or unclear.", sessionZero: true },
  { key: "needs", label: "What do you need to be okay?", hint: "Sleep, water, quiet, a friend, time to think, being told you're doing fine." },
  { key: "desires", label: "What do you desire, in the long run?", hint: "The thing you don't say out loud because it might not happen." },
  { key: "values", label: "What do you value most?", hint: "Three or four words. Honesty, loyalty, peace, play, faith, family." },
  { key: "loves", label: "What do you love?", hint: "Stories, games, water, a person, a place. List it all." },
  { key: "hates", label: "What do you hate?", hint: "Being used. Being unseen. Noise. Say it plainly." },
  { key: "limits", label: "What are your limits?", hint: "What you can't keep doing. What drains you past the point of return." },
  { key: "survival", label: "What does survival mode look like on you?", hint: "So this room can spot it. Zoomed in, braced, gone quiet, gaming for hours, snapping." },
  { key: "wayBack", label: "What brings you back?", hint: "A shower, water, a walk, a certain song, Jen's voice, a game with a friend." },
  { key: "story", label: "If your life were a campaign, what story do you want to be in?", hint: "Not the one you were handed. The one you'd choose." },
  { key: "tenYearsOld", label: "What did you love when you were ten?", hint: "Before survival. That boy still has the map." },
  { key: "fatherWish", label: "What did you need from a father and not get?", hint: "This is the hardest one. Skip it until you're ready. This room will try to give some of it." },
];

export function sessionZero(): SheetQuestion[] {
  return SHEET.filter((q) => q.sessionZero);
}
