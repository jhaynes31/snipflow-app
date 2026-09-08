/**
 * Cancellation refund policy for Jen & John's Pet Services.
 *
 * Owner approved policy (see cancel-reschedule-spec.md):
 *  - Holiday bookings (the stored request isHoliday flag) are ALWAYS full,
 *    non refundable. Refund is $0.
 *  - Non holiday bookings:
 *      cancel more than 14 days before arrivalDate -> refund the full deposit
 *      cancel within 14 days (or within 72 hours) -> $0, non refundable.
 *
 * The isHoliday flag always comes from the stored request; we never recompute
 * it from the calendar here. The deposit amount is the stored depositAmount on
 * the request, which is set on approval and defaults to half the total.
 */

/** Today's date as "YYYY-MM-DD" in the server's local timezone. */
export function todayIsoString(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export interface RefundInput {
  /** The stay's arrival date, "YYYY-MM-DD". */
  arrivalDate: string;
  /** The stored request isHoliday flag. Never recomputed. */
  isHoliday: boolean;
  /** The stored deposit amount on the request (falls back to half the total). */
  depositAmount?: number;
  /** The stay total price (used only when no depositAmount is recorded). */
  totalPrice: number;
  /** Override today for deterministic tests. "YYYY-MM-DD". */
  today?: string;
}

/**
 * Compute the refund owed for a cancellation, in dollars. Returns 0 for every
 * non refundable case (holiday, within 2 weeks, within 72 hours).
 */
export function computeRefund(input: RefundInput): number {
  const { arrivalDate, isHoliday, depositAmount, totalPrice } = input;

  // Holiday bookings are always full, non refundable.
  if (isHoliday) return 0;

  const arr = new Date(arrivalDate + "T00:00:00");
  const today = new Date((input.today ?? todayIsoString()) + "T00:00:00");
  if (isNaN(arr.getTime()) || isNaN(today.getTime())) return 0;

  const daysUntilArrival = Math.round(
    (arr.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Only a cancellation more than 14 days before arrival is refundable: the
  // full deposit. Every other case (within 2 weeks, within 72 hours) is $0.
  if (daysUntilArrival > 14) {
    return depositAmount ?? Math.round(totalPrice * 0.5);
  }
  return 0;
}
