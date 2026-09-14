import { GUIDE_SECTIONS } from "./questGuide";

/**
 * The How To tab's list of topics: every guide John can pick from the
 * dropdown or find by searching, one topic on screen at a time. The words
 * themselves live with each guide; this is only the index.
 */

export type HowToGroup = "Quest Board" | "The DM Screen" | "Presenting" | "The Sparring Dummy" | "Recruits";

export interface HowToTopic {
  id: string;
  group: HowToGroup;
  title: string;
  /** Extra words a search should hit, in John's language. */
  keywords: string[];
}

export const HOW_TO_GROUPS: HowToGroup[] = ["Quest Board", "The DM Screen", "Presenting", "The Sparring Dummy", "Recruits"];

const questTopics: HowToTopic[] = [
  { id: "quest-overview", group: "Quest Board", title: "How a quest works, start to finish", keywords: ["campaign", "loop", "overview", "posting", "booked calls"] },
  ...GUIDE_SECTIONS.map((s, i) => ({ id: `quest-${s.id}`, group: "Quest Board" as const, title: `Step ${i + 1}: ${s.title}`, keywords: [s.where, ...s.steps.map((st) => st.do)] })),
  { id: "quest-rules", group: "Quest Board", title: "House rules", keywords: ["rules", "never", "always", "compliance"] },
];

const toolTopics: HowToTopic[] = [
  { id: "screen-writing", group: "The DM Screen", title: "Writing a script", keywords: ["script", "section", "slide", "notes", "target minutes", "autosave", "saved", "create", "new script"] },
  { id: "screen-format", group: "The DM Screen", title: "Bold, italic, and bullets", keywords: ["format", "formatting", "stars", "dash", "bullet", "preview", "markers"] },
  { id: "screen-history", group: "The DM Screen", title: "History, duplicates, and archive", keywords: ["version", "restore", "undo", "lost", "copy", "short version", "default", "archive", "bring back", "delete"] },
  { id: "screen-flags", group: "The DM Screen", title: "Warnings and Trust tags", keywords: ["flag", "warning", "guarantee", "income", "compliance", "trust fact", "presentation fact", "tag"] },
  { id: "present", group: "Presenting", title: "Presenting from two monitors or the phone", keywords: ["present", "presenter", "second monitor", "window", "phone", "swipe", "tap", "resume", "refresh", "offline", "wake", "full screen", "iphone", "home screen", "dark", "light"] },
  { id: "present-keys", group: "Presenting", title: "Keys and the remote", keywords: ["keys", "keyboard", "remote", "clicker", "arrow", "space", "page down", "page up", "timer", "text size", "escape", "list", "jump"] },
  { id: "dummy-setup", group: "The Sparring Dummy", title: "Setting up a practice session", keywords: ["practice", "session", "persona", "invent a person", "temperament", "difficulty", "level", "objection", "presentation practice", "coverage", "recruiting"] },
  { id: "dummy-during", group: "The Sparring Dummy", title: "During the session and the debrief", keywords: ["hint", "pause", "voice", "speak", "end", "outcome", "debrief", "flags", "scores", "try next"] },
  { id: "dummy-rubric", group: "The Sparring Dummy", title: "Your rubric and past sessions", keywords: ["rubric", "what the debrief notices", "sessions", "share", "example", "history"] },
  { id: "recruits", group: "Recruits", title: "Giving a recruit practice access", keywords: ["recruit", "guild", "practice link", "access", "private", "share with john", "take it back", "new link", "quest log"] },
];

export const HOW_TO_TOPICS: HowToTopic[] = [...questTopics, ...toolTopics];

export function topicById(id: string | undefined): HowToTopic | undefined {
  return id ? HOW_TO_TOPICS.find((t) => t.id === id) : undefined;
}

/** Plain word search over titles, groups, and keywords. Every word typed must appear somewhere. */
export function searchTopics(query: string): HowToTopic[] {
  const words = query.toLowerCase().split(/\s+/).map((w) => w.trim()).filter(Boolean);
  if (!words.length) return HOW_TO_TOPICS;
  return HOW_TO_TOPICS.filter((t) => {
    const hay = `${t.group} ${t.title} ${t.keywords.join(" ")}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}

/** The topic before and after this one in the list, for "next" links. */
export function neighbours(id: string): { prev?: HowToTopic; next?: HowToTopic } {
  const i = HOW_TO_TOPICS.findIndex((t) => t.id === id);
  return { prev: i > 0 ? HOW_TO_TOPICS[i - 1] : undefined, next: i >= 0 && i < HOW_TO_TOPICS.length - 1 ? HOW_TO_TOPICS[i + 1] : undefined };
}
