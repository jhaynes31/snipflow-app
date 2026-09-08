/**
 * Unit checks for the phase one security work. Pure logic only, no network.
 * Run: bun scripts/phase1-tests.ts   (exits non-zero on any failure)
 */
import {
  createSessionValue,
  verifySessionValue,
  parseCookies,
  RateLimiter,
} from "../src/lib/session";
import {
  validateBookingRequest,
  priceValidatedBooking,
  findAvailabilityConflict,
  timeToMinutes,
  stayDates,
} from "../src/lib/bookingValidation";

let failures = 0;
function check(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok ? "" : ` => got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
  if (!ok) failures++;
}

process.env.SESSION_SECRET = "test-secret-at-least-sixteen-chars";

console.log("=== sessions ===");
{
  const v = createSessionValue();
  check("fresh session verifies", verifySessionValue(v), true);
  check("expired session rejected", verifySessionValue(v, Date.now() + 25 * 3600 * 1000), false);
  check("tampered signature rejected", verifySessionValue(v.slice(0, -2) + "zz"), false);
  const [payload, sig] = v.split(".");
  const forged = Buffer.from(JSON.stringify({ exp: 9999999999, n: "x" })).toString("base64url") + "." + sig;
  check("forged payload rejected", verifySessionValue(forged), false);
  check("garbage rejected", verifySessionValue("admin_auth=true"), false);
  check("empty rejected", verifySessionValue(""), false);
  check("payload part is not the secret", payload.includes("test-secret"), false);
  check("cookie parse", parseCookies("a=1; admin_session=abc.def; b=2")["admin_session"], "abc.def");
  const rl = new RateLimiter(3, 1000);
  check("rate limit allows first three", [rl.allow("k"), rl.allow("k"), rl.allow("k")], [true, true, true]);
  check("rate limit blocks fourth", rl.allow("k"), false);
  check("rate limit resets after window", rl.allow("k", Date.now() + 2000), true);
}

console.log("\n=== booking validation ===");
const TODAY = "2026-09-08";
const good = {
  clientName: "Annie W.",
  clientEmail: "annie@example.com",
  clientAddress: "1 Main St, Morgantown, WV",
  arrivalDate: "2026-10-05", // Monday
  arrivalTime: "10:00",
  departureDate: "2026-10-10", // Saturday
  departureTime: "17:00",
  petDetails: [
    { name: "Max", type: "adultDog", breed: "Lab" },
    { name: "Cali", type: "cat" },
  ],
  notes: "  Front door sticks  ",
  totalPrice: 1, // attacker-controlled; must be ignored
};
{
  const r = validateBookingRequest(good, TODAY);
  check("valid request accepted", r.ok, true);
  if (r.ok) {
    check("pets derived from cards", r.value.pets, { adultDogs: 1, puppies: 0, cats: 1, kittens: 0, otherSpecies: [] });
    check("pet names derived", r.value.petNames, "Max, Cali");
    check("notes trimmed", r.value.notes, "Front door sticks");
    const p = priceValidatedBooking(r.value);
    // Brief worked example: Mon 10am -> Sat 5pm, one dog + one sharing cat = $630
    check("server price matches brief worked example", p.total, 630);
    check("six full days", [p.fullDays, p.halfDays], [6, 0]);
  }
  const bad = (patch: Record<string, unknown>) => {
    const res = validateBookingRequest({ ...good, ...patch }, TODAY);
    return res.ok ? "ACCEPTED" : res.error;
  };
  check("missing name", bad({ clientName: " " }), "Client name is required");
  check("bad email", bad({ clientEmail: "nope" }), "Enter a valid email address.");
  check("bad date", bad({ arrivalDate: "2026-02-30" }), "Arrival date is not a valid date.");
  check("bad time", bad({ arrivalTime: "25:00" }), "Arrival time is not a valid time.");
  check("past arrival", bad({ arrivalDate: "2026-09-01" }), "Arrival date cannot be in the past.");
  check("departure before arrival", bad({ departureDate: "2026-10-01" }), "Departure date must be after arrival date.");
  check("same-day rejected", bad({ departureDate: "2026-10-05" }), "Departure date must be after arrival date.");
  check("no pets", bad({ petDetails: [] }), "Please add at least one pet.");
  check("unnamed pet", bad({ petDetails: [{ name: "", type: "cat" }] }), "Please add a name for each pet.");
  check("unknown pet type", bad({ petDetails: [{ name: "Rex", type: "dragon" }] }), "Unknown pet type for Rex.");
  check("pets as object rejected", bad({ petDetails: { adultDogs: 1 } }), "Please add at least one pet.");
  check("non-object body", validateBookingRequest("x", TODAY).ok, false);
}

console.log("\n=== availability conflicts ===");
{
  const blocked = ["2026-10-07"];
  const partial = [{ date: "2026-10-05", afterTime: "11:00 AM" }];
  check("free range ok", findAvailabilityConflict("2026-10-12", "10:00", "2026-10-14", blocked, partial), null);
  check(
    "blocked middle day rejected",
    findAvailabilityConflict("2026-10-06", "10:00", "2026-10-08", blocked, partial),
    "2026-10-07 is no longer available. Please choose different dates.",
  );
  check(
    "partial arrival day, arrival too early",
    findAvailabilityConflict("2026-10-05", "10:00", "2026-10-06", blocked, partial),
    "On 2026-10-05 we can only accept arrivals after 11:00 AM. Please choose a later arrival time.",
  );
  check("partial arrival day, arrival later ok", findAvailabilityConflict("2026-10-05", "13:00", "2026-10-06", blocked, partial), null);
  check(
    "partial day mid-stay rejected",
    findAvailabilityConflict("2026-10-04", "10:00", "2026-10-06", blocked, partial),
    "2026-10-05 is only available for arrivals later in the day. Please choose different dates.",
  );
  check("time parse 24h", timeToMinutes("15:30"), 930);
  check("time parse 12h", timeToMinutes("3:30 PM"), 930);
  check("time parse midnight", timeToMinutes("12:00 AM"), 0);
  check("stay dates inclusive", stayDates("2026-10-30", "2026-11-02"), ["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]);
}

if (failures === 0) {
  console.log("\nALL PHASE 1 TESTS PASSED");
  process.exit(0);
}
console.log(`\n${failures} PHASE 1 TEST(S) FAILED`);
process.exit(1);
