/**
 * The Mirror: a daily emotional check-in built for a man told feelings are
 * weakness. Name it, what's under it, body, what do I want. Survival first.
 */
export const FEELINGS: { group: string; words: string[] }[] = [
  { group: "Low", words: ["tired", "flat", "sad", "heavy", "hopeless", "lonely", "empty"] },
  { group: "Tight", words: ["anxious", "braced", "on edge", "overwhelmed", "trapped", "dread"] },
  { group: "Hot", words: ["angry", "irritated", "resentful", "defensive", "frustrated"] },
  { group: "Small", words: ["ashamed", "guilty", "not enough", "exposed", "stupid", "useless"] },
  { group: "Gone", words: ["numb", "blank", "checked out", "far away", "zoomed in"] },
  { group: "Okay", words: ["calm", "steady", "content", "curious", "hopeful", "glad", "proud", "grateful"] },
];

export const UNDER: string[] = ["afraid of failing", "afraid of being seen", "afraid of being used", "afraid of letting Jen down", "old stuff from home", "too much at once", "no sleep", "nothing under it, just tired", "I don't know yet"];

export const BODY: string[] = ["jaw tight", "shoulders up", "stomach knotted", "can't sit still", "heavy limbs", "headache", "holding my breath", "fine, actually"];

export const SURVIVAL_SIGNS: string[] = [
  "I can't see anything except the one thing.",
  "My body is braced like something is about to hit.",
  "I don't want anything. There's nothing I want.",
  "I've gone quiet or gone far away.",
  "I've been gaming or scrolling for hours to not feel it.",
  "I'm snapping at people I love.",
];

/** The Way Back. Water first, because he is a water person. Never counted. */
export const WAY_BACK: { step: string; why: string }[] = [
  { step: "Water first. A shower, cold water on your face, a glass of water, or go sit near some.", why: "Your body comes back before your mind does. Water is your way in." },
  { step: "Stand up. Roll your shoulders down. Breathe out longer than you breathe in, five times.", why: "The brace releases from the body side." },
  { step: "Say one small true thing out loud. 'I'm in the kitchen. It's Tuesday. I'm safe right now.'", why: "Survival mode lies about where you are." },
  { step: "Zoom out with The Map. This room, the house, the week, the year.", why: "The one thing is real. It is not the only thing." },
  { step: "Read today's line from the Father. Then stop. Growth can wait until you're back.", why: "You're his before you've done anything. That's true in survival too." },
];
