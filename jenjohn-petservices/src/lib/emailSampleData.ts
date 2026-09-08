/**
 * Shared realistic sample data used to render placeholder client emails.
 *
 * Both the admin "default copy" preview (emailTemplates.ts) and the email
 * "Send Test" feature (email.ts) build default bodies from THIS SAME dataset, so
 * the editor's pre-filled default text and the test send's default match. That
 * match is what lets a test send of an unedited template render the full rich
 * HTML (QR cards, etc.) exactly like a real production email, while an edited
 * template renders as a styled owner override.
 *
 * Client is "Jane" with two dogs: Bella (4 year old Labrador) and Max (6 year
 * old Golden Retriever). All dates, prices and amounts are believable for a
 * typical overnight stay. No hyphens, no em dashes anywhere (owner copy barrier).
 */

import type {
  NewRequestData,
  DepositReceivedData,
  CancellationData,
  RescheduleData,
  DepositReminderData,
  ResendCodeData,
  BalanceReceivedData,
} from "./email";
import type { PetDetail } from "./petDetails";

export const SAMPLE_PET_DETAILS: PetDetail[] = [
  { name: "Bella", breed: "Labrador Retriever", age: "4 years", type: "adultDog" },
  { name: "Max", breed: "Golden Retriever", age: "6 years", type: "adultDog" },
];

export const SAMPLE_REQUEST: NewRequestData = {
  clientName: "Jane Doe",
  clientEmail: "recipient@example.com",
  clientPhone: "555 123 4567",
  clientAddress: "123 Main Street",
  arrivalDate: "2026-10-12",
  arrivalTime: "5:00 PM",
  departureDate: "2026-10-16",
  departureTime: "10:00 AM",
  pets: { adultDogs: 2, cats: 0 },
  isHoliday: false,
  totalPrice: 520,
  petNames: "Bella and Max",
  petDetails: SAMPLE_PET_DETAILS,
};

export const SAMPLE_DEPOSIT: DepositReceivedData = {
  clientName: "Jane Doe",
  clientEmail: "recipient@example.com",
  arrivalDate: "2026-10-12",
  departureDate: "2026-10-16",
  totalPrice: 520,
  depositAmount: 260,
  remainingBalance: 260,
  petNames: "Bella and Max",
};

export const SAMPLE_BALANCE: BalanceReceivedData = {
  clientName: "Jane Doe",
  clientEmail: "recipient@example.com",
  arrivalDate: "2026-10-12",
  departureDate: "2026-10-16",
  balanceAmount: 260,
  balancePaymentMethod: "Zelle",
  totalPrice: 520,
  petNames: "Bella and Max",
};

export const SAMPLE_CANCELLATION: CancellationData = {
  clientName: "Jane Doe",
  clientEmail: "recipient@example.com",
  arrivalDate: "2026-10-12",
  departureDate: "2026-10-16",
  refundAmount: 260,
  isHoliday: false,
  paymentMethod: "Zelle",
  petNames: "Bella and Max",
};

export const SAMPLE_RESCHEDULE: RescheduleData = {
  clientName: "Jane Doe",
  clientEmail: "recipient@example.com",
  arrivalDate: "2026-10-19",
  arrivalTime: "10:00",
  departureDate: "2026-10-23",
  departureTime: "16:00",
  totalPrice: 520,
  balanceDue: 260,
  petNames: "Bella and Max",
};

export const SAMPLE_DEPOSIT_REMINDER: DepositReminderData = {
  clientName: "Jane Doe",
  clientEmail: "recipient@example.com",
  arrivalDate: "2026-10-12",
  departureDate: "2026-10-16",
  depositAmount: 260,
  petNames: "Bella and Max",
};

export const SAMPLE_RESEND_CODE: ResendCodeData = {
  clientName: "Jane Doe",
  clientEmail: "recipient@example.com",
  returnCode: "K4T7QM",
  petNames: "Bella and Max",
};
