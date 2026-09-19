/** The default Permissions page. Each person edits their own copy in their own words. */
export const DEFAULT_PERMISSIONS: string[] = [
  "I have permission to skip today.",
  "I have permission to doubt, and to say so.",
  "I have permission to be angry at God. The Psalms are.",
  "I have permission to rest before I've earned it.",
  "I have permission to not finish.",
  "I have permission to come back after months, and be met like the son in Luke 15.",
  "I have permission to not know what a passage means.",
  "I have permission to pray in three words.",
  "I have permission to not feel anything today.",
  "I have permission to leave the churchy words behind and use my own.",
];

/** Psalms for when you're angry, empty, or afraid. Lament is a third of the Psalter. */
export const LAMENT_PSALMS: { chapter: number; when: string }[] = [
  { chapter: 13, when: "How long? When God feels absent." },
  { chapter: 22, when: "Abandoned. The one Jesus prayed from the cross." },
  { chapter: 42, when: "Depressed, and talking to your own soul." },
  { chapter: 55, when: "Betrayed by someone close." },
  { chapter: 62, when: "Waiting, and needing to say who your rock is." },
  { chapter: 69, when: "Sinking, with no foothold." },
  { chapter: 77, when: "Awake at night, remembering what God did before." },
  { chapter: 88, when: "The darkest one. It ends in darkness, and it's still Scripture." },
  { chapter: 102, when: "Sick, worn out, and alone." },
  { chapter: 130, when: "Out of the depths. Waiting for morning." },
  { chapter: 142, when: "No one cares for my soul. A cave prayer." },
];

/** One question a week for the two of you. Rotates by the week of the year. */
export const TOGETHER_QUESTIONS: string[] = [
  "Where did you notice Jesus this week, even a little?",
  "What is one thing you're carrying that you haven't said out loud?",
  "Which story about Jesus do you keep coming back to, and why?",
  "What did you need from God this week, and did you ask?",
  "What's one thing you'd want Jesus to say to me if he were at our table?",
  "What churchy phrase would you like us to stop using at home?",
  "Where were you tired this week, and what would rest have looked like?",
  "What are you grateful for that you didn't earn?",
  "What's one way I could pray for you this week, in your words?",
  "What have you doubted lately, and what have you kept anyway?",
  "Where did you see mercy this week, given or received?",
  "What's one small way you'd like us to follow Jesus together next week?",
];
