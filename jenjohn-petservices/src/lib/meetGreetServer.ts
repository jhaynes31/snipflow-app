/**
 * Server-only helpers for the Meet & Greet feature. These read the provider API
 * keys from the environment and are never bundled to the client. Shared by the
 * admin calculator server fn and the client booking submit route (both of which
 * run on the server).
 */
import {
  calculateMeetGreetFee,
  settingsFromStrings,
  DEFAULT_MEET_GREET_SETTINGS,
  type MeetGreetSettings,
  type MeetGreetFeeResult,
} from "./meetGreet";
import { resolveDrivingMiles, type ResolveDistanceResult } from "./distance";

async function convexQuery(name: string, args: Record<string, unknown> = {}) {
  const base = process.env.CONVEX_DEPLOYMENT_URL;
  if (!base) throw new Error("CONVEX_DEPLOYMENT_URL not set");
  const res = await fetch(`${base}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: `queries:${name}`, args }),
  });
  if (!res.ok) throw new Error(`Convex query ${name} failed: HTTP ${res.status}`);
  const json = await res.json();
  return json.value ?? json;
}

const rawDefaults: Record<string, string> = {
  baseAddress: DEFAULT_MEET_GREET_SETTINGS.baseAddress,
  flatFee: String(DEFAULT_MEET_GREET_SETTINGS.flatFee),
  freeRadiusMiles: String(DEFAULT_MEET_GREET_SETTINGS.freeRadiusMiles),
  feeStartsAtOneWay: String(DEFAULT_MEET_GREET_SETTINGS.feeStartsAtOneWay),
  ratePerMile: String(DEFAULT_MEET_GREET_SETTINGS.ratePerMile),
  feeCap: String(DEFAULT_MEET_GREET_SETTINGS.feeCap),
  outsideServiceAreaMiles: String(DEFAULT_MEET_GREET_SETTINGS.outsideServiceAreaMiles),
  distanceProvider: DEFAULT_MEET_GREET_SETTINGS.distanceProvider,
  virtualNote: DEFAULT_MEET_GREET_SETTINGS.virtualNote,
};

export async function loadMeetGreetSettings(): Promise<MeetGreetSettings> {
  let raw: Record<string, string> = { ...rawDefaults };
  try {
    const merged = await convexQuery("getSiteSettings");
    if (merged && typeof merged === "object") {
      raw = { ...raw, ...(merged as Record<string, string>) };
    }
  } catch (err) {
    console.error("[meet-greet] getSiteSettings failed:", String(err));
  }
  return settingsFromStrings(raw);
}

export interface ComputeMeetGreetResult {
  distance: ResolveDistanceResult;
  fee: MeetGreetFeeResult;
  settings: MeetGreetSettings;
}

/**
 * Resolve distance (manual override or address via the configured provider) and
 * compute the fee. Server-only.
 */
export async function computeMeetGreet(args: {
  oneWayMiles?: number;
  clientAddress?: string;
}): Promise<ComputeMeetGreetResult> {
  const settings = await loadMeetGreetSettings();
  const distance = await resolveDrivingMiles({
    oneWayMiles: args.oneWayMiles,
    clientAddress: args.clientAddress,
    settings,
  });
  const fee = calculateMeetGreetFee(distance.oneWayMiles, settings);
  return { distance, fee, settings };
}
