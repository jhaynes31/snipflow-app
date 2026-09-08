import { createServerFn } from "@tanstack/react-start";
import { formatFee, DEFAULT_MEET_GREET_SETTINGS, type MeetGreetSettings } from "~/lib/meetGreet";
import { computeMeetGreet, loadMeetGreetSettings } from "~/lib/meetGreetServer";

async function convexMutation(name: string, args: Record<string, unknown> = {}) {
  const base = process.env.CONVEX_DEPLOYMENT_URL;
  if (!base) throw new Error("CONVEX_DEPLOYMENT_URL not set");
  const res = await fetch(`${base}/api/mutation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: `mutations:${name}`, args }),
  });
  if (!res.ok) throw new Error(`Convex mutation ${name} failed: HTTP ${res.status}`);
  return res.json();
}

export interface MeetGreetCalcResult {
  oneWayMiles: number;
  mode: "manual" | "api";
  status: "ok" | "no_key" | "geocode_failed" | "error";
  message?: string;
  fee: number;
  outsideArea: boolean;
  tier: string;
  formattedFee: string;
  settings: MeetGreetSettings;
}

/** Current settings, for the admin editor. */
export const meetGreetGetSettings = createServerFn({ method: "GET" }).handler(
  async () => {
    return { success: true, data: await loadMeetGreetSettings() };
  },
);

/**
 * Compute a Meet & Greet travel fee from either manual miles or a client
 * address (auto distance via the configured provider). Server-side only so the
 * provider API key never reaches the client bundle.
 */
export const meetGreetCalculate = createServerFn({ method: "POST" })
  .validator((data: { oneWayMiles?: number; clientAddress?: string }) => data)
  .handler(async ({ data }): Promise<MeetGreetCalcResult> => {
    const { distance, fee, settings } = await computeMeetGreet({
      oneWayMiles: data.oneWayMiles,
      clientAddress: data.clientAddress,
    });
    return {
      oneWayMiles: distance.oneWayMiles,
      mode: distance.mode,
      status: distance.status,
      message: distance.message,
      fee: fee.fee,
      outsideArea: fee.outsideArea,
      tier: fee.tier,
      formattedFee: formatFee(fee.fee),
      settings,
    };
  });

/**
 * Persist admin edits to the Meet & Greet settings. Numeric knobs are validated
 * as finite numbers; provider must be google/mapbox/manual.
 */
export const meetGreetSaveSettings = createServerFn({ method: "POST" })
  .validator(
    (data: {
      baseAddress?: string;
      flatFee?: number;
      freeRadiusMiles?: number;
      feeStartsAtOneWay?: number;
      ratePerMile?: number;
      feeCap?: number;
      outsideServiceAreaMiles?: number;
      distanceProvider?: string;
      virtualNote?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const numeric: string[] = [
      "flatFee",
      "freeRadiusMiles",
      "feeStartsAtOneWay",
      "ratePerMile",
      "feeCap",
      "outsideServiceAreaMiles",
    ];
    for (const k of numeric) {
      const v = (data as any)[k];
      if (v !== undefined && (!Number.isFinite(Number(v)) || Number(v) < 0)) {
        return { success: false, error: `${k} must be a non negative number.` };
      }
    }
    if (
      data.distanceProvider !== undefined &&
      !["google", "mapbox", "manual"].includes(data.distanceProvider)
    ) {
      return { success: false, error: "distanceProvider must be google, mapbox or manual." };
    }
    const entries: { key: string; value?: string }[] = [];
    const str = (k: string, v?: string | number) => {
      if (v !== undefined) entries.push({ key: k, value: String(v) });
    };
    str("baseAddress", data.baseAddress);
    str("flatFee", data.flatFee);
    str("freeRadiusMiles", data.freeRadiusMiles);
    str("feeStartsAtOneWay", data.feeStartsAtOneWay);
    str("ratePerMile", data.ratePerMile);
    str("feeCap", data.feeCap);
    str("outsideServiceAreaMiles", data.outsideServiceAreaMiles);
    str("distanceProvider", data.distanceProvider);
    str("virtualNote", data.virtualNote);
    await convexMutation("saveSiteSettings", { entries });
    return { success: true };
  });

// Reference to keep the default import used (avoids unused-import noise if the
// handler is later simplified).
void DEFAULT_MEET_GREET_SETTINGS;
