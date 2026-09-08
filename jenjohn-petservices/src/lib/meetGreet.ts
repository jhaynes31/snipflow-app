/**
 * Meet & Greet travel fee engine. Pure and unit-testable: given a one-way
 * driving distance in miles and the current settings, it returns the fee,
 * the tier it falls in, and whether the address is outside the service area.
 *
 * This fee is OWNER-ONLY. It is a separate concept from the stay totalPrice
 * and is never shown to the client or added to their visible price breakdown.
 *
 * Authoritative tier table (one-way miles, from the owner, 2026-08-31):
 *   - 0-19.99      -> Free ($0)
 *   - 20-29.99     -> Flat fee
 *   - 30-49.99     -> Formula (starts at flat fee, capped)
 *   - 50+          -> OUTSIDE SERVICE AREA (no fee; suggest free virtual)
 *
 * Formula for 30+ (one-way):
 *   round_trip = one_way * 2
 *   fee = MIN( flatFee + (round_trip - feeStartsAtOneWay * 2) * ratePerMile, feeCap )
 */

export type DistanceProvider = "google" | "mapbox" | "manual";
export type FeeTier = "free" | "flat" | "formula" | "outside";

export interface MeetGreetSettings {
  baseAddress: string;
  flatFee: number;
  freeRadiusMiles: number;
  feeStartsAtOneWay: number;
  ratePerMile: number;
  feeCap: number;
  outsideServiceAreaMiles: number;
  distanceProvider: DistanceProvider;
  virtualNote: string;
}

export const DEFAULT_MEET_GREET_SETTINGS: MeetGreetSettings = {
  baseAddress: "Bruceton Mills, WV 26525",
  flatFee: 75,
  // Per the authoritative tier table, free is 0-19.99 so the flat fee starts
  // at 20 one-way miles. NOTE: the owner's future-proofing note mentioned a
  // Free radius: free for stays under 20 miles one way (i.e. 19 miles and below).
  freeRadiusMiles: 20,
  // One-way miles already covered by the flat tier (29 -> round trip 58).
  feeStartsAtOneWay: 29,
  ratePerMile: 1.25,
  feeCap: 110,
  // >= this one-way distance means the address is outside the service area.
  outsideServiceAreaMiles: 50,
  distanceProvider: "manual",
  virtualNote:
    "This address is outside our in-home service area. A free virtual meet and greet is available as an alternative.",
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface MeetGreetFeeResult {
  fee: number;
  outsideArea: boolean;
  tier: FeeTier;
  oneWayMiles: number;
}

export function calculateMeetGreetFee(
  oneWayMiles: number,
  settings: MeetGreetSettings,
): MeetGreetFeeResult {
  const miles = Number(oneWayMiles);
  if (!Number.isFinite(miles) || miles < 0) {
    return { fee: 0, outsideArea: false, tier: "free", oneWayMiles: miles || 0 };
  }
  // Outside service area: no fee, flag + free virtual option.
  if (miles >= settings.outsideServiceAreaMiles) {
    return { fee: 0, outsideArea: true, tier: "outside", oneWayMiles: miles };
  }
  // Free tier: 0 to (freeRadiusMiles - 0.01). At exactly freeRadiusMiles the
  // flat tier begins.
  if (miles < settings.freeRadiusMiles) {
    return { fee: 0, outsideArea: false, tier: "free", oneWayMiles: miles };
  }
  // Flat tier: freeRadiusMiles .. feeStartsAtOneWay (29.99).
  if (miles < settings.feeStartsAtOneWay + 1) {
    return {
      fee: settings.flatFee,
      outsideArea: false,
      tier: "flat",
      oneWayMiles: miles,
    };
  }
  // Formula tier: feeStartsAtOneWay + 1 .. outsideServiceAreaMiles (exclusive).
  const roundTrip = miles * 2;
  const fee = Math.min(
    settings.flatFee + (roundTrip - settings.feeStartsAtOneWay * 2) * settings.ratePerMile,
    settings.feeCap,
  );
  return { fee: round2(fee), outsideArea: false, tier: "formula", oneWayMiles: miles };
}

/** Format a fee as $x.xx for owner-facing text. */
export function formatFee(fee: number): string {
  return `$${fee.toFixed(2)}`;
}

/**
 * Convert raw string settings (as loaded from the siteSettings store) into a
 * fully typed MeetGreetSettings, falling back to defaults for missing or
 * invalid numeric/choice values.
 */
export function settingsFromStrings(
  raw: Record<string, string | undefined>,
): MeetGreetSettings {
  const num = (key: string, def: number) => {
    const v = Number(raw[key]);
    return Number.isFinite(v) ? v : def;
  };
  const provider = raw.distanceProvider;
  const distanceProvider: DistanceProvider =
    provider === "google" || provider === "mapbox" || provider === "manual"
      ? provider
      : "manual";
  return {
    baseAddress:
      (raw.baseAddress || "").trim() || DEFAULT_MEET_GREET_SETTINGS.baseAddress,
    flatFee: num("flatFee", DEFAULT_MEET_GREET_SETTINGS.flatFee),
    freeRadiusMiles: num(
      "freeRadiusMiles",
      DEFAULT_MEET_GREET_SETTINGS.freeRadiusMiles,
    ),
    feeStartsAtOneWay: num(
      "feeStartsAtOneWay",
      DEFAULT_MEET_GREET_SETTINGS.feeStartsAtOneWay,
    ),
    ratePerMile: num("ratePerMile", DEFAULT_MEET_GREET_SETTINGS.ratePerMile),
    feeCap: num("feeCap", DEFAULT_MEET_GREET_SETTINGS.feeCap),
    outsideServiceAreaMiles: num(
      "outsideServiceAreaMiles",
      DEFAULT_MEET_GREET_SETTINGS.outsideServiceAreaMiles,
    ),
    distanceProvider,
    virtualNote:
      (raw.virtualNote || "").trim() ||
      DEFAULT_MEET_GREET_SETTINGS.virtualNote,
  };
}

