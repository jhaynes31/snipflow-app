/**
 * Server-side validation and pricing for a public booking request.
 *
 * The browser still shows a live estimate, but the server no longer trusts a
 * single number it sends: every request is re-validated here, re-priced with
 * the same engine the form uses (src/lib/pricing.ts), and checked against the
 * availability calendar before it is stored. Pure functions, no I/O, so the
 * whole file is unit-testable (see scripts/booking-validation-test.ts).
 */
import { calculatePrice, type PricingResult } from "./pricing";
import { derivePetsData, derivePetNames, type PetDetail, type PetsData, type PetType } from "./petDetails";

const PET_TYPES: PetType[] = ["adultDog", "puppy", "cat", "kitten", "other"];
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^(\d{1,2}):(\d{2})$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PETS = 20;

export interface ValidatedBooking {
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientAddress: string;
  arrivalDate: string;
  arrivalTime: string;
  departureDate: string;
  departureTime: string;
  petDetails: PetDetail[];
  pets: PetsData;
  petNames: string;
  notes?: string;
  petAnxieties?: string;
  petAnxietyManifestation?: string;
  petSleepsInBed?: string;
  petQuirks?: string;
  hearAboutUs?: string;
  referredBy?: string;
}

export type ValidationResult =
  | { ok: true; value: ValidatedBooking }
  | { ok: false; error: string };

/** Today's calendar date in America/New_York as YYYY-MM-DD. */
export function todayEastern(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Parse YYYY-MM-DD into a local-midnight Date, or null when not a real date. */
export function parseDateStr(s: string): Date | null {
  const m = DATE_RE.exec(s);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return date;
}

/** Minutes since midnight for "HH:MM" (24h) or "H:MM AM/PM"; null when unparseable. */
export function timeToMinutes(raw: string): number | null {
  const t = (raw || "").trim();
  const m = /^(\d{1,2}):(\d{2})(?:\s*([ap]m))?$/i.exec(t);
  if (!m) return null;
  let hour = Number(m[1]);
  const minute = Number(m[2]);
  const suffix = (m[3] || "").toLowerCase();
  if (minute > 59) return null;
  if (suffix) {
    if (hour < 1 || hour > 12) return null;
    if (suffix === "pm" && hour < 12) hour += 12;
    if (suffix === "am" && hour === 12) hour = 0;
  } else if (hour > 23) {
    return null;
  }
  return hour * 60 + minute;
}

function str(d: Record<string, unknown>, key: string, max = 500): string {
  const v = d[key];
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function optional(d: Record<string, unknown>, key: string, max = 2000): string | undefined {
  const v = str(d, key, max);
  return v ? v : undefined;
}

function validatePets(raw: unknown): { ok: true; pets: PetDetail[] } | { ok: false; error: string } {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: false, error: "Please add at least one pet." };
  }
  if (raw.length > MAX_PETS) {
    return { ok: false, error: `Please list at most ${MAX_PETS} pets.` };
  }
  const pets: PetDetail[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") {
      return { ok: false, error: "Each pet needs a name and a type." };
    }
    const p = entry as Record<string, unknown>;
    const name = typeof p.name === "string" ? p.name.trim().slice(0, 100) : "";
    if (!name) return { ok: false, error: "Please add a name for each pet." };
    const type = typeof p.type === "string" ? (p.type as PetType) : "adultDog";
    if (!PET_TYPES.includes(type)) {
      return { ok: false, error: `Unknown pet type for ${name}.` };
    }
    const opt = (k: string) =>
      typeof p[k] === "string" && (p[k] as string).trim() ? (p[k] as string).trim().slice(0, 100) : undefined;
    pets.push({ name, type, breed: opt("breed"), age: opt("age"), species: opt("species") });
  }
  return { ok: true, pets };
}

/**
 * Validate the raw JSON body of a booking request. Returns the cleaned,
 * typed booking or the first user-facing error. `today` is injectable for
 * tests and defaults to today's date in Eastern time.
 */
