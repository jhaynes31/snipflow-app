/**
 * Client-side API transport for every operation the browser performs against
 * the server. The platform edge at *.ctonew.app mangles TanStack /_serverFn
 * calls, so all client work goes through plain /api/* routes handled by
 * serve.ts, which the edge passes verbatim. Each function keeps the exact
 * call signature and result shape the original createServerFn exposed, so
 * callers are unchanged apart from the import source.
 */
import type { PetDetail } from "~/lib/petDetails";
import type { Review, ReviewInput } from "~/lib/reviews";
import type { TemplateView } from "~/lib/emailTemplates";
import type { MeetGreetCalcResult } from "~/routes/api/-meet-greet";

async function postJson(url: string, body: unknown): Promise<any> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      if (j?.error) detail = j.error;
    } catch {
      /* keep status text */
    }
    throw new Error(detail);
  }
  return res.json();
}

// ── Booking submission (public) ────────────────────────────────────────────

export interface SubmitBookingInput {
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientAddress: string;
  arrivalDate: string;
  arrivalTime: string;
  departureDate: string;
  departureTime: string;
  pets: unknown;
  isHoliday: boolean;
  totalPrice: number;
  holidaySurchargeDays?: number;
  holidaySurcharge?: number;
  priceBreakdown?: unknown;
  notes?: string;
  petAnxieties?: string;
  petAnxietyManifestation?: string;
  petSleepsInBed?: string;
  petQuirks?: string;
  petNames?: string;
  petDetails?: PetDetail[];
  hearAboutUs?: string;
  referredBy?: string;
}

/** POST /api/submit-booking -> { success: true, requestId } | { success: false, error } */
export async function submitBooking(payload: {
  data: SubmitBookingInput;
}): Promise<{ success: true; requestId: string } | { success: false; error: string }> {
  return postJson("/api/submit-booking", payload);
}

// ── Pet profile + resend code (public returning clients) ──────────────────

export interface SavedProfilePet {
  name: string;
  breed?: string;
  age?: string;
  type: string;
  species?: string;
}
export interface PetProfileData {
  clientName: string;
  returnCode: string;
  pets: SavedProfilePet[];
  anxieties?: string;
  anxietyManifestation?: string;
  sleepsInBed?: string;
  quirks?: string;
}

export async function getPetProfile(args: {
  returnCode: string;
  clientEmail: string;
}): Promise<
  | { success: true; profile: PetProfileData }
  | { success: false; error: string }
> {
  return postJson("/api/pet-profile", { data: args });
}

export async function resendReturnCode(args: {
  clientEmail: string;
}): Promise<
  | { success: true; backfilled: boolean }
  | { success: false; notFound?: boolean; error: string }
> {
  return postJson("/api/resend-code", { data: args });
}

// ── Reviews (admin) ────────────────────────────────────────────────────────

export async function loadReviews(): Promise<
  { success: true; data: Review[] } | { success: false; error: string }
> {
  return postJson("/api/action", { action: "loadReviews" });
}
export async function addReview(data: ReviewInput): Promise<{ success: true; data: null } | { success: false; error: string }> {
  return postJson("/api/action", { action: "addReview", data });
}
export async function editReview(data: ReviewInput & { id: string }): Promise<{ success: true; data: null } | { success: false; error: string }> {
  return postJson("/api/action", { action: "editReview", data });
}
export async function deleteReview(data: { id: string }): Promise<{ success: true; data: null } | { success: false; error: string }> {
  return postJson("/api/action", { action: "deleteReview", data });
}

// ── Email templates (admin) ────────────────────────────────────────────────

export async function loadEmailTemplates(): Promise<
  { success: true; data: TemplateView[] } | { success: false; error: string }
> {
  return postJson("/api/action", { action: "loadEmailTemplates" });
}
export async function saveEmailTemplate(data: {
  slug: string;
  body: string;
  subject: string;
}): Promise<{ success: true; data: null } | { success: false; error: string }> {
  return postJson("/api/action", { action: "saveEmailTemplate", data });
}

