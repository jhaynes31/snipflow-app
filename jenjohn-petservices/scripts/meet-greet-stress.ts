/**
 * Stress test for calculateMeetGreetFee + resolveDrivingMiles manual path.
 * Run: bun scripts/meet-greet-stress.ts
 */
import { calculateMeetGreetFee, DEFAULT_MEET_GREET_SETTINGS, formatFee } from "../src/lib/meetGreet";
import { resolveDrivingMiles } from "../src/lib/distance";

const S = DEFAULT_MEET_GREET_SETTINGS;

let pass = 0;
let fail = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    pass++;
    console.log(`  PASS  ${name}  -> ${a}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name}  expected ${e} got ${a}`);
  }
}

async function main() {
  console.log("=== Worked QA examples ===");
  const cases: Array<[number, number, boolean, string]> = [
    [10, 0, false, "free"],
    [25, 75, false, "flat"],
    [30, 77.5, false, "formula"],
    [40, 102.5, false, "formula"],
    [43, 110, false, "formula"],
    [45, 110, false, "formula"],
    [49, 110, false, "formula"],
    [50, 0, true, "outside"],
  ];
  for (const [mi, fee, outside, tier] of cases) {
    const r = calculateMeetGreetFee(mi, S);
    check(`${mi} mi fee`, r.fee, fee);
    check(`${mi} mi outside`, r.outsideArea, outside);
    check(`${mi} mi tier`, r.tier, tier);
  }

  console.log("=== Boundary cases ===");
  const bounds: Array<[number, number, boolean, string]> = [
    [0, 0, false, "free"],
    [19.99, 0, false, "free"],
    [20, 75, false, "flat"],
    [29.99, 75, false, "flat"],
    [30, 77.5, false, "formula"],
    [49.99, 110, false, "formula"],
    [50, 0, true, "outside"],
    [100, 0, true, "outside"],
  ];
  for (const [mi, fee, outside, tier] of bounds) {
    const r = calculateMeetGreetFee(mi, S);
    check(`bound ${mi} mi fee`, r.fee, fee);
    check(`bound ${mi} mi outside`, r.outsideArea, outside);
    check(`bound ${mi} mi tier`, r.tier, tier);
  }

  console.log("=== resolveDrivingMiles manual path ===");
  const m25 = await resolveDrivingMiles({ oneWayMiles: 25, clientAddress: "x" });
  check("manual 25 mode", m25.mode, "manual");
  check("manual 25 miles", m25.oneWayMiles, 25);
  check("manual 25 status", m25.status, "ok");

  const m19 = await resolveDrivingMiles({ oneWayMiles: 19.99 });
  check("manual 19.99 miles", m19.oneWayMiles, 19.99);

  console.log("=== manual leads to correct fee (off-platform calc) ===");
  const f25 = calculateMeetGreetFee((await resolveDrivingMiles({ oneWayMiles: 25 })).oneWayMiles, S);
  check("manual 25 -> fee", f25.fee, 75);
  const f43 = calculateMeetGreetFee((await resolveDrivingMiles({ oneWayMiles: 43 })).oneWayMiles, S);
  check("manual 43 -> capped fee", f43.fee, 110);

  console.log("=== formatFee ===");
  check("format 77.5", formatFee(77.5), "$77.50");
  check("format 110", formatFee(110), "$110.00");
  check("format 0", formatFee(0), "$0.00");

  console.log(`\nRESULT: ${pass} pass, ${fail} fail`);
  process.exit(fail === 0 ? 0 : 1);
}

main();
