/**
 * TEMP test script: send ONE real deposit-received confirmation email through
 * the live Resend integration to the owner, using the exact deposit path
 * (buildDepositReceivedBody + buildDepositReceivedHtml + DEPOSIT_RECEIVED_SUBJECT)
 * so they can review it. The subject is clearly labeled TEST so it can never
 * be mistaken for a real send.
 */
import { writeFileSync } from "node:fs";
import {
  buildDepositReceivedBody,
  buildDepositReceivedHtml,
  sendEmail,
} from "../src/lib/email";

const sample = {
  clientName: "Jane Sample",
  clientEmail: "jen.johnpetservices@proton.me", // owner, for the preview
  arrivalDate: "2026-10-02",
  departureDate: "2026-10-06",
  totalPrice: 800,
  depositAmount: 400,
  remainingBalance: 400,
  petNames: "Bella and Max",
};

const subject = "TEST: Your Booking Is Finalized!";
const body = buildDepositReceivedBody(sample as never);
const html = buildDepositReceivedHtml(sample as never);

// Persist the HTML locally so the layout can be reviewed/checked too.
writeFileSync("/tmp/deposit-received-preview.html", html);

console.log("=== PLAIN TEXT BODY ===");
console.log(body);
console.log("\n=== HTML length:", html.length, "chars ===");

// Copy check (owner rule: no hyphens, no em dashes).
const hasHyphenOrEm = (s: string) => s.includes("-") || s.includes("—");
console.log("Body free of hyphens/em dashes:", !hasHyphenOrEm(body));
console.log("HTML free of hyphens/em dashes:", !hasHyphenOrEm(html));
console.log("Subject free of hyphens/em dashes:", !hasHyphenOrEm(subject));

console.log(
  "Header 'Your Booking Is Finalized!':",
  html.includes("Your Booking Is Finalized!"),
);
console.log(
  "Opening 'received your deposit' + 'secured':",
  body.includes("We've received your deposit and your dates are now officially secured."),
);
console.log(
  "Booking details: deposit paid + remaining balance:",
  body.includes("Deposit amount paid:") && body.includes("Remaining balance:"),
);
console.log(
  "Reminder block present:",
  body.includes("Just As A Reminder:") &&
    body.includes("The remaining balance is due prior to or upon arrival."),
);
console.log(
  "Removed old copy:",
  !body.includes("Total Price (already agreed)") &&
    !body.includes("We're looking forward to caring") &&
    !body.includes("Thank you for trusting us with your home and your pets"),
);
console.log(
  "Pet names in closing:",
  body.includes("Thanks again for trusting us with your home and Bella and Max."),
);
console.log(
  "#faq deep link present:",
  body.includes("https://jenjohnpetservices.ctonew.app/#faq") &&
    html.includes("https://jenjohnpetservices.ctonew.app/#faq"),
);

await sendEmail({
  to: sample.clientEmail,
  subject,
  body,
  html,
});
