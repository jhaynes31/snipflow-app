/**
 * Verify email body pricing without sending anything.
 *
 * Regression test for the price-formatting bug: formatPrice used to divide
 * by 100, so a $520.00 total rendered as "$5.20". Stored values are WHOLE
 * DOLLARS (520 = $520.00), matching the fix in src/routes/admin.tsx.
 *
 * Run: bun scripts/verify-email-pricing.ts   (from /home/team/shared/site)
 * Builders are pure — no email is sent, no RESEND_API_KEY needed.
 */

import {
  buildNewRequestBody,
  buildApprovalClientBody,
  buildApprovalAdminBody,
} from "../src/lib/email";
import type { PetDetail } from "../src/lib/petDetails";

const petDetails: PetDetail[] = [
  { name: "Bella", breed: "Labrador", age: "4", type: "adultDog" },
  { name: "Pip", species: "Parrot", type: "other" },
];

// Realistic request: 8 nights at $65/night = $520.00 total, $260.00 deposit.
const payload = {
  clientName: "Jane Test",
  clientEmail: "jane@example.com",
  clientPhone: "(304) 555-0134",
  clientAddress: "123 Maple St, Morgantown WV",
  arrivalDate: "2026-08-14",
  arrivalTime: "09:00",
  departureDate: "2026-08-22",
  departureTime: "17:00",
  pets: { adultDogs: 1, puppies: 0, cats: 0, kittens: 0, otherSpecies: [{ name: "Parrot", quantity: 1 }] },
  isHoliday: false,
  totalPrice: 520, // whole dollars
  petDetails,
  petNames: "Bella, Pip",
  notes: "Bella is shy on day one.",
};

const newRequestBody = buildNewRequestBody(payload as never);
const approvalClientBody = buildApprovalClientBody(payload as never);
const approvalAdminBody = buildApprovalAdminBody(payload as never);

const all = [newRequestBody, approvalClientBody, approvalAdminBody];

// ── Assertions ──
let failures = 0;
const expectContains = (label: string, text: string, needle: string) => {
  const ok = text.includes(needle);
  if (!ok) {
    failures++;
    console.error(`FAIL: ${label} missing "${needle}"`);
  }
};
const expectNoWrongScale = (label: string, text: string) => {
  // Any "$X.YZ" where the dollars part is 1-3 digits that are NOT 520/260
  // indicates a cents/dollar mis-scale.
  const bad = text.match(/\$\d{1,4}\.\d{2}/g)?.filter((m) => m !== "$520.00" && m !== "$260.00") ?? [];
  if (bad.length > 0) {
    failures++;
    console.error(`FAIL: ${label} has wrong-scale prices: ${bad.join(", ")}`);
  }
};

expectContains("new-request total", newRequestBody, "Total: $520.00");
expectContains("approval client total", approvalClientBody, "Total Price: $520.00");
expectContains("approval client deposit", approvalClientBody, "deposit of $260.00");
expectContains("approval admin deposit", approvalAdminBody, "Deposit of $260.00");
expectContains("approval admin total", approvalAdminBody, "Total: $520.00");

expectNoWrongScale("new-request", newRequestBody);
expectNoWrongScale("approval client", approvalClientBody);
expectNoWrongScale("approval admin", approvalAdminBody);

// ── Render the money lines for the report ──
console.log("\n=== NEW-REQUEST EMAIL (to Jen & John) ===");
console.log(newRequestBody.split("\n").filter((l) => l.includes("$")).join("\n"));

console.log("\n=== APPROVAL EMAIL (to client) — money lines ===");
console.log(
  approvalClientBody
    .split("\n")
    .filter((l) => l.includes("$") || l.includes("Zelle") || l.includes("Venmo"))
    .join("\n"),
);

console.log("\n=== APPROVAL EMAIL (admin notification) — money lines ===");
console.log(approvalAdminBody.split("\n").filter((l) => l.includes("$")).join("\n"));

if (failures > 0) {
  console.error(`\n${failures} assertion(s) FAILED`);
  process.exit(1);
}
console.log("\nALL PRICE ASSERTIONS PASSED ✓");
