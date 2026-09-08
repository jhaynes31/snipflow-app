import { useEffect, useId, useState } from "react";
import type { PricingResult } from "~/lib/pricing";

interface PriceCalculatorProps {
  result: PricingResult | null;
  /** Whether the client has entered an arrival date. */
  hasArrival: boolean;
  /** Whether the client has entered a departure date. */
  hasDeparture: boolean;
  /** Whether at least one pet card has a name filled in. */
  hasNamedPets: boolean;
  /** Whether both dates are entered but departure is not after arrival. */
  datesInvalid: boolean;
}

/** Owner-approved copy explaining why arrival/departure days are included. */
const DAYS_INCLUDED_COPY = [
  "Your total covers the day we arrive at your home and the day we leave, not just the nights. Because we stay in your home, the time we spend caring for your pets on arrival and departure days is included too, whether that means an early-morning start or staying until late on the final day.",
  "Arrivals before 3pm count as a full day, after 3pm as a half day. Departures after 3pm count as a full day, before 3pm as a half day.",
];

/**
 * "Price Estimate" heading with an info button + tooltip explaining why the
 * arrival and departure days are counted in the price.
 *
 * - Desktop: shows on hover (mouse events only — guarded by `(hover: hover)`
 *   so touch devices don't get "sticky hover" and can dismiss by re-tapping).
 * - Mobile: toggles on tap/click of the button; tapping the button again (or
 *   anywhere else, which blurs the button) dismisses it.
 * - Keyboard: opens on focus, closes on blur; Enter/Space toggles it too.
 *
 * The tooltip is an absolutely positioned popover anchored to the heading row
 * (`left-0 right-0` of the relative row), so it always stays inside the card
 * and never overflows on small screens. Purely presentational — no pricing
 * logic touched.
 */
function PriceHeading({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false); // click/tap toggle
  const [hovering, setHovering] = useState(false); // real mouse hover only
  const [focused, setFocused] = useState(false); // keyboard focus
  const [canHover, setCanHover] = useState(false);
  const tooltipId = useId();

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover)");
    setCanHover(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setCanHover(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const show = open || hovering || focused;

  const startHover = () => {
    if (canHover) setHovering(true);
  };
  const stopHover = () => {
    if (canHover) setHovering(false);
  };

  return (
    <div
      className={`relative flex items-center gap-1.5 ${className}`}
      onMouseEnter={startHover}
      onMouseLeave={stopHover}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        setOpen(false);
      }}
    >
      <h3 className="font-sans text-sm font-semibold tracking-wide uppercase text-brand-brown">
        Price Estimate
      </h3>
      <button
        type="button"
        aria-label="Why the first and final days are included in the price"
        aria-expanded={show}
        aria-describedby={show ? tooltipId : undefined}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full border border-brand-tan/50 bg-brand-cream/70 text-brand-brown transition-colors hover:bg-brand-tan/25 focus-visible:outline-2 focus-visible:outline-brand-tan"
      >
        <svg
          viewBox="0 0 16 16"
          className="h-3 w-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden="true"
        >
          <circle cx="8" cy="8" r="6.4" />
          <path d="M8 7.3v3.2" strokeLinecap="round" />
          <path d="M8 5v.1" strokeLinecap="round" />
        </svg>
      </button>
      {show && (
        <span
          id={tooltipId}
          role="tooltip"
          onMouseEnter={startHover}
          onMouseLeave={stopHover}
          className="absolute left-0 right-0 top-full z-20 mt-2 rounded-lg bg-brand-brown px-3.5 py-3 font-sans text-brand-cream shadow-lg"
        >
          {DAYS_INCLUDED_COPY.map((p, i) => (
            <p
              key={i}
              className={`text-xs leading-relaxed ${i > 0 ? "mt-2" : ""}`}
            >
              {p}
            </p>
          ))}
        </span>
      )}
    </div>
  );
}

function formatCurrency(amount: number): string {
  return amount.toFixed(2);
}

