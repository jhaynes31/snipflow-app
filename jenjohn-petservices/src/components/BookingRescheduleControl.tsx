import { useState } from "react";
import { calculatePrice } from "~/lib/pricing";
import { rescheduleBookingAction } from "~/lib/apiClient";

/**
 * Self-contained reschedule control for confirmed bookings in the admin panel.
 * Lives outside admin.tsx (which is large) and owns its reschedule server
 * function so there is no circular import with the admin route.
 *
 * The owner picks new arrival/departure dates and times, the price is
 * recomputed with the site's shared pricing, the deposit is kept, and the
 * remaining balance (new total minus what is already paid) is shown before
 * confirming. Reschedules never trigger a refund.
 */

/** Minimal shape of the booking rows rendered by BookingsSection. */
export interface RescheduleBookingProps {
  _id: string;
  requestId: string;
  clientName: string;
  clientEmail: string;
  arrivalDate: string;
  departureDate: string;
  totalPrice: number;
  depositPaid: boolean;
  depositAmount?: number;
  isHoliday?: boolean;
  arrivalTime?: string;
  departureTime?: string;
  pets?: unknown;
  priceBreakdown?: unknown;
  petNames?: string;
}

/** Prices are stored in dollars. */
function formatPrice(amount: number): string {
  return "$" + (amount ?? 0).toFixed(2);
}

/** The deposit expected for a booking (stored value, else half the total). */
function bookingDeposit(b: RescheduleBookingProps): number {
  return b.depositAmount ?? Math.round(b.totalPrice * 0.5);
}

/** What the client has paid so far (the deposit, when it is recorded paid). */
function bookingPaidSoFar(b: RescheduleBookingProps): number {
  return b.depositPaid ? bookingDeposit(b) : 0;
}

/** Recompute the total for the new dates using the shared pricing. */
function computeReschedulePrice(
  b: RescheduleBookingProps,
  arrivalDate: string,
  arrivalTime: string,
  departureDate: string,
  departureTime: string,
): {
  total: number;
  isHoliday: boolean;
  holidayDays: number;
  holidaySurcharge: number;
} | null {
  const arr = new Date(arrivalDate + "T00:00:00");
  const dep = new Date(departureDate + "T00:00:00");
  if (isNaN(arr.getTime()) || isNaN(dep.getTime()) || dep <= arr) return null;

  const pets = (b.pets ?? {}) as {
    adultDogs?: number;
    puppies?: number;
    cats?: number;
    kittens?: number;
    otherSpecies?: { name: string; quantity: number }[];
  };
  const otherSpeciesCount = Array.isArray(pets.otherSpecies)
    ? pets.otherSpecies.reduce((s, o) => s + (Number(o.quantity) || 0), 0)
    : 0;

  const result = calculatePrice({
    arrivalDate: arr,
    arrivalTime,
    departureDate: dep,
    departureTime,
    adultDogs: Number(pets.adultDogs) || 0,
    puppies: Number(pets.puppies) || 0,
    cats: Number(pets.cats) || 0,
    kittens: Number(pets.kittens) || 0,
    otherSpeciesCount,
  });
  return {
    total: result.total,
    isHoliday: result.isHoliday,
    holidayDays: result.holidayDays,
    holidaySurcharge: result.holidaySurcharge,
  };
}