export function validateBookingRequest(
  raw: unknown,
  today: string = todayEastern(),
): ValidationResult {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Invalid request body" };
  const d = raw as Record<string, unknown>;

  const clientName = str(d, "clientName", 120);
  if (!clientName) return { ok: false, error: "Client name is required" };
  const clientEmail = str(d, "clientEmail", 254);
  if (!clientEmail) return { ok: false, error: "Client email is required" };
  if (!EMAIL_RE.test(clientEmail)) return { ok: false, error: "Enter a valid email address." };
  const clientAddress = str(d, "clientAddress", 400);
  if (!clientAddress) return { ok: false, error: "Client address is required" };
  const clientPhone = optional(d, "clientPhone", 40);

  const arrivalDate = str(d, "arrivalDate", 10);
  const departureDate = str(d, "departureDate", 10);
  const arrivalTime = str(d, "arrivalTime", 10);
  const departureTime = str(d, "departureTime", 10);
  if (!arrivalDate) return { ok: false, error: "Arrival date is required" };
  if (!arrivalTime) return { ok: false, error: "Arrival time is required" };
  if (!departureDate) return { ok: false, error: "Departure date is required" };
  if (!departureTime) return { ok: false, error: "Departure time is required" };

  const arr = parseDateStr(arrivalDate);
  const dep = parseDateStr(departureDate);
  if (!arr) return { ok: false, error: "Arrival date is not a valid date." };
  if (!dep) return { ok: false, error: "Departure date is not a valid date." };
  if (!TIME_RE.test(arrivalTime) || timeToMinutes(arrivalTime) === null) {
    return { ok: false, error: "Arrival time is not a valid time." };
  }
  if (!TIME_RE.test(departureTime) || timeToMinutes(departureTime) === null) {
    return { ok: false, error: "Departure time is not a valid time." };
  }
  if (arrivalDate < today) return { ok: false, error: "Arrival date cannot be in the past." };
  if (departureDate <= arrivalDate) {
    return { ok: false, error: "Departure date must be after arrival date." };
  }
  const stayDays = Math.round((dep.getTime() - arr.getTime()) / 86_400_000);
  if (stayDays > 120) return { ok: false, error: "Please contact us directly for stays longer than 120 days." };

  const petsResult = validatePets(d.petDetails);
  if (!petsResult.ok) return petsResult;
  const petDetails = petsResult.pets;

  return {
    ok: true,
    value: {
      clientName,
      clientEmail,
      clientPhone,
      clientAddress,
      arrivalDate,
      arrivalTime,
      departureDate,
      departureTime,
      petDetails,
      pets: derivePetsData(petDetails),
      petNames: derivePetNames(petDetails),
      notes: optional(d, "notes"),
      petAnxieties: optional(d, "petAnxieties", 500),
      petAnxietyManifestation: optional(d, "petAnxietyManifestation"),
      petSleepsInBed: optional(d, "petSleepsInBed", 100),
      petQuirks: optional(d, "petQuirks"),
      hearAboutUs: optional(d, "hearAboutUs", 200),
      referredBy: optional(d, "referredBy", 200),
    },
  };
}

/** Re-price a validated booking with the shared engine. Server is the authority. */
export function priceValidatedBooking(b: ValidatedBooking): PricingResult {
  const arr = parseDateStr(b.arrivalDate)!;
  const dep = parseDateStr(b.departureDate)!;
  const otherSpeciesCount = b.pets.otherSpecies.reduce((s, o) => s + (Number(o.quantity) || 0), 0);
  return calculatePrice({
    arrivalDate: arr,
    arrivalTime: b.arrivalTime,
    departureDate: dep,
    departureTime: b.departureTime,
    adultDogs: b.pets.adultDogs,
    puppies: b.pets.puppies,
    cats: b.pets.cats,
    kittens: b.pets.kittens,
    otherSpeciesCount,
  });
}

/** Every YYYY-MM-DD from arrival through departure, inclusive. */
export function stayDates(arrivalDate: string, departureDate: string): string[] {
  const out: string[] = [];
  const start = parseDateStr(arrivalDate);
  const end = parseDateStr(departureDate);
  if (!start || !end) return out;
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    out.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    );
  }
  return out;
}

export interface PartialDay {
  date: string;
  /** Existing booking departs at this time; a new arrival must be later. */
  afterTime: string;
}

/**
 * Availability check against what the public calendar shows. A stay conflicts
 * when any of its days is fully blocked, when a day other than the arrival day
 * is a partial day (someone else is still there that morning), or when the
 * arrival day is partial and the arrival time is not after the departing
 * client's time. Returns a user-facing message, or null when the dates are free.
 */
export function findAvailabilityConflict(
  arrivalDate: string,
  arrivalTime: string,
  departureDate: string,
  blockedDates: Iterable<string>,
  partialDays: PartialDay[],
): string | null {
  const blocked = new Set(blockedDates);
  const partial = new Map(partialDays.map((p) => [p.date, p.afterTime]));
  for (const day of stayDates(arrivalDate, departureDate)) {
    if (blocked.has(day) && !partial.has(day)) {
      return `${day} is no longer available. Please choose different dates.`;
    }
    const after = partial.get(day);
    if (after === undefined) continue;
    if (day !== arrivalDate) {
      return `${day} is only available for arrivals later in the day. Please choose different dates.`;
    }
    const arrive = timeToMinutes(arrivalTime);
    const cutoff = timeToMinutes(after);
    if (arrive === null || cutoff === null || arrive <= cutoff) {
      return `On ${day} we can only accept arrivals after ${after}. Please choose a later arrival time.`;
    }
  }
  return null;
}
