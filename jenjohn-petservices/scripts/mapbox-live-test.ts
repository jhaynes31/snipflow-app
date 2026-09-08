import { resolveDrivingMiles } from "../src/lib/distance";
import { DEFAULT_MEET_GREET_SETTINGS, calculateMeetGreetFee, formatFee } from "../src/lib/meetGreet";
const S = { ...DEFAULT_MEET_GREET_SETTINGS, distanceProvider: "mapbox" as const };
async function main() {
  const r = await resolveDrivingMiles({ clientAddress: "McKee Dr, Morgantown, WV 26505", settings: S });
  console.log("resolve near:", JSON.stringify(r));
  if (r.status === "ok") {
    const fee = calculateMeetGreetFee(r.oneWayMiles, S);
    console.log("near fee:", JSON.stringify(fee), "formatted:", formatFee(fee.fee));
  }
  const far = await resolveDrivingMiles({ clientAddress: "New York, NY 10001", settings: S });
  console.log("resolve far:", JSON.stringify(far));
  if (far.status === "ok") {
    const fee = calculateMeetGreetFee(far.oneWayMiles, S);
    console.log("far fee:", JSON.stringify(fee));
  }
  // nav fail address
  const bad = await resolveDrivingMiles({ clientAddress: "zzzz not a real place 99999", settings: S });
  console.log("resolve bad:", JSON.stringify(bad));
}
main();
