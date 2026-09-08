/**
 * Owner editable client emails. The owner edits the plain text body (and an
 * optional subject line) from the admin panel; the text is stored in Convex and
 * applied at send time. When the owner has not edited an email, the built in
 * default copy is used unchanged.
 *
 * The load/save helpers are client-safe re-exports from apiClient.ts, which
 * calls the plain /api/action endpoint (never TanStack /_serverFn).
 */
import {
  loadEmailTemplates,
  saveEmailTemplate,
} from "~/lib/apiClient";

export interface EmailTemplateDef {
  slug: string;
  label: string;
  description: string;
  header: string; // title shown in the HTML version when the owner edits the email
  defaultSubject: string;
}

export const EMAIL_TEMPLATES: EmailTemplateDef[] = [
  {
    slug: "decline",
    label: "Decline a booking request",
    description:
      "Sent to a client when you decline their booking request. Edit your message here.",
    header: "Update on your booking request",
    defaultSubject: "Update on your booking request with Jen & John's Pet Services",
  },
  {
    slug: "approval",
    label: "Approve a booking (booking confirmed)",
    description:
      "Sent to a client when you approve their request. It includes the deposit amount and payment options.",
    header: "Your Booking Is Approved!",
    defaultSubject: "Your Booking Is Approved!",
  },
  {
    slug: "deposit-received",
    label: "Deposit received (booking finalized)",
    description:
      "Sent to a client after you record their deposit. Confirms their dates are locked in.",
    header: "Your Booking Is Finalized!",
    defaultSubject: "Your Booking Is Finalized!",
  },
  {
    slug: "balance-received",
    label: "Remaining balance received (stay fully paid)",
    description:
      "Sent to a client when you record that the remaining balance has been received. Confirms the payment and that their stay is fully paid.",
    header: "Your Stay Is Fully Paid!",
    defaultSubject: "Your Stay Is Fully Paid!",
  },
  {
    slug: "post-completion",
    label: "End of stay thank you (review and referral)",
    description:
      "Sent after a completed stay. Asks for a review, offers a referral reward, and thanks the client.",
    header: "Thank You For Your Trust!",
    defaultSubject: "Thank You For Trusting Us With Your Home And Your Pets!",
  },
  {
    slug: "cancellation",
    label: "Cancellation notice",
    description:
      "Sent to a client when you cancel a confirmed booking. States the refund amount (or that it is non refundable) and how they paid.",
    header: "Update on your booking",
    defaultSubject: "Update on your booking with Jen & John's Pet Services",
  },
  {
    slug: "reschedule",
    label: "Reschedule confirmation",
    description:
      "Sent to a client when you reschedule a confirmed booking. Confirms the new dates and the remaining balance.",
    header: "Your Booking Has Been Rescheduled",
    defaultSubject: "Your Booking Has Been Rescheduled",
  },
  {
    slug: "deposit-reminder",
    label: "Deposit reminder",
    description:
      "Sent once, 24 hours after approval, only if the client's deposit has not yet been received. Gently reminds them the deposit is due and holds their dates.",
    header: "A Friendly Reminder About Your Deposit",
    defaultSubject: "A Friendly Reminder About Your Deposit",
  },
  {
    slug: "resendCode",
    label: "Resend return code",
    description:
      "Sent when a returning client uses the Lost your code? link to have their return code emailed to them.",
    header: "Your Return Code",
    defaultSubject: "Your Return Code",
  },
];

export interface TemplateView {
  slug: string;
  label: string;
  description: string;
  header: string;
  defaultSubject: string;
  custom: boolean; // the owner has a saved override row for this email
  hasCustomBody: boolean;
  body: string; // the effective/current body (override if custom, else default)
  subject: string; // the current subject override ("" when using the default)
}

export { loadEmailTemplates, saveEmailTemplate };