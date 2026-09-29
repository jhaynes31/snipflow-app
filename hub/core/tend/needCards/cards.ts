import seed from "./tend-need-cards.json" with { type: "json" };

/**
 * "What I Need Right Now" cards (Tend spec update, 2026-09-29). The content
 * lives in tend-need-cards.json as seed data; nothing here hard-codes card
 * text. The owner of a set is the person the JSON names (Jen today); the data
 * model keys everything by profile so John's own set can come later.
 */
export type Section = "do_first" | "practical" | "emotional" | "spiritual" | "say_this" | "avoid" | "signs";
export const SECTIONS: Section[] = ["do_first", "say_this", "avoid", "practical", "emotional", "spiritual", "signs"];
export const SECTION_LABEL: Record<Section, string> = { do_first: "Do first", say_this: "Say this", avoid: "Avoid", practical: "Practical", emotional: "Emotional", spiritual: "Spiritual", signs: "Signs" };

export interface Card {
  id: string;
  title: string;
  subtitle: string;
  signs: string[];
  do_first: string[];
  practical: string[];
  emotional: string[];
  spiritual: string[];
  say_this: string[];
  avoid: string[];
  scripture: { ref: string; note: string };
  personalize_prompt?: string;
  safety?: { trigger: string; action: string };
  nonverbal_mode?: boolean;
}
export interface NeedType { id: string; label: string; icon: string }
export interface Intensity { id: number; label: string }

export const CARD_SET = seed as { version: number; owner_profile: string; support_person_profile: string; need_types: NeedType[]; intensity_levels: Intensity[]; cards: Card[] };
export const NEED_TYPES: NeedType[] = CARD_SET.need_types;
export const INTENSITIES: Intensity[] = CARD_SET.intensity_levels;
export const CARDS: Card[] = CARD_SET.cards;
export const CARD_MAP: Record<string, Card> = Object.fromEntries(CARDS.map((c) => [c.id, c]));

/** Which embedded person owns the seed set ("her" is the JSON's owner_profile "jen"). */
export function ownsSeedSet(person: "her" | "john"): boolean {
  return (CARD_SET.owner_profile === "jen" && person === "her") || (CARD_SET.owner_profile === "john" && person === "john");
}

/** The one-tap buttons on the non-verbal panel, and what the support person is told. */
export const NONVERBAL_TAPS: { key: string; label: string; tell: string }[] = [
  { key: "stay", label: "Stay near me", tell: "Stay near me" },
  { key: "space", label: "Give me space", tell: "Give me space (not from you)" },
  { key: "water", label: "Water please", tell: "Water please" },
  { key: "blanket", label: "Blanket please", tell: "Blanket please" },
  { key: "yes", label: "Yes", tell: "Yes" },
  { key: "no", label: "No", tell: "No" },
  { key: "back", label: "I'm coming back", tell: "I'm coming back" },
];

/** Which section a need type opens on the support view. */
export const NEED_SECTION: Record<string, Section | null> = { practical: "practical", emotional: "emotional", spiritual: "spiritual", presence: "emotional", space: null };

// ---------- personalization ----------

export interface EditItem { text: string; hidden: boolean; starred: boolean; custom: boolean }
export interface CardEdits { cardId: string; sections: { key: Section; items: EditItem[] }[]; plan?: string }

/** The seed items of a card as an editable list. */
export function seedItems(card: Card, section: Section): EditItem[] {
  return card[section].map((text) => ({ text, hidden: false, starred: false, custom: false }));
}

/** A card's edits, or a fresh set from the seed. Seed items added later are appended. */
export function editsFor(card: Card, saved: CardEdits | null): CardEdits {
  const sections = SECTIONS.map((key) => {
    const got = saved?.sections.find((s) => s.key === key)?.items ?? [];
    const known = new Set(got.map((i) => i.text));
    const fresh = seedItems(card, key).filter((i) => !known.has(i.text));
    return { key, items: got.length ? [...got, ...fresh] : fresh };
  });
  return { cardId: card.id, sections, plan: saved?.plan };
}

/** What the support person sees: hidden items dropped, starred first, order kept otherwise. */
export function shown(edits: CardEdits, section: Section): string[] {
  const items = edits.sections.find((s) => s.key === section)?.items ?? [];
  const visible = items.filter((i) => !i.hidden);
  return [...visible.filter((i) => i.starred), ...visible.filter((i) => !i.starred)].map((i) => i.text);
}

/** "Do first" across several cards: deduplicated, starred first, at most five. */
export function mergeDoFirst(cards: { edits: CardEdits }[], max = 5): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const starred = cards.flatMap((c) => (c.edits.sections.find((s) => s.key === "do_first")?.items ?? []).filter((i) => !i.hidden && i.starred).map((i) => i.text));
  const rest = cards.flatMap((c) => shown(c.edits, "do_first"));
  for (const t of [...starred, ...rest]) {
    const k = t.trim().toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

export function intensityLabel(id: number | undefined): string | null {
  return INTENSITIES.find((i) => i.id === id)?.label ?? null;
}

/** "AuDHD, Shutdown" for a notification or a card. */
export function cardTitles(ids: string[]): string {
  return ids.map((id) => CARD_MAP[id]?.title ?? id).join(", ");
}
