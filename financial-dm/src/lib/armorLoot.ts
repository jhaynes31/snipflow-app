/**
 * Guardian's loot for the life insurance quiz (dice spec, Section 13). The
 * loot die is loaded too: the item is chosen from the answers by
 * computeArmor, never by chance. Each item is a branded page at /loot/<id>
 * with a matching PDF (loot pages spec).
 */
import type { LifeLootId } from "./armorEngine";
import type { LootItem } from "./wealthLoot";

export interface LifeLootItem extends LootItem {
  /** The web page version of the same item. */
  pageUrl: string;
}

export const LIFE_LOOT: Record<LifeLootId, LifeLootItem> = {
  cursed_armor_decoder: {
    id: "cursed_armor_decoder",
    icon: "🧾",
    title: "The Cursed Armor Decoder",
    description: "What to ask HR about your work coverage: how much it is, whether it's portable or convertible, and what happens when you leave.",
    url: "/loot/cursed_armor_decoder.pdf",
    pageUrl: "/loot/cursed_armor_decoder",
  },
  beneficiary_check: {
    id: "beneficiary_check",
    icon: "📜",
    title: "The Beneficiary Check",
    description: "A checklist for reviewing your beneficiaries, and why the designation usually overrides a will.",
    url: "/loot/beneficiary_check.pdf",
    pageUrl: "/loot/beneficiary_check",
  },
  party_map: {
    id: "party_map",
    icon: "🗺️",
    title: "The Party Map",
    description: "An \"if something happens to me\" organizer: where policies, accounts, and key documents live.",
    url: "/loot/party_map.pdf",
    pageUrl: "/loot/party_map",
  },
};

export const LIFE_LOOT_LINE = "In this dungeon, even the loot is loaded in your favor.";

export function lifeLootById(id: string | undefined): LifeLootItem | null {
  if (!id) return null;
  return (LIFE_LOOT as Record<string, LifeLootItem>)[id] ?? null;
}
