/**
 * Pet-detail types and helpers shared across the booking form, email
 * notifications, and admin panel.
 *
 * The booking form collects ONE card per pet (name, breed, age, type, and
 * species for "other"). Pricing counts are derived from the card list into
 * the same `PetsData` shape the price calculator has always received, so the
 * calculator and pricing logic are untouched.
 */

export type PetType = "adultDog" | "puppy" | "cat" | "kitten" | "other";

export interface PetDetail {
  name: string;
  breed?: string;
  age?: string;
  type: PetType;
  species?: string; // shown only when type === "other"
}

export const PET_TYPE_LABELS: Record<PetType, string> = {
  adultDog: "Adult Dog",
  puppy: "Puppy",
  cat: "Cat",
  kitten: "Kitten",
  other: "Other",
};

export interface OtherSpeciesEntry {
  name: string;
  quantity: number;
}

/** Same shape the PriceCalculator/calculatePrice has always received. */
export interface PetsData {
  adultDogs: number;
  puppies: number;
  cats: number;
  kittens: number;
  otherSpecies: OtherSpeciesEntry[];
}

/**
 * Derive pricing counts from the per-pet card list.
 *
 * Only cards with a name filled in count toward pricing. A blank pet card
 * (no name typed) contributes zero pets, so the price summary stays at the
 * empty state until the client actually enters a pet. This matches the form
 * validation, which requires a name for every pet before submitting.
 */
export function derivePetsData(pets: PetDetail[]): PetsData {
  const named = pets.filter((p) => p.name.trim().length > 0);
  const adultDogs = named.filter((p) => p.type === "adultDog").length;
  const puppies = named.filter((p) => p.type === "puppy").length;
  const cats = named.filter((p) => p.type === "cat").length;
  const kittens = named.filter((p) => p.type === "kitten").length;

  const otherCounts = new Map<string, number>();
  for (const pet of named) {
    if (pet.type === "other") {
      const name = (pet.species || "").trim() || "Other";
      otherCounts.set(name, (otherCounts.get(name) ?? 0) + 1);
    }
  }
  const otherSpecies = Array.from(otherCounts, ([name, quantity]) => ({
    name,
    quantity,
  }));

  return { adultDogs, puppies, cats, kittens, otherSpecies };
}

/** Comma-joined pet names — kept for back-compat with code reading petNames. */
export function derivePetNames(pets: PetDetail[]): string {
  return pets
    .map((p) => p.name.trim())
    .filter(Boolean)
    .join(", ");
}

/** "Bella (Lab, 4, Adult Dog)" or "Pip (Bird)" for type other with species. */
export function formatPetDetail(pet: PetDetail): string {
  const parts: string[] = [];
  if (pet.breed && pet.breed.trim()) parts.push(pet.breed.trim());
  if (pet.age && pet.age.trim()) parts.push(pet.age.trim());
  if (pet.type === "other") {
    parts.push((pet.species && pet.species.trim()) || "Other");
  } else {
    parts.push(PET_TYPE_LABELS[pet.type] ?? pet.type);
  }
  return `${pet.name} (${parts.join(", ")})`;
}

/**
 * Friendly name list for emails ("Bella and Max") when per-pet details are
 * available. Falls back to the comma-joined petNames string, or undefined.
 */
export function friendlyPetNames(
  petDetails: PetDetail[] | undefined,
  petNames: string | undefined,
): string | undefined {
  if (petDetails && petDetails.length > 0) {
    const names = petDetails.map((p) => p.name.trim()).filter(Boolean);
    if (names.length > 1) {
      return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
    }
    if (names.length === 1) return names[0];
  }
  if (petNames && petNames.trim()) return petNames.trim();
  return undefined;
}
