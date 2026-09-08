/**
 * Stress test: runs the holiday engine + pricing across the real 2026 calendar.
 * Exits non-zero on any failure. Run from /home/team/shared/site:
 *   bun scripts/holiday_stress_test.ts
 */
import {
  isHolidayDate,
  getHolidaySurchargeDays,
  isHolidayStay,
} from "../src/lib/holidays";
import { calculatePrice } from "../src/lib/pricing";

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const pass =
    typeof expected === "number" && typeof actual === "number"
      ? Math.abs((actual as number) - (expected as number)) < 0.001
      : actual === expected;
  const mark = pass ? "PASS" : "FAIL";
  if (!pass) failures++;
  console.log(`[${mark}] ${name} => got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);
}

function d(y: number, m: number, day: number): Date {
  return new Date(y, m - 1, day); // local midnight
}

console.log("=== 2026 recognized holiday date checks (isHolidayDate) ===");
// Memorial Day 2026: last Monday in May = May 25. Window Thu May 21 - Mon May 25.
check("Memorial Day Monday May 25 is holiday", isHolidayDate(d(2026, 5, 25)), true);
check("Window Thu May 21 (Memorial Day weekend) is holiday", isHolidayDate(d(2026, 5, 21)), true);
check("May 20 (Wed before window) NOT holiday", isHolidayDate(d(2026, 5, 20)), false);
// July 4 2026 is Saturday. Window Thu Jul 2 - Mon Jul 6.
check("July 4 (Sat) 2026 is holiday", isHolidayDate(d(2026, 7, 4)), true);
check("Window Mon Jul 6 is holiday", isHolidayDate(d(2026, 7, 6)), true);
check("Jul 7 (Tue after window) NOT holiday", isHolidayDate(d(2026, 7, 7)), false);
// Labor Day 2026: first Monday in Sep = Sep 7. Window Thu Sep 3 - Mon Sep 7.
check("Labor Day Mon Sep 7 is holiday", isHolidayDate(d(2026, 9, 7)), true);
check("Window Thu Sep 3 is holiday", isHolidayDate(d(2026, 9, 3)), true);
// Thanksgiving 2026: 4th Thu Nov = Nov 26. Window Thu Nov 26 - Mon Nov 30.
check("Thanksgiving Thu Nov 26 is holiday", isHolidayDate(d(2026, 11, 26)), true);
check("Window Mon Nov 30 is holiday", isHolidayDate(d(2026, 11, 30)), true);
// Easter Sunday 2026 = Apr 5. Window Thu Apr 2 - Mon Apr 6.
check("Easter Sun Apr 5 is holiday", isHolidayDate(d(2026, 4, 5)), true);
check("Window Thu Apr 2 (Easter weekend) is holiday", isHolidayDate(d(2026, 4, 2)), true);
check("Window Mon Apr 6 (Easter Monday) is holiday", isHolidayDate(d(2026, 4, 6)), true);
check("Apr 1 (Wed before) NOT holiday", isHolidayDate(d(2026, 4, 1)), false);
// New Year's 2026: Jan 1 = Thursday. Window Thu Jan 1 - Mon Jan 5 (continuous Dec24-Jan2 covers 1-2; window extends to Mon).
check("New Year's Jan 1 is holiday", isHolidayDate(d(2026, 1, 1)), true);
check("Jan 3 (Sat) is holiday (New Year's window)", isHolidayDate(d(2026, 1, 3)), true);
check("Jan 6 NOT holiday", isHolidayDate(d(2026, 1, 6)), false);
// Christmas continuous Dec24-Jan2.
check("Christmas Dec 24 is holiday", isHolidayDate(d(2026, 12, 24)), true);
check("Christmas Dec 25 is holiday", isHolidayDate(d(2026, 12, 25)), true);
check("Dec 31 is holiday", isHolidayDate(d(2026, 12, 31)), true);
check("Jan 1 2027 is holiday (continuous)", isHolidayDate(d(2027, 1, 1)), true);
check("Jan 2 2027 is holiday (continuous)", isHolidayDate(d(2027, 1, 2)), true);
// Jan 1 2027 is a Friday, so its Thu-Mon window runs Dec 31 2026 - Mon Jan 4 2027.
check("Jan 3 2027 (Sun) holiday (New Year's window)", isHolidayDate(d(2027, 1, 3)), true);
check("Jan 4 2027 (Mon) holiday (New Year's window)", isHolidayDate(d(2027, 1, 4)), true);
check("Jan 5 2027 (Tue) NOT holiday", isHolidayDate(d(2027, 1, 5)), false);
// Non-holiday dates.
check("Mid Feb workday NOT holiday", isHolidayDate(d(2026, 2, 18)), false);

console.log("\n=== surcharge day counts (getHolidaySurchargeDays) ===");
// 1) Fully holiday Thu-Mon stay, Labor Day: Thu Sep 3 -> Mon Sep 7 (5 days all holiday).
check("Fully holiday Thu-Mon (Sep3-Sep7) days", getHolidaySurchargeDays(d(2026, 9, 3), d(2026, 9, 7)), 5);
// 2) Single-edge overlap: Mon Sep 7 -> Tue Sep 8 (only the Monday is holiday).
check("Single edge day (Mon Sep7-Tue Sep8) days", getHolidaySurchargeDays(d(2026, 9, 7), d(2026, 9, 8)), 1);
// 3) Non-holiday long weekend: Thu Feb 12 -> Mon Feb 16 (no holiday) => 0.
check("Non-holiday long weekend (Feb12-Feb16) days", getHolidaySurchargeDays(d(2026, 2, 12), d(2026, 2, 16)), 0);
// 4) Christmas continuous: Dec 24 2026 -> Jan 2 2027 (10 days all holiday).
check("Christmas Dec24 2026-Jan2 2027 days", getHolidaySurchargeDays(d(2026, 12, 24), d(2027, 1, 2)), 10);
// 6) Same-day on a holiday: Dec 25 only.
check("Same-day Dec 25 days", getHolidaySurchargeDays(d(2026, 12, 25), d(2026, 12, 25)), 1);
// A fully non-holiday single day.
check("Same-day non-holiday (Feb 18) days", getHolidaySurchargeDays(d(2026, 2, 18), d(2026, 2, 18)), 0);

console.log("\n=== end-to-end pricing (calculatePrice) ===");
// 1) Fully holiday Thu-Mon Labor Day: 1 adult dog, arrival 10:00 Sep 3, departure 16:00 Sep 7.
{
  const p = calculatePrice({
    arrivalDate: d(2026, 9, 3), arrivalTime: "10:00",
    departureDate: d(2026, 9, 7), departureTime: "16:00",
    adultDogs: 1, puppies: 0, cats: 0, kittens: 0, otherSpeciesCount: 0,
  });
  check("Dog holiday stay isHoliday", p.isHoliday, true);
  check("Dog holiday stay holidayDays", p.holidayDays, 5);
  check("Dog holiday stay holidaySurcharge", p.holidaySurcharge, 75);
  check("Dog holiday stay total (5 full @75 + 75)", p.total, 450);
  check("Dog base rate is plain 75 (no 75->90 bump)", p.breakdown.find(b => b.label === "First adult dog")?.rate, 75);
  check("Breakdown has Holiday surcharge item", p.breakdown.some(b => b.label === "Holiday surcharge" && b.rate === 15 && b.days === 5), true);
}
// 2) Single edge day overlap right after Labor Day: 1 adult dog, arrival Mon Sep7 10:00, departure Tue Sep8 16:00.
{
  const p = calculatePrice({
    arrivalDate: d(2026, 9, 7), arrivalTime: "10:00",
    departureDate: d(2026, 9, 8), departureTime: "16:00",
    adultDogs: 1, puppies: 0, cats: 0, kittens: 0, otherSpeciesCount: 0,
  });
  check("Edge overlap isHoliday", p.isHoliday, true);
  check("Edge overlap holidayDays", p.holidayDays, 1);
  check("Edge overlap holidaySurcharge", p.holidaySurcharge, 15);
  check("Edge overlap total (2 full @75 + 15)", p.total, 165);
}
// 3) Non-holiday long weekend: 1 adult dog, Thu Feb12 10:00 -> Mon Feb16 16:00.
{
  const p = calculatePrice({
    arrivalDate: d(2026, 2, 12), arrivalTime: "10:00",
    departureDate: d(2026, 2, 16), departureTime: "16:00",
    adultDogs: 1, puppies: 0, cats: 0, kittens: 0, otherSpeciesCount: 0,
  });
  check("Non-holiday weekend isHoliday", p.isHoliday, false);
  check("Non-holiday weekend holidayDays", p.holidayDays, 0);
  check("Non-holiday weekend holidaySurcharge", p.holidaySurcharge, 0);
  check("Non-holiday weekend total (5 full @75, no surcharge)", p.total, 375);
}
// 4) Christmas continuous: 1 adult dog, Dec24 2026 10:00 -> Jan2 2027 16:00.
{
  const p = calculatePrice({
    arrivalDate: d(2026, 12, 24), arrivalTime: "10:00",
    departureDate: d(2027, 1, 2), departureTime: "16:00",
    adultDogs: 1, puppies: 0, cats: 0, kittens: 0, otherSpeciesCount: 0,
  });
  check("Christmas stay holidayDays", p.holidayDays, 10);
  check("Christmas stay holidaySurcharge", p.holidaySurcharge, 150);
  check("Christmas stay total (10 full @75 + 150)", p.total, 900);
}
// 5) Cat-only holiday stay: 1 cat, Labor Day Thu Sep3 10:00 -> Mon Sep7 16:00. MUST still get $15/night.
{
  const p = calculatePrice({
    arrivalDate: d(2026, 9, 3), arrivalTime: "10:00",
    departureDate: d(2026, 9, 7), departureTime: "16:00",
    adultDogs: 0, puppies: 0, cats: 1, kittens: 0, otherSpeciesCount: 0,
  });
  check("Cat-only holiday isHoliday", p.isHoliday, true);
  check("Cat-only holiday holidayDays", p.holidayDays, 5);
  check("Cat-only holiday holidaySurcharge", p.holidaySurcharge, 75);
  check("Cat-only holiday total (5 full @35 + 75)", p.total, 250);
}
// 6) Same-day on a holiday: 1 cat, arrival Dec25 10:00 departure Dec25 16:00.
{
  const p = calculatePrice({
    arrivalDate: d(2026, 12, 25), arrivalTime: "10:00",
    departureDate: d(2026, 12, 25), departureTime: "16:00",
    adultDogs: 0, puppies: 0, cats: 1, kittens: 0, otherSpeciesCount: 0,
  });
  check("Same-day holiday isHoliday", p.isHoliday, true);
  check("Same-day holiday holidayDays", p.holidayDays, 1);
  check("Same-day holiday holidaySurcharge", p.holidaySurcharge, 15);
  check("Same-day holiday total (1 full @35 + 15)", p.total, 50);
}

console.log("\n=== isHolidayStay helper ===");
check("isHolidayStay (non-holiday)", isHolidayStay(d(2026, 2, 12), d(2026, 2, 16)), false);
check("isHolidayStay (holiday)", isHolidayStay(d(2026, 9, 6), d(2026, 9, 8)), true);

if (failures === 0) {
  console.log("\nALL STRESS TESTS PASSED");
  process.exit(0);
} else {
  console.log(`\n${failures} STRESS TEST(S) FAILED`);
  process.exit(1);
}