// ── Meet & Greet (admin) ───────────────────────────────────────────────────

export async function meetGreetGetSettings(): Promise<{ success: true; data: any } | { success: false; error: string }> {
  return postJson("/api/action", { action: "meetGreetGetSettings" });
}
export async function meetGreetCalculate(args: {
  oneWayMiles?: number;
  clientAddress?: string;
}): Promise<MeetGreetCalcResult> {
  return postJson("/api/action", { action: "meetGreetCalculate", data: args });
}
export async function meetGreetSaveSettings(data: Record<string, unknown>): Promise<{ success: true } | { success: false; error: string }> {
  return postJson("/api/action", { action: "meetGreetSaveSettings", data });
}

// ── Auth (admin + content) ─────────────────────────────────────────────────

export async function verifyPassword(payload: {
  data: { password: string };
}): Promise<{ success: true } | { success: false; error: string }> {
  return postJson("/api/action", { action: "verifyPassword", data: payload.data });
}
/**
 * Ask the server whether this browser holds a valid admin session. The session
 * cookie is HttpOnly, so this is the only way the client can know.
 */
export async function checkSession(): Promise<{ authenticated: boolean }> {
  const res = await postJson("/api/action", { action: "checkSession" });
  return { authenticated: Boolean(res?.authenticated) };
}
/** End the admin session server-side (clears the HttpOnly cookie). */
export async function logout(): Promise<void> {
  await postJson("/api/action", { action: "logout" });
}
export async function changePassword(payload: {
  data: { currentPassword: string; newPassword: string };
}): Promise<{ success: boolean; error?: string }> {
  return postJson("/api/action", { action: "changePassword", data: payload.data });
}
export async function requestPasswordReset(payload: {
  data: { email: string };
}): Promise<{ success: boolean; error?: string }> {
  return postJson("/api/action", { action: "requestPasswordReset", data: payload.data });
}
export async function resetPassword(payload: {
  data: { resetToken: string; newPassword: string };
}): Promise<{ success: boolean; error?: string }> {
  return postJson("/api/action", { action: "resetPassword", data: payload.data });
}

// ── Availability (admin) ───────────────────────────────────────────────────

export interface AvailabilityRecord {
  _id: string;
  date: string;
  isOpen: boolean;
  note?: string;
  // Feature B: for partial days (departure at or before noon) this holds the
  // owner friendly reason, e.g. "Departs 10:00 AM, accepts arrivals after
  // 10:00 AM", so the admin calendar can explain the amber state.
  reason?: string;
}
export async function adminGetAvailability(): Promise<
  { success: true; data: AvailabilityRecord[] } | { success: false; error: string }
> {
  return postJson("/api/action", { action: "getAvailability" });
}
export async function adminSetAvailability(data: {
  date: string;
  isOpen: boolean;
}): Promise<{ success: true; data: null } | { success: false; error: string }> {
  return postJson("/api/action", { action: "setAvailability", data });
}
export async function adminBlockDates(data: {
  startDate: string;
  endDate: string;
}): Promise<{ success: true; data: { blocked: number } } | { success: false; error: string }> {
  return postJson("/api/action", { action: "blockDates", data });
}

// ── Requests (admin) ───────────────────────────────────────────────────────

export interface RequestRecord {
  _id: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientAddress?: string;
  arrivalDate: string;
  arrivalTime: string;
  departureDate: string;
  departureTime: string;
  pets: unknown;
  isHoliday: boolean;
  totalPrice: number;
  holidaySurchargeDays?: number;
  holidaySurcharge?: number;
  priceBreakdown?: unknown;
  notes?: string;
  petAnxieties?: string;
  petAnxietyManifestation?: string;
  petSleepsInBed?: string;
  petQuirks?: string;
  status: string;
  createdAt: number;
  depositAmount?: number;
  depositLink?: string;
  petNames?: string;
  petDetails?: PetDetail[];
  hearAboutUs?: string;
  referredBy?: string;
  referralRewardStatus?: string;
  meetGreetDistanceMiles?: number;
  meetGreetFee?: number;
  meetGreetOutsideArea?: boolean;
  meetGreetManual?: boolean;
}
export async function adminGetRequests(): Promise<
  { success: true; data: RequestRecord[] } | { success: false; error: string }
