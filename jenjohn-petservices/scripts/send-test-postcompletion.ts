/**
 * TEMP test script: send ONE real end-of-stay thank-you email through the
 * live Resend integration to the owner, using the exact post-completion path
 * (buildPostCompletionBody + buildPostCompletionHtml) so they can review the
 * redesigned review cards, inline QR tip layout, and copy changes.
 */
import { writeFileSync } from "node:fs";
import {
  buildPostCompletionBody,
  buildPostCompletionHtml,
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

const subject = "TEST: End of Stay (Zelle bar layout)";
const body = buildPostCompletionBody(sample as never);
const html = buildPostCompletionHtml(sample as never);

// Persist the HTML locally so the layout can be reviewed/checked too.
writeFileSync("/tmp/postcompletion-preview.html", html);

console.log("=== PLAIN TEXT BODY ===");
console.log(body);
console.log("\n=== HTML length:", html.length, "chars ===");
console.log("Opening list check (Bella, and Max):",
  html.includes("your home, Bella, and Max during your recent trip"));
console.log("Review icons consistent (G/F/N letters, no house emoji):",
  html.includes(">G<") && html.includes(">F<") && html.includes(">N<") && !html.includes("🏡"));
console.log("HTML QR refs: Venmo/PayPal/CashApp present, Zelle absent:",
  ["cid:payment-venmo@email", "cid:payment-paypal@email", "cid:payment-cashapp@email"].every((c) => html.includes(c)),
  "| Zelle absent:", !html.includes("cid:payment-zelle@email"));
console.log("3 QR cards together in one row:",
  (html.match(/cid:payment-(?:venmo|paypal|cashapp)@email/g) || []).length === 3 &&
    html.includes("Venmo") && html.includes("PayPal") && html.includes("Cash App"));
console.log("Full width Zelle bar below with exact wording:",
  html.includes(">Zelle</div>") &&
    html.includes("jen.johnpetservices@proton.me") &&
    html.includes("Zelle isn't scan friendly, so just open your bank's app and send to this email."));
console.log("Zelle bar NOT wrapped as a link/card in the QR row:",
  !html.includes(`href="mailto:jen.johnpetservices@proton.me"`));

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