export function RescheduleControl({
  b,
  onSaved,
}: {
  b: RescheduleBookingProps;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [arrivalDate, setArrivalDate] = useState(b.arrivalDate);
  const [arrivalTime, setArrivalTime] = useState(
    b.arrivalTime && b.arrivalTime.includes(":") ? b.arrivalTime : "10:00",
  );
  const [departureDate, setDepartureDate] = useState(b.departureDate);
  const [departureTime, setDepartureTime] = useState(
    b.departureTime && b.departureTime.includes(":")
      ? b.departureTime
      : "16:00",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const price = computeReschedulePrice(
    b,
    arrivalDate,
    arrivalTime,
    departureDate,
    departureTime,
  );
  const newTotal = price ? price.total : null;
  const paidSoFar = bookingPaidSoFar(b);
  const deposit = bookingDeposit(b);
  const balanceDue =
    newTotal !== null ? Math.max(0, Math.round(newTotal - paidSoFar)) : 0;

  const confirm = async () => {
    if (newTotal === null) return;
    setBusy(true);
    setError("");
    setDone("");
    try {
      const result = await rescheduleBookingAction({
        bookingId: b._id,
        requestId: b.requestId,
        clientName: b.clientName,
        clientEmail: b.clientEmail,
        arrivalDate,
        arrivalTime,
        departureDate,
        departureTime,
        totalPrice: newTotal,
        priceBreakdown: b.priceBreakdown,
        isHoliday: price ? price.isHoliday : false,
        holidaySurchargeDays: price ? price.holidayDays : undefined,
        holidaySurcharge: price ? price.holidaySurcharge : undefined,
        balanceDue,
        petNames: b.petNames,
      });
      if (result.success) {
        setDone("Booking rescheduled. Confirmation sent to the client.");
        setOpen(false);
        onSaved();
      } else {
        setError(result.error);
      }
    } catch {
      setError("Failed to reschedule booking");
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    "w-full border border-brand-tan/30 rounded-lg px-2 py-1.5 font-sans text-sm text-brand-brown focus:outline-none focus:ring-2 focus:ring-brand-brown/30";

  return (
    <div className="mt-3 pt-3 border-t border-brand-tan/10">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="px-3 py-1 rounded-lg border border-brand-brown/40 text-brand-brown font-sans text-xs font-medium hover:bg-brand-tan/10"
        >
          Reschedule
        </button>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-sans text-xs text-brand-brown-light mb-1">
                New arrival date
              </label>
              <input
                type="date"
                value={arrivalDate}
                onChange={(e) => setArrivalDate(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block font-sans text-xs text-brand-brown-light mb-1">
                New arrival time
              </label>
              <input
                type="time"
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block font-sans text-xs text-brand-brown-light mb-1">
                New departure date
              </label>
              <input
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block font-sans text-xs text-brand-brown-light mb-1">
                New departure time
              </label>
              <input
                type="time"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {price && price.isHoliday ? (
            <p className="font-sans text-xs text-amber-700">
              This stay falls on a recognized holiday. The $15 per day
              holiday rate is applied automatically.
            </p>
          ) : (
            <p className="font-sans text-xs text-brand-brown-light">
              Holiday rates are applied automatically when the new dates fall
              on a recognized holiday.
            </p>
          )}

          {newTotal === null ? (
            <p className="font-sans text-xs text-red-600">
              Enter a departure date after the arrival date to see the new
              total.
            </p>
          ) : (
            <div className="bg-brand-cream border border-brand-tan/20 rounded-lg p-3 space-y-1">
              <p className="font-sans text-xs font-semibold uppercase tracking-wide text-brand-brown">
                Reschedule Summary
              </p>
              <p className="font-sans text-sm text-brand-brown">
                New total:{" "}
                <span className="font-semibold">{formatPrice(newTotal)}</span>
              </p>
              <p className="font-sans text-sm text-brand-brown">
                Deposit kept:{" "}
                <span className="font-semibold">{formatPrice(deposit)}</span>
              </p>
              <p className="font-sans text-sm text-brand-brown">
                Remaining balance due:{" "}
                <span className="font-semibold">
                  {formatPrice(balanceDue)}
                </span>
              </p>
            </div>
          )}

          {error && <p className="font-sans text-xs text-red-600">{error}</p>}
          {done && <p className="font-sans text-xs text-green-700">{done}</p>}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={confirm}
              disabled={busy || newTotal === null}
              className="px-3 py-1 rounded-lg bg-brand-brown text-brand-cream font-sans text-xs font-medium hover:bg-brand-brown-light disabled:opacity-50"
            >
              {busy ? "Rescheduling..." : "Confirm Reschedule"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={busy}
              className="px-3 py-1 rounded-lg border border-brand-tan/30 text-brand-brown font-sans text-xs font-medium hover:bg-brand-tan/10 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
