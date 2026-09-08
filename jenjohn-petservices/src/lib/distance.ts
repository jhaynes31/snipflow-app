/**
 * Server-side distance resolution for the Meet & Greet travel fee.
 *
 * This module MUST only ever run on the server (Convex action or site server
 * fn). It reads the distance provider API keys straight from the environment
 * (GOOGLE_MAPS_API_KEY / MAPBOX_API_KEY), so the keys never reach the client
 * bundle.
 *
 * `resolveDrivingMiles` is the single entry point behind which both the Google
 * Distance Matrix adapter and the Mapbox (Geocoding + Directions) adapter
 * live, selected by settings.distanceProvider. If `oneWayMiles` is supplied
 * (admin manual override) no API call happens at all.
 *
 * Default working mode without any key is MANUAL miles.
 */
import type { MeetGreetSettings } from "./meetGreet";

export type DistanceMode = "manual" | "api";
export type DistanceStatus = "ok" | "no_key" | "geocode_failed" | "error";

export interface ResolveDistanceArgs {
  /** Manual override (admin only). When present, no API call is made. */
  oneWayMiles?: number;
  /** Client home address. Mandatory for the api path. */
  clientAddress?: string;
  /** Settings (base address + provider + knobs). */
  settings?: MeetGreetSettings;
}

export interface ResolveDistanceResult {
  oneWayMiles: number;
  mode: DistanceMode;
  status: DistanceStatus;
  message?: string;
}

const METERS_PER_MILE = 1609.344;

/** Round the returned one-way miles to 2 decimals so fee-tier boundaries that
 *  use fractional miles (e.g. 19.99 vs 20) classify correctly. */
function milesFromMeters(meters: number): number {
  return Math.round((meters / METERS_PER_MILE) * 100) / 100;
}

function milesFromKm(km: number): number {
  return Math.round(km * 0.621371 * 100) / 100;
}

async function geocodeMapbox(
  address: string,
  token: string,
): Promise<{ lng: number; lat: number } | null> {
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      address,
    )}.json?access_token=${token}&limit=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const feature = json?.features?.[0];
    if (!feature?.center || !Array.isArray(feature.center)) return null;
    return { lng: feature.center[0], lat: feature.center[1] };
  } catch {
    return null;
  }
}

async function mapboxGecodeAndDirections(
  clientAddress: string,
  baseAddress: string,
  token: string,
): Promise<ResolveDistanceResult> {
  const origin = await geocodeMapbox(baseAddress, token);
  const dest = await geocodeMapbox(clientAddress, token);
  if (!origin || !dest) {
    return {
      oneWayMiles: 0,
      mode: "api",
      status: "geocode_failed",
      message: "Could not geocode one or both addresses.",
    };
  }
  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?access_token=${token}&overview=false&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) {
      return { oneWayMiles: 0, mode: "api", status: "error", message: "Directions API error." };
    }
    const json = await res.json();
    const distance = json?.routes?.[0]?.distance; // meters
    if (typeof distance !== "number") {
      return { oneWayMiles: 0, mode: "api", status: "error", message: "Directions API returned no route." };
    }
    return { oneWayMiles: milesFromMeters(distance), mode: "api", status: "ok" };
  } catch {
    return { oneWayMiles: 0, mode: "api", status: "error", message: "Directions request failed." };
  }
}

async function googleDistanceMatrix(
  clientAddress: string,
  baseAddress: string,
  key: string,
): Promise<ResolveDistanceResult> {
  try {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(
      baseAddress,
    )}&destinations=${encodeURIComponent(clientAddress)}&mode=driving&key=${key}`;
    const res = await fetch(url);
    if (!res.ok) {
      return { oneWayMiles: 0, mode: "api", status: "error", message: "Distance Matrix API error." };
    }
    const json = await res.json();
    const element = json?.rows?.[0]?.elements?.[0];
    if (!element) {
      return { oneWayMiles: 0, mode: "api", status: "error", message: "Distance Matrix returned no element." };
    }
    // status could be OK, ZERO_RESULTS, NOT_FOUND, or similar.
    if (element.status !== "OK") {
      return {
        oneWayMiles: 0,
        mode: "api",
        status: element.status === "ZERO_RESULTS" || element.status === "NOT_FOUND"
          ? "geocode_failed"
          : "error",
        message: `Distance Matrix element status: ${element.status}`,
      };
    }
    const meters = element.distance?.value;
    if (typeof meters !== "number") {
      return { oneWayMiles: 0, mode: "api", status: "error", message: "Distance Matrix missing distance." };
    }
    return { oneWayMiles: milesFromMeters(meters), mode: "api", status: "ok" };
  } catch {
    return { oneWayMiles: 0, mode: "api", status: "error", message: "Distance Matrix request failed." };
  }
}

/**
 * Resolve the one-way driving distance (miles) from our base to the client.
 * - manual override: `oneWayMiles` provided -> returned as-is, no API call.
 * - api: geocode clientAddress + baseAddress and call the routing provider
 *   selected by settings.distanceProvider.
 * A missing key returns mode 'api', status 'no_key' so callers can fall back
 * to manual miles on the admin side.
 */
export async function resolveDrivingMiles(
  args: ResolveDistanceArgs,
): Promise<ResolveDistanceResult> {
  if (args.oneWayMiles !== undefined && args.oneWayMiles !== null) {
    return { oneWayMiles: Number(args.oneWayMiles), mode: "manual", status: "ok" };
  }
  const settings = args.settings;
  const client = (args.clientAddress || "").trim();
  const base = (settings?.baseAddress || "").trim();
  if (!client || !base) {
    return {
      oneWayMiles: 0,
      mode: "api",
      status: "geocode_failed",
      message: "Missing client or base address.",
    };
  }

  const provider = settings?.distanceProvider ?? "manual";
  if (provider === "google") {
    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) {
      return { oneWayMiles: 0, mode: "api", status: "no_key", message: "GOOGLE_MAPS_API_KEY not set." };
    }
    return googleDistanceMatrix(client, base, key);
  }
  if (provider === "mapbox") {
    const key = process.env.MAPBOX_API_KEY;
    if (!key) {
      return { oneWayMiles: 0, mode: "api", status: "no_key", message: "MAPBOX_API_KEY not set." };
    }
    return mapboxGecodeAndDirections(client, base, key);
  }
  // manual / no key / unknown provider
  return {
    oneWayMiles: 0,
    mode: "api",
    status: "no_key",
    message: "Distance provider is manual or no api key is configured.",
  };
}