> {
  return postJson("/api/action", { action: "getRequests" });
}
export async function adminUpdateRequestStatus(data: Record<string, unknown>): Promise<{ success: true; data: null } | { success: false; error: string }> {
  return postJson("/api/action", { action: "updateRequestStatus", data });
}
export async function adminUpdateReferralRewardStatus(data: {
  requestId: string;
  status: string;
}): Promise<{ success: true; data: null } | { success: false; error: string }> {
  return postJson("/api/action", { action: "updateReferralRewardStatus", data });
}
export async function adminDeleteRequest(data: { id: string }): Promise<{ success: true; data: null } | { success: false; error: string }> {
  return postJson("/api/action", { action: "deleteRequest", data });
}

// ── Bookings (admin) ───────────────────────────────────────────────────────

export interface BookingRecord {
  _id: string;
  requestId: string;
  clientName: string;
  clientEmail: string;
  arrivalDate: string;
  departureDate: string;
  totalPrice: number;
  depositPaid: boolean;
  paymentMethod?: string;
  createdAt: number;
  depositEmailSent?: boolean;
  depositReminderSent?: boolean;
  cancellationEmailSent?: boolean;
  rescheduleEmailSent?: boolean;
  balancePaid?: boolean;
  balancePaymentMethod?: string;
  balanceEmailSent?: boolean;
  petNames?: string;
  depositAmount?: number;
  isHoliday?: boolean;
  holidaySurchargeDays?: number;
  holidaySurcharge?: number;
  arrivalTime?: string;
  departureTime?: string;
  pets?: unknown;
  petDetails?: PetDetail[];
  priceBreakdown?: unknown;
  postCompletionSent?: boolean;
  profileExists?: boolean;
}
export async function adminGetBookings(): Promise<
  { success: true; data: BookingRecord[] } | { success: false; error: string }
> {
  return postJson("/api/action", { action: "getBookings" });
}
export async function adminUpdateBookingDeposit(data: Record<string, unknown>): Promise<{ success: true; data: null } | { success: false; error: string }> {
  return postJson("/api/action", { action: "updateBookingDeposit", data });
}
export async function adminUpdateBookingBalance(data: Record<string, unknown>): Promise<{ success: true; data: null } | { success: false; error: string }> {
  return postJson("/api/action", { action: "updateBookingBalance", data });
}
export async function adminCancelBooking(data: {
  bookingId: string;
  requestId: string;
  clientName: string;
  clientEmail: string;
  arrivalDate: string;
  departureDate: string;
  isHoliday: boolean;
  depositAmount?: number;
  totalPrice: number;
  paymentMethod?: string;
  petNames?: string;
}): Promise<
  | { success: true; data: { refundAmount: number; emailed: boolean } }
  | { success: false; error: string }
> {
  return postJson("/api/action", { action: "cancelBooking", data });
}
export async function adminSendTestEmail(data: {
  slug: string;
  subject?: string;
  body?: string;
  recipient: string;
}): Promise<{ success: true; data: null } | { success: false; error: string }> {
  return postJson("/api/action", { action: "sendTestEmail", data });
}

// ── Reschedule (admin, from BookingRescheduleControl) ──────────────────────

export async function rescheduleBookingAction(data: Record<string, unknown>): Promise<{ success: true; data: null } | { success: false; error: string }> {
  return postJson("/api/action", { action: "rescheduleBooking", data });
}

// ── Content studio ─────────────────────────────────────────────────────────

export async function generateContent(payload: {
  data: { topic: string; tone: string };
}): Promise<{ success: boolean; text?: string; error?: string }> {
  return postJson("/api/action", { action: "generateContent", data: payload.data });
}