/** "I'm taking something personally": from the sting, to their side of it, to how much is actually mine. */

export const PERSONAL_OPENERS = [
  "Okay. Let's find out how much of this is actually yours. My guess: less than it feels like.",
  "Something landed like a verdict. Let's look at it before we believe it.",
]

export const MEANINGS = [
  "I'm not enough",
  'I did something wrong',
  "I'm too much",
  "I'm not worth the effort",
  "They don't respect me",
  "I'm being punished",
  'Nobody would choose me',
  'I have to fix this',
  "I'm an afterthought",
  "They're angry with me",
]

export const THEIR_LENS = [
  "They're overwhelmed",
  "They're distracted",
  "They're carrying their own pain",
  "This is their pattern with everyone",
  'They had a bad day',
  "They didn't know it mattered to me",
  "They're not a strong communicator",
  'They meant no harm',
  "They're busy, not gone",
  "Their capacity ran out",
  "They're wired differently than me",
  "It's their season, not my worth",
]

export const INTENT_OPTIONS: { id: 'know' | 'guessing' | 'asked'; label: string; line: string }[] = [
  { id: 'guessing', label: "I'm guessing", line: "Then the story is a guess wearing a verdict's clothes. You can hold it more loosely." },
  { id: 'asked', label: 'I asked them', line: 'Good. Then you have their words, not just your fear. Believe the words.' },
  { id: 'know', label: 'I know for sure', line: 'Even so, knowing what they did isn\'t the same as knowing what it says about you. Their choice is about them.' },
]

export const ACTIONS = [
  'Nothing. Let it be theirs.',
  'Ask them directly, once.',
  'Give it 24 hours before I decide anything.',
  'Log it and watch for a pattern.',
  'Set a boundary about it.',
  'Bring it to God and set it down.',
]

export const SLICE_LABELS = ['Not mine at all', 'A sliver', 'Some of it', 'About half', 'Most of it', 'All mine']
export const sliceLabel = (n: number) => SLICE_LABELS[Math.min(5, Math.floor(n / 20))]

export const PERSONAL_TRUTH = 'Most of what people do is about their day, not my worth.'
