/**
 * The Field Guide: a shelf of outside resources for the room. Chosen by
 * Jen (2026-09-20) for a man with ADHD who is still getting to know Jesus,
 * building a business, and learning to follow through. Each entry links out;
 * nothing is copied in. Add, reorder or remove freely.
 */
export interface ShelfItem {
  title: string;
  url: string;
  /** Why it is on the shelf, in one line. */
  why: string;
  /** What it helps with, for the eye. */
  helps: string;
  kind: "site" | "book" | "video" | "podcast" | "community" | "talk";
}

export const SHELF: ShelfItem[] = [
  {
    title: "Art of Manliness",
    url: "https://www.artofmanliness.com/",
    why: "Habits, follow-through, fatherhood, doing hard things. Quiet, practical, unembarrassed about being a man.",
    helps: "initiative, hard things, being a husband and father",
    kind: "site",
  },
  {
    title: "ADDitude: ADHD in adult men",
    url: "https://www.additudemag.com/category/adhd-add/adhd-in-adults/adhd-in-men/",
    why: "Plain, useful articles on how ADHD shows up in men and what actually helps. No shame in it.",
    helps: "understanding your own wiring",
    kind: "site",
  },
  {
    title: "Men's ADHD Support Group",
    url: "https://mensadhdsupportgroup.org/",
    why: "A community and podcast built for men with ADHD specifically. You are not the only one.",
    helps: "not being alone in it",
    kind: "community",
  },
  {
    title: "Dr. Russell Barkley on ADHD (talks)",
    url: "https://www.youtube.com/results?search_query=russell+barkley+adhd+adults",
    why: "ADHD is a problem of doing what you know, not of knowing. The clearest explanation of why starting is the hard part.",
    helps: "initiative, why motivation doesn't come first",
    kind: "talk",
  },
  {
    title: "ADHD 2.0 (Hallowell and Ratey)",
    url: "https://www.google.com/search?q=ADHD+2.0+Hallowell+Ratey",
    why: "The book most therapists hand a man first. Short chapters, hopeful, and specific.",
    helps: "a map of the whole thing",
    kind: "book",
  },
  {
    title: "Driven to Distraction (Hallowell and Ratey)",
    url: "https://www.google.com/search?q=Driven+to+Distraction+Hallowell+Ratey",
    why: "The older classic. Good for seeing yourself in the stories.",
    helps: "recognizing the pattern",
    kind: "book",
  },
  {
    title: "How to ADHD (Jessica McCabe)",
    url: "https://www.youtube.com/@HowtoADHD",
    why: "Short, warm, practical videos. Also a book by the same name.",
    helps: "small systems that stick",
    kind: "video",
  },
  {
    title: "ADHD reWired (podcast)",
    url: "https://www.adhdrewired.com/",
    why: "Adults building routines that survive real life. Interviews with people who did it.",
    helps: "follow-through, routines",
    kind: "podcast",
  },
];

export const KIND_LABEL: Record<ShelfItem["kind"], string> = {
  site: "Website",
  book: "Book",
  video: "Videos",
  podcast: "Podcast",
  community: "Community",
  talk: "Talks",
};
