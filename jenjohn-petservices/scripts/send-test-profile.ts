/**
 * TEMP test script: send ONE real "your pet profile is saved, here's your code"
 * email through the live Resend integration to the owner, using the exact
 * profile-saved path (buildProfileSavedBody + buildProfileSavedHtml +
 * PROFILE_SAVED_SUBJECT) so they can review it. Subject is clearly labeled TEST.
 */
import { writeFileSync } from "node:fs";
import {
  buildProfileSavedBody,
  buildProfileSavedHtml,
  sendEmail,
} from "../src/lib/email";

const sample = {
  clientName: "Jane Sample",
  clientEmail: "jen.johnpetservices@proton.me", // owner, for the preview
  returnCode: "K4T7QM",
  petNames: "Bella and Max",
};

const subject = "TEST: Your Pet Profile Is Saved!";
const body = buildProfileSavedBody(sample as never);
const html = buildProfileSavedHtml(sample as never);

// Persist the HTML locally so the layout can be reviewed/checked too.
writeFileSync("/tmp/profile-saved-preview.html", html);

console.log("=== PLAIN TEXT BODY ===");
console.log(body);
console.log("\n=== HTML length:", html.length, "chars ===");

// Copy check (owner rule: no hyphens, no em dashes).
const hasHyphenOrEm = (s: string) => s.includes("-") || s.includes("—");
console.log("Body free of hyphens/em dashes:", !hasHyphenOrEm(body));
console.log("HTML free of hyphens/em dashes:", !hasHyphenOrEm(html));
console.log("Subject free of hyphens/em dashes:", !hasHyphenOrEm(subject));

console.log("Header 'Your Pet Profile Is Saved!':", html.includes("Your Pet Profile Is Saved!"));
console.log("Return code rendered:", body.includes("K4T7QM") && html.includes("K4T7QM"));
console.log("Explains where to enter the code:",
  body.includes("enter this code along with your email and we'll fill in"));
console.log("Saves-details line present:",
  body.includes("We've saved Bella and Max's details so your next booking takes just a few seconds."));

await sendEmail({
  to: sample.clientEmail,
  subject,
  body,
  html,
});
