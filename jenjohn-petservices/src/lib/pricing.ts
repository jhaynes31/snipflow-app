import {
  getHolidaySurchargeDays,
  HOLIDAY_SURCHARGE,
} from "./holidays";

export interface PricingInput {
  arrivalDate: Date;
  arrivalTime: string; // "HH:MM" 24h format
  departureDate: Date;
  departureTime: string;
  adultDogs: number;
  puppies: number;
  cats: number;
  kittens: number;
  otherSpeciesCount: number;
  // Deprecated: holiday is now derived automatically from the dates by the
  // shared holidays engine. Kept optional so existing callers still compile;
  // its value is ignored.
  isHoliday?: boolean;
}

export interface BreakdownItem {
  label: string;
  rate: number;
  count: number;
  days: number;
  subtotal: number;
}

export interface PricingResult {
  total: number;
  fullDays: number;
  halfDays: number;
  breakdown: BreakdownItem[];
  /** True when any day of the stay falls on a recognized holiday. Auto derived. */
  isHoliday: boolean;
  /** Number of calendar days in the stay that carry the holiday surcharge. */
  holidayDays: number;
  /** Total surcharge = 15 x holidayDays. */
  holidaySurcharge: number;
}

export function calculatePrice(input: PricingInput): PricingResult {
  // Parse times
  const arrivalHour = parseInt(input.arrivalTime.split(":")[0], 10);
  const departureHour = parseInt(input.departureTime.split(":")[0], 10);

  // Normalize dates to midnight for day counting
  const arrivalDay = new Date(
    input.arrivalDate.getFullYear(),
    input.arrivalDate.getMonth(),
    input.arrivalDate.getDate(),
  );
  const departureDay = new Date(
    input.departureDate.getFullYear(),
    input.departureDate.getMonth(),
    input.departureDate.getDate(),
  );

  const diffTime = departureDay.getTime() - arrivalDay.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  // Holiday is derived automatically from the dates by the shared engine.
  const holidayDays = getHolidaySurchargeDays(arrivalDay, departureDay);
  const isHoliday = holidayDays > 0;

  // Same-day or invalid: no middle days
  if (diffDays <= 0) {
    let fullDays = 0;
    let halfDays = 0;

    // Arrival day (same as departure day)
    if (arrivalHour < 15) {
      fullDays++;
    } else {
      halfDays++;
    }

    // Duplicate counting for same day doesn't apply ,  only count once
    // For same-day stay with departure after arrival: arrival counted once
    // Actually, if arrival <= 15:00 and departure > 15:00, it's a full day.
    // If both are on the same side, it's still one half or one full.
    // The simplest model: same-day = 1 day, classified by arrival time
    // But the spec says to count both independently...
    // For same-day: use max of the two classifications
    const arrFull = arrivalHour < 15;
    const depFull = departureHour > 15;
    if (arrFull || depFull) {
      fullDays = 1;
      halfDays = 0;
    } else {
      fullDays = 0;
      halfDays = 1;
    }

    return buildPricingResult(fullDays, halfDays, input, holidayDays, isHoliday);
  }

  let fullDays = 0;
  let halfDays = 0;

  // Arrival day: full if <= 15:00, half if > 15:00
  if (arrivalHour < 15) {
    fullDays++;
  } else {
    halfDays++;
  }

  // Departure day: full if > 15:00, half if <= 15:00
  if (departureHour > 15) {
    fullDays++;
  } else {
    halfDays++;
  }

  // Middle days = diffDays - 1 (all full days)
  const middleFullDays = diffDays - 1;
  if (middleFullDays > 0) {
    fullDays += middleFullDays;
  }

  return buildPricingResult(fullDays, halfDays, input, holidayDays, isHoliday);
}

function buildPricingResult(
  fullDays: number,
  halfDays: number,
  input: PricingInput,
  holidayDays: number,
  isHoliday: boolean,
): PricingResult {
  const effectiveDays = fullDays + halfDays * 0.5;
  const hasDogs = input.adultDogs > 0 || input.puppies > 0;
  const breakdown: BreakdownItem[] = [];
  let total = 0;

  const addItem = (label: string, rate: number, count: number) => {
    if (count <= 0) return;
    const subtotal = Math.round(rate * count * effectiveDays * 100) / 100;
    total += subtotal;
    breakdown.push({ label, rate, count, days: effectiveDays, subtotal });
  };

  // Adult dogs (base rate is always 75; holiday is a separate per-day surcharge)
  if (input.adultDogs > 0) {
    addItem("First adult dog", 75, 1);
    if (input.adultDogs > 1) {
      addItem("Additional adult dog", 55, input.adultDogs - 1);
    }
  }

  // Puppies
  if (input.puppies > 0) {
    addItem("First puppy", 85, 1);
    if (input.puppies > 1) {
      addItem("Additional puppy", 55, input.puppies - 1);
    }
  }

  // Cats
  if (input.cats > 0) {
    const firstRate = hasDogs ? 30 : 35;
    const label = hasDogs ? "First cat (sharing)" : "First cat";
    addItem(label, firstRate, 1);
    if (input.cats > 1) {
      addItem("Additional cat", 20, input.cats - 1);
    }
  }

  // Kittens
  if (input.kittens > 0) {
    const firstRate = hasDogs ? 35 : 40;
    const label = hasDogs ? "First kitten (sharing)" : "First kitten";
    addItem(label, firstRate, 1);
    if (input.kittens > 1) {
      addItem("Additional kitten", 20, input.kittens - 1);
    }
  }

  // Other species
  if (input.otherSpeciesCount > 0) {
    addItem("Other species", 15, input.otherSpeciesCount);
  }

  // Holiday surcharge: purely additive, $15 per holiday day, regardless of pet
  // count. Shown in the breakdown so the client and admin can see it.
  let holidaySurcharge = 0;
  if (holidayDays > 0) {
    holidaySurcharge = Math.round(HOLIDAY_SURCHARGE * holidayDays * 100) / 100;
    total += holidaySurcharge;
    breakdown.push({
      label: "Holiday surcharge",
      rate: HOLIDAY_SURCHARGE,
      count: 1,
      days: holidayDays,
      subtotal: holidaySurcharge,
    });
  }

  return {
    total: Math.round(total * 100) / 100,
    fullDays,
    halfDays,
    breakdown,
    isHoliday,
    holidayDays,
    holidaySurcharge,
  };
}