export default function PriceCalculator({
  result,
  hasArrival,
  hasDeparture,
  hasNamedPets,
  datesInvalid,
}: PriceCalculatorProps) {
  if (!result || result.breakdown.length === 0) {
    // Tell the client exactly what is still missing, in the order they are
    // most likely to hit it: no dates at all, then missing one date, then
    // no pet name yet.
    let hint = "Fill in your dates and pets to see pricing";
    if (datesInvalid) {
      hint = "Departure date must be after the arrival date";
    } else if (!hasArrival && !hasDeparture) {
      hint = hasNamedPets
        ? "Pick your stay dates to see the price"
        : "Pick your stay dates and add a pet to see the price";
    } else if (!hasArrival) {
      hint = "Add your arrival date to see the price";
    } else if (!hasDeparture) {
      hint = "Add your departure date to see the price";
    } else if (!hasNamedPets) {
      hint = "Add a pet name to see the price";
    }

    return (
      <div className="bg-brand-cream/50 rounded-lg p-4 border border-brand-tan/20">
        <PriceHeading className="mb-2" />
        <p className="font-sans text-2xl font-bold text-brand-brown">$0.00</p>
        <p className="font-sans text-xs text-brand-tan mt-1">
          {hint}
        </p>
        <p className="font-sans text-xs text-brand-brown-light mt-2">
          Overnight stays only &bull; Full-day &amp; half-day logic &bull;
          Holiday rates apply
        </p>
      </div>
    );
  }

  const roverPrice = result.total * 1.11;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-brand-tan/20 p-4 sm:p-6">
      <PriceHeading className="mb-4" />

      {/* Holiday indicator — auto detected from the dates by the shared engine,
          never influenced by the client. Shows the real per day surcharge. */}
      {result.isHoliday && result.holidayDays > 0 && (
        <div className="mb-3 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 font-sans text-xs font-medium">
          &#9733; This stay falls on a recognized holiday. The $15 per day
          holiday rate applies for {result.holidayDays}{" "}
          {result.holidayDays === 1 ? "day" : "days"} of your stay, added to
          the total below.
        </div>
      )}

      {/* Large total */}
      <div className="text-center mb-4">
        <p className="font-sans text-3xl sm:text-4xl font-bold text-brand-brown">
          ${formatCurrency(result.total)}
        </p>
        <p className="font-sans text-xs text-brand-tan mt-1">
          {result.fullDays} full {result.fullDays === 1 ? "day" : "days"}
          {result.halfDays > 0 &&
            ` + ${result.halfDays} half ${result.halfDays === 1 ? "day" : "days"}`}
        </p>
      </div>

      {/* Breakdown table */}
      <div className="mb-4">
        <table className="w-full text-sm font-sans">
          <thead>
            <tr className="border-b border-brand-tan/20 text-brand-tan text-xs tracking-wide uppercase">
              <th className="text-left py-1.5 font-semibold">Item</th>
              <th className="text-right py-1.5 font-semibold">Rate</th>
              <th className="text-right py-1.5 font-semibold">Qty</th>
              <th className="text-right py-1.5 font-semibold">Days</th>
              <th className="text-right py-1.5 font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {result.breakdown.map((item, i) => (
              <tr
                key={i}
                className="border-b border-brand-tan/10 text-brand-brown"
              >
                <td className="py-1.5 text-left">{item.label}</td>
                <td className="py-1.5 text-right">${formatCurrency(item.rate)}</td>
                <td className="py-1.5 text-right">{item.count}</td>
                <td className="py-1.5 text-right">{item.days}</td>
                <td className="py-1.5 text-right font-medium">
                  ${formatCurrency(item.subtotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Rover comparison */}
      <div className="mb-3 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
        <p className="font-sans text-xs text-green-800">
          <span className="font-semibold">Save 11% vs Rover:</span>{" "}
          ${formatCurrency(roverPrice)}
          <span className="text-green-600">
            {" "}
            (you save ${formatCurrency(roverPrice - result.total)})
          </span>
        </p>
      </div>

      {/* Other species note */}
      <p className="font-sans text-xs text-brand-tan italic">
        Other species pricing will be confirmed by Jen &amp; John.
      </p>
    </div>
  );
}
