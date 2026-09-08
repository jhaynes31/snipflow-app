/**
 * TEMP test script: send ONE real approval (confirmation) email through the
 * live Resend integration to the owner, using the exact approval-client path
 * (buildApprovalClientBody + buildApprovalClientHtml) so they can review the
 * inline QR payment layout and the copy changes.
 */
import { writeFileSync } from "node:fs";
import {
  buildApprovalClientBody,
  buildApprovalClientHtml,
  paymentAttachments,
  sendEmail,
} from "../src/lib/email";

const sample = {
  clientName: "Jane Sample",
  clientEmail: "jen.johnpetservices@proton.me", // owner, for the preview
  clientPhone: "(555) 123-4567",
  arrivalDate: "2026-10-02",
  arrivalTime: "10:00 AM",
  departureDate: "2026-10-06",
  departureTime: "4:00 PM",
  pets: { adultDogs: 2, cats: 0 },
  isHoliday: false,
  totalPrice: 800,
  petNames: "Bella, Max",
  petDetails: [
    { name: "Bella", breed: "Labrador", age: "4", type: "adultDog", species: "" },
    { name: "Max", breed: "Golden Retriever", age: "6", type: "adultDog", species: "" },
  ],
};

const BALANCE_PARAGRAPH =
  "The remaining balance is due prior to or upon arrival. If we have not received the remaining payment within three hours of our arrival, we will be unable to proceed with the booking, and the client will need to make alternative arrangements for the remainder of the stay. We ask that any payment delays be communicated to us in advance.";

const subject = "TEST: Booking Confirmation (letter greeting)";
const body = buildApprovalClientBody(sample as never);
const html = buildApprovalClientHtml(sample as never);

// Persist the HTML locally so the layout can be reviewed/checked too.
writeFileSync("/tmp/approval-preview.html", html);

console.log("=== PLAIN TEXT BODY ===");
console.log(body);
console.log("\n=== HTML length:", html.length, "chars ===");

// New wording checks (owner rule: no hyphens, no em dashes).
const hasHyphenOrEm = (s: string) => s.includes("-") || s.includes("—");
console.log("Body free of hyphens/em dashes:",
  !hasHyphenOrEm(body));
console.log("HTML free of hyphens/em dashes:",
  !hasHyphenOrEm(html));
console.log("Header 'Your Booking Is Approved':",
  html.includes("Your Booking Is Approved") && !html.includes("Your Booking is Confirmed!"));
console.log("Opening folds client name in one paragraph:",
  body.includes("Hi Jane Sample, Jen & John are available to watch Bella and Max on") &&
    !body.includes("Hi Jane Sample,\n"));
console.log("HTML opening (escaped amp):",
  html.includes("Hi Jane Sample, Jen &amp; John are available to watch Bella and Max on "));
console.log("Deposit line uses 'To finalize your stay':",
  body.includes("To finalize your stay, please send your deposit") &&
    html.includes("To finalize your stay, please send your deposit") &&
    !body.includes("To secure your booking") &&
    !html.includes("To secure your booking"));
console.log("Balance paragraph present in plain-text body:",
  body.includes(BALANCE_PARAGRAPH));
console.log("Balance paragraph present in HTML:",
  html.includes(BALANCE_PARAGRAPH));
console.log("Balance paragraph free of hyphens/em dashes:",
  !hasHyphenOrEm(BALANCE_PARAGRAPH));
console.log("Closing uses 'care of your home and Bella and Max':",
  body.includes("Thank you for trusting us with the care of your home and Bella and Max.") &&
    html.includes("Thank you for trusting us with the care of your home and Bella and Max."));
console.log("Referral content removed (body+html):",
  !body.includes("Refer them our way") && !html.includes("Refer them our way") &&
    !body.includes("10% off your next stay") && !html.includes("10% off your next stay") &&
    !body.includes("One referral discount") && !html.includes("One referral discount"));
console.log("'we can't wait to meet them' removed:",
  !body.includes("We can't wait to meet them") && !html.includes("We can't wait to meet them"));
console.log("\n=== HTML checks (QR/payment layout) ===");
console.log("HTML has 3 cid QR refs (Venmo/PayPal/Cash App):",
  ["cid:payment-venmo@email", "cid:payment-paypal@email", "cid:payment-cashapp@email"]
    .every((cid) => html.includes(cid)),
  "| Zelle QR absent:",
  !html.includes("cid:payment-zelle@email"));
console.log("3 QR cards together in one row:",
  (html.match(/cid:payment-(?:venmo|paypal|cashapp)@email/g) || []).length === 3 &&
    html.includes("Venmo") && html.includes("PayPal") && html.includes("Cash App"));
console.log("Full width Zelle bar below with exact wording:",
  html.includes(">Zelle</div>") &&
    html.includes("jen.johnpetservices@proton.me") &&
    html.includes("Zelle isn't scan friendly, so just open your bank's app and send to this email."));
console.log("Zelle bar NOT wrapped as a link/card in the QR row:",
  !html.includes(`href="mailto:jen.johnpetservices@proton.me"`));
console.log("HTML has 0 remote /payment/ URLs:",
  !html.includes("/payment/payment-qr-"));

const attachments = paymentAttachments();
console.log("Attachments:", attachments.length, "| CIDs:",
  attachments.map((a) => a.content_id).join(", "));
console.log("paymentAttachments excludes Zelle:",
  attachments.length === 3 &&
  !attachments.some((a) => a.content_id === "payment-zelle@email"));

await sendEmail({
  to: sample.clientEmail,
  subject,
  body,
  html,
  attachments,
});
