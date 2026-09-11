/**
 * Cross-quiz completion (dice spec, Section 14.2), same-browser half.
 *
 * Each quiz records that it was completed, with nothing but the tier name,
 * so the other quiz can react: the wealth quiz unlocks its AC slot, and the
 * life quiz shows the "Full Character Sheet Complete" badge. Never stores
 * dollar amounts, party details, stat values, or answers.
 */

export interface CharacterSheetRecord {
  financial?: { tier: string; at: string };
  armor?: { tier: string; at: string };
}

export const CHARACTER_SHEET_KEY = "fdm_character_v1";

/** The armor tiers worth bragging about on the combined card (Section 14.3). */
const SHAREABLE_ARMOR = new Set(["Chain Mail", "Plate Armor", "Traveling Light"]);

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function storage(): StorageLike | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function readCharacterSheet(store: StorageLike | null = storage()): CharacterSheetRecord {
  try {
    const raw = store?.getItem(CHARACTER_SHEET_KEY);
    if (!raw) return {};
    const p = JSON.parse(raw) as CharacterSheetRecord;
    const clean: CharacterSheetRecord = {};
    if (p?.financial && typeof p.financial.tier === "string") clean.financial = { tier: p.financial.tier, at: String(p.financial.at ?? "") };
    if (p?.armor && typeof p.armor.tier === "string") clean.armor = { tier: p.armor.tier, at: String(p.armor.at ?? "") };
    return clean;
  } catch {
    return {};
  }
}

function write(patch: Partial<CharacterSheetRecord>, store: StorageLike | null): CharacterSheetRecord {
  const next = { ...readCharacterSheet(store), ...patch };
  try {
    store?.setItem(CHARACTER_SHEET_KEY, JSON.stringify(next));
  } catch {
    // Storage blocked or full: the quizzes still work, they just don't link.
  }
  return next;
}

export function recordFinancialComplete(tier: string, store: StorageLike | null = storage()): CharacterSheetRecord {
  return write({ financial: { tier, at: new Date().toISOString() } }, store);
}

export function recordArmorComplete(tier: string, store: StorageLike | null = storage()): CharacterSheetRecord {
  return write({ armor: { tier, at: new Date().toISOString() } }, store);
}

export function isFullSheet(record: CharacterSheetRecord): boolean {
  return Boolean(record.financial && record.armor);
}

/** What the combined card says about armor: the tier when it is one to show off, else "being forged". */
export function armorLineFor(record: CharacterSheetRecord): string {
  const tier = record.armor?.tier;
  return tier && SHAREABLE_ARMOR.has(tier) ? `Armor: ${tier}` : "Armor: being forged";
}

export function combinedShareText(record: CharacterSheetRecord): string {
  const tier = record.financial?.tier ?? "Adventurer";
  return `Full character sheet complete at the Financial DM's tavern: ${tier}, ${armorLineFor(record).toLowerCase()}. Roll yours.`;
}
