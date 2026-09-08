import { createFileRoute } from "@tanstack/react-router";
import {
  meetGreetCalculate,
  meetGreetGetSettings,
  meetGreetSaveSettings,
} from "~/lib/apiClient";
import type { MeetGreetCalcResult } from "~/routes/api/-meet-greet";
import { useState, useCallback, useEffect, useMemo } from "react";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import "react-day-picker/style.css";

import {
  loadReviews,
  addReview,
  editReview,
  deleteReview as deleteReviewAction,
} from "~/lib/apiClient";
import type { Review } from "~/lib/reviews";
import { PET_TYPE_LABELS, type PetDetail } from "~/lib/petDetails";
import { computeRefund } from "~/lib/refundPolicy";
import {
  loadEmailTemplates,
  saveEmailTemplate,
} from "~/lib/apiClient";
import type { TemplateView } from "~/lib/emailTemplates";
import {
  adminGetAvailability,
  adminSetAvailability,
  adminBlockDates,
  adminGetRequests,
  adminUpdateRequestStatus,
  adminUpdateReferralRewardStatus,
  adminDeleteRequest,
  adminUpdateBookingDeposit,
  adminUpdateBookingBalance,
  adminCancelBooking,
  adminGetBookings,
  adminSendTestEmail,
  changePassword,
  verifyPassword,
} from "~/lib/apiClient";
import { requestPasswordReset, resetPassword } from "~/lib/apiClient";
import { RescheduleControl } from "~/components/BookingRescheduleControl";

const ADMIN_COOKIE_NAME = "admin_auth";

// ── Types ────────────────────────────────────────────────────────────────

interface AvailabilityRecord {
  _id: string;
  date: string;
  isOpen: boolean;
  note?: string;
  /** Owner friendly reason for partial-day blocks (departure at/before noon). */
  reason?: string;
}

/** One line of the price calculator's output, as stored in `priceBreakdown`. */
interface BreakdownItem {
  label: string;
  rate: number; // per-night rate, in dollars
  count: number;
  days: number; // effective days (full + half*0.5)
  subtotal: number;
}

interface RequestRecord {
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
  // Owner-only Meet & Greet travel fee (computed server-side at request time).
  meetGreetDistanceMiles?: number;
  meetGreetFee?: number;
  meetGreetOutsideArea?: boolean;
  meetGreetManual?: boolean;
}

interface BookingRecord {
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
  // One-time email-sent guards (stored on the booking).
  depositEmailSent?: boolean;
  depositReminderSent?: boolean;
  cancellationEmailSent?: boolean;
  rescheduleEmailSent?: boolean;
  // Remaining-balance tracking (stored on the booking).
  balancePaid?: boolean;
  balancePaymentMethod?: string;
  balanceEmailSent?: boolean;
  // Joined from the originating request for the deposit-received email and the
  // cancel/reschedule flows (isHoliday, times and pet data for repricing).
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
  // Email-sent checklist flags joined from the request / petProfiles.
  postCompletionSent?: boolean;
  profileExists?: boolean;
}

/** The four payment methods the owner can record a deposit against. */
const PAYMENT_METHODS = ["Zelle", "Venmo", "PayPal", "Cash App"];

// ── Convex helpers ───────────────────────────────────────────────────────

// ── Route ────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/admin")({
  component: Admin,
});

// ── UI Components ────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex justify-center py-6">
      <div className="w-6 h-6 border-2 border-brand-brown/30 border-t-brand-brown rounded-full animate-spin" />
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
      <p className="font-sans text-sm text-red-700">{message}</p>
    </div>
  );
}

function EmptyMessage({ message }: { message: string }) {
  return (
    <div className="text-center py-6">
      <p className="font-sans text-sm text-brand-brown-light italic">{message}</p>
    </div>
  );
}

/** "2026-07-19" -> "Jul 19, 2026" */
function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Prices are stored in dollars (e.g. 520 = $520.00). */
function formatPrice(amount: number): string {
  return "$" + (amount ?? 0).toFixed(2);
}

/** "16:00" -> "4:00 PM" */
function formatTime(time: string): string {
  if (!time) return time;
  const [hStr, mStr] = time.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (isNaN(h)) return time;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(isNaN(m) ? 0 : m).padStart(2, "0")} ${suffix}`;
}

/** 4 -> "4", 3.5 -> "3.5" */
function formatDayCount(days: number): string {
  return Number.isInteger(days) ? String(days) : days.toFixed(1);
}

// ── Date helpers for review management ───────────────────────────────────

function todayIso(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** "2026-07-19" -> "July 19, 2026" (matches the format of seeded reviews). */
function isoToDisplay(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** "July 19, 2026" (or "2026-07-19") -> "2026-07-19" for the date picker. */
function displayToIso(display: string): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(display)
    ? new Date(display + "T00:00:00")
    : new Date(display);
  if (isNaN(d.getTime())) return todayIso();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// ── Section: Availability Calendar ───────────────────────────────────────

/** All days (YYYY-MM-DD) in the month that `month` falls in. */
function daysInMonth(month: Date): string[] {
  const year = month.getFullYear();
  const m = month.getMonth();
  const count = new Date(year, m + 1, 0).getDate();
  const dates: string[] = [];
  for (let d = 1; d <= count; d++) {
    dates.push(
      `${year}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    );
  }
  return dates;
}

function AvailabilitySection() {
  const [records, setRecords] = useState<AvailabilityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [viewedMonth, setViewedMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [blockStart, setBlockStart] = useState("");
  const [blockEnd, setBlockEnd] = useState("");
  const [blocking, setBlocking] = useState(false);
  const [blockResult, setBlockResult] = useState("");

  const blockedDates = useMemo(
    () =>
      records
        .filter((r) => !r.isOpen)
        .map((r) => r.date)
        .sort(),
    [records],
  );
  const blockedSet = useMemo(() => new Set(blockedDates), [blockedDates]);
  // Feature B: partial days (departure at or before noon) render amber with a
  // reason tooltip, distinct from fully blocked dates. Derived from the same
  // admin availability payload (records already carry the reason text).
  const { partialDates, partialReasonByDate } = useMemo(() => {
    const dates: string[] = [];
    const reasons = new Map<string, string>();
    for (const r of records) {
      if (r.reason) {
        dates.push(r.date);
        reasons.set(r.date, r.reason);
      }
    }
    return { partialDates: dates.sort(), partialReasonByDate: reasons };
  }, [records]);

  const load = useCallback(async ({ spinner = false }: { spinner?: boolean } = {}) => {
    // Only show the full-section spinner on the very first load. Reconcile
    // loads after a toggle must NOT unmount the calendar (unmounting resets the
    // uncontrolled DayPicker back to the current month, which made the admin
    // calendar jump back to August after every date toggle).
    if (spinner) setLoading(true);
    setError("");
    try {
      const result = await adminGetAvailability();
      if (result.success) {
        setRecords(result.data);
      } else {
        setError(result.error);
      }
    } catch {
      setError("Failed to load availability");
    } finally {
      if (spinner) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load({ spinner: true });
  }, [load]);

  const toggleDate = async (date: string) => {
    // Clicking a blocked date unblocks it; clicking any other date blocks it.
    const nextBlocked = !blockedSet.has(date);
    setSaving(true);
    setFeedback("");
    // Optimistic update so the calendar responds instantly.
    setRecords((prev) => {
      const others = prev.filter((r) => r.date !== date);
      return [...others, { _id: "pending", date, isOpen: !nextBlocked }];
    });
    try {
      const result = await adminSetAvailability({
        date,
        isOpen: !nextBlocked,
      });
      setFeedback(
        result.success
          ? `${formatDate(date)} ${nextBlocked ? "blocked." : "unblocked."}`
          : result.error,
      );
      load(); // reconcile with authoritative data (no spinner; keeps month)
    } catch {
      setFeedback("Failed to update date.");
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDayClick = (day: Date) => {
    if (saving) return;
    toggleDate(format(day, "yyyy-MM-dd"));
  };

  const bulkSetMonth = async (block: boolean) => {
    const monthLabel = viewedMonth.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    if (
      !window.confirm(
        `${block ? "Block all dates" : "Unblock all dates"} in ${monthLabel}?`,
      )
    ) {
      return;
    }
    setSaving(true);
    setFeedback("");
    setBlockResult("");
    const dates = daysInMonth(viewedMonth);
    let updated = 0;
    try {
      for (const date of dates) {
        const result = await adminSetAvailability({
          date,
          isOpen: !block,
        });
        if (result.success) updated++;
      }
      setFeedback(
        updated === dates.length
          ? `${updated} date${updated !== 1 ? "s" : ""} in ${monthLabel} ${
              block ? "blocked" : "unblocked"
            }.`
          : `Updated ${updated} of ${dates.length} dates.`,
      );
    } catch {
      setFeedback("Failed to update dates.");
    } finally {
      setSaving(false);
      load();
    }
  };

  const handleBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockStart || !blockEnd) return;
    setBlocking(true);
    setBlockResult("");
    try {
      const result = await adminBlockDates({
        startDate: blockStart,
        endDate: blockEnd,
      });
      if (result.success) {
        setBlockResult(`Blocked ${result.data.blocked} date(s).`);
        setBlockStart("");
        setBlockEnd("");
        load();
      } else {
        setBlockResult(result.error);
      }
    } catch {
      setBlockResult("Failed to block dates.");
    } finally {
      setBlocking(false);
    }
  };

  const groupDates = (dates: string[]): string[] => {
    if (dates.length === 0) return [];
    const groups: string[] = [];
    let start = dates[0];
    let prev = dates[0];

    for (let i = 1; i < dates.length; i++) {
      const expected = new Date(prev + "T00:00:00");
      expected.setDate(expected.getDate() + 1);
      const yyyy = expected.getFullYear();
      const mm = String(expected.getMonth() + 1).padStart(2, "0");
      const dd = String(expected.getDate()).padStart(2, "0");
      const expectedStr = `${yyyy}-${mm}-${dd}`;

      if (dates[i] === expectedStr) {
        prev = dates[i];
      } else {
        groups.push(start === prev ? formatDate(start) : `${formatDate(start)} – ${formatDate(prev)}`);
        start = dates[i];
        prev = dates[i];
      }
    }
    groups.push(start === prev ? formatDate(start) : `${formatDate(start)} – ${formatDate(prev)}`);
    return groups;
  };

  return (
    <section className="bg-white rounded-xl shadow-sm border border-brand-tan/20 p-6">
      <h2 className="font-sans text-lg font-semibold tracking-wide uppercase text-brand-brown mb-1">
        Availability Calendar
      </h2>
      <p className="font-sans text-sm text-brand-brown-light mb-4">
        All dates are available unless you block them. Click a date to block or
        unblock it — changes show on the public calendar immediately.
      </p>

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorMessage message={error} />
      ) : (
        <>
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Calendar */}
            <div className="flex-1 flex justify-center">
              <DayPicker
                month={viewedMonth}
                className="rdp-brand rdp-admin"
                modifiers={{
                  blocked: blockedDates.map((d) => new Date(d + "T00:00:00")),
                  partial: partialDates.map((d) => new Date(d + "T00:00:00")),
                }}
                modifiersClassNames={{
                  blocked: "rdp-admin-blocked",
                  partial: "rdp-admin-partial",
                }}
                onDayClick={handleDayClick}
                onMonthChange={(m) => setViewedMonth(m)}
                disabled={saving}
                components={{
                  DayButton: (props) => {
                    const { day, children, ...rest } = props as any;
                    const reason = partialReasonByDate.get(
                      day.isoDate as string,
                    );
                    return (
                      <button
                        type="button"
                        {...rest}
                        title={reason ? `${reason} (click to unblock)` : undefined}
                      >
                        {children}
                      </button>
                    );
                  },
                }}
              />
            </div>

            {/* Legend + bulk actions */}
            <div className="lg:w-64 space-y-4">
              <div className="border border-brand-tan/20 rounded-lg p-4">
                <p className="font-sans text-xs font-semibold tracking-wide uppercase text-brand-brown mb-2">
                  Legend
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-5 h-5 rounded-md border border-brand-tan/30 bg-white" />
                    <span className="font-sans text-sm text-brand-brown">Available (click to block)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-5 h-5 rounded-md bg-red-600" />
                    <span className="font-sans text-sm text-brand-brown">Blocked (click to unblock)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-5 h-5 rounded-md bg-amber-400" />
                    <span className="font-sans text-sm text-brand-brown">Partial (early departure, accepts arrivals after)</span>
                  </div>
                </div>
              </div>

              <div className="border border-brand-tan/20 rounded-lg p-4 space-y-2">
                <p className="font-sans text-xs font-semibold tracking-wide uppercase text-brand-brown">
                  Bulk actions
                </p>
                <button
                  type="button"
                  onClick={() => bulkSetMonth(true)}
                  disabled={saving || loading}
                  className="w-full bg-red-600 text-white font-sans font-medium text-xs px-3 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  Block All in{" "}
                  {viewedMonth.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </button>
                <button
                  type="button"
                  onClick={() => bulkSetMonth(false)}
                  disabled={saving || loading}
                  className="w-full border border-brand-tan/30 text-brand-brown font-sans font-medium text-xs px-3 py-2 rounded-lg hover:bg-brand-tan/10 transition-colors disabled:opacity-50"
                >
                  Unblock All in{" "}
                  {viewedMonth.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </button>
                {saving && (
                  <p className="font-sans text-xs text-brand-brown-light text-center">
                    Saving…
                  </p>
                )}
              </div>

              <div className="border border-brand-tan/20 rounded-lg p-4">
                <p className="font-sans text-sm text-brand-brown">
                  <span className="font-semibold">
                    {blockedDates.length} date{blockedDates.length !== 1 ? "s" : ""}
                  </span>{" "}
                  currently blocked:
                </p>
                {blockedDates.length > 0 && (
                  <p className="font-sans text-xs text-brand-brown-light mt-1 break-words">
                    {groupDates(blockedDates).join(", ")}
                  </p>
                )}
                {blockedDates.length === 0 && (
                  <p className="font-sans text-xs text-brand-brown-light italic mt-1">
                    No dates blocked. Everything is available.
                  </p>
                )}
              </div>
              {partialDates.length > 0 && (
                <div className="border border-amber-300 rounded-lg p-4">
                  <p className="font-sans text-sm text-brand-brown">
                    <span className="font-semibold">{partialDates.length}</span>{" "}
                    partial day{partialDates.length !== 1 ? "s" : ""} (departure
                    at or before noon, arrivals accepted after):
                  </p>
                  <div className="mt-1 space-y-0.5">
                    {partialDates.map((d) => (
                      <p
                        key={d}
                        className="font-sans text-xs text-brand-brown-light break-words"
                      >
                        {formatDate(d)}: {partialReasonByDate.get(d)}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {feedback && (
                <p className="font-sans text-xs text-brand-brown-light">
                  {feedback}
                </p>
              )}
            </div>
          </div>

          <form
            onSubmit={handleBlock}
            className="border-t border-brand-tan/20 pt-4 mt-6 space-y-3"
          >
            <p className="font-sans text-sm font-semibold text-brand-brown">
              Mark dates as unavailable
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="block font-sans text-xs text-brand-brown-light mb-1">
                  From
                </label>
                <input
                  type="date"
                  value={blockStart}
                  onChange={(e) => setBlockStart(e.target.value)}
                  className="w-full border border-brand-tan/30 rounded-lg px-3 py-2 font-sans text-sm text-brand-brown focus:outline-none focus:ring-2 focus:ring-brand-brown/30"
                  required
                />
              </div>
              <div className="flex-1">
                <label className="block font-sans text-xs text-brand-brown-light mb-1">
                  To
                </label>
                <input
                  type="date"
                  value={blockEnd}
                  onChange={(e) => setBlockEnd(e.target.value)}
                  className="w-full border border-brand-tan/30 rounded-lg px-3 py-2 font-sans text-sm text-brand-brown focus:outline-none focus:ring-2 focus:ring-brand-brown/30"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={blocking}
              className="w-full sm:w-auto bg-brand-brown text-brand-cream font-sans font-medium tracking-wider uppercase text-xs px-4 py-2 rounded-lg hover:bg-brand-brown-light transition-colors disabled:opacity-50"
            >
              {blocking ? "Blocking..." : "Block Dates"}
            </button>
            {blockResult && (
              <p className="font-sans text-xs text-brand-brown-light">
                {blockResult}
              </p>
            )}
          </form>
        </>
      )}
    </section>
  );
}

// ── Section: Booking Requests ────────────────────────────────────────────

const REQUEST_FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "declined", label: "Declined" },
] as const;

type RequestFilter = (typeof REQUEST_FILTERS)[number]["key"];

const STATUS_BADGE_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
};

function StatusBadge({ status }: { status: string }) {
  const style =
    STATUS_BADGE_STYLES[status] ?? "bg-brand-tan/10 text-brand-brown";
  return (
    <span
      className={`inline-block font-sans text-xs px-2 py-0.5 rounded-full capitalize ${style}`}
    >
      {status}
    </span>
  );
}

/** Fallback summary for legacy records that predate per-pet details. */
function summarizePets(pets: unknown): string {
  if (!pets || typeof pets !== "object") return "N/A";
  const p = pets as Record<string, unknown>;
  const parts: string[] = [];
  if (p.adultDogs) parts.push(`${p.adultDogs} dog(s)`);
  if (p.puppies) parts.push(`${p.puppies} pup(s)`);
  if (p.cats) parts.push(`${p.cats} cat(s)`);
  if (p.kittens) parts.push(`${p.kittens} kitten(s)`);
  const other = p.otherSpecies;
  if (Array.isArray(other) && other.length > 0) {
    parts.push(
      other
        .map((o: { name?: string; quantity?: number }) =>
          o.name ? `${o.quantity ?? 1}x ${o.name}` : "",
        )
        .filter(Boolean)
        .join(", "),
    );
  }
  return parts.length > 0 ? parts.join(" + ") : "N/A";
}

const EMPTY_VALUE = <span className="text-brand-tan">—</span>;

/** A labeled block of the request detail, separated by a hairline rule. */
function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-brand-tan/10 pt-3 mt-3">
      <h3 className="font-sans text-xs font-semibold tracking-wider uppercase text-brand-brown mb-2">
        {title}
      </h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

/** Definition-list row: bold label on the left, readable value on the right. */
function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[118px_1fr] gap-2 sm:grid-cols-[150px_1fr]">
      <span className="font-sans text-xs font-semibold text-brand-brown-light pt-0.5">
        {label}
      </span>
      <span className="font-sans text-sm text-brand-brown min-w-0 break-words">
        {value}
      </span>
    </div>
  );
}

/** One pet, rendered as its own labeled block: name, breed, age, type, species. */
function PetDetailBlock({ pet }: { pet: PetDetail }) {
  return (
    <div className="bg-brand-cream/60 border border-brand-tan/15 rounded-lg p-3">
      <p className="font-sans text-sm font-semibold text-brand-brown mb-1.5">
        {pet.name?.trim() ? pet.name.trim() : "Unnamed pet"}
      </p>
      <div className="space-y-1">
        <DetailRow
          label="Breed"
          value={pet.breed?.trim() ? pet.breed.trim() : EMPTY_VALUE}
        />
        <DetailRow
          label="Age"
          value={pet.age?.trim() ? pet.age.trim() : EMPTY_VALUE}
        />
        <DetailRow
          label="Type"
          value={pet.type ? (PET_TYPE_LABELS[pet.type] ?? pet.type) : EMPTY_VALUE}
        />
        {pet.type === "other" && (
          <DetailRow
            label="Species"
            value={pet.species?.trim() ? pet.species.trim() : EMPTY_VALUE}
          />
        )}
      </div>
    </div>
  );
}

function RequestCard({
  req,
  actionLoading,
  onApprove,
  onDecline,
  onDelete,
  onUpdateReferralReward,
}: {
  req: RequestRecord;
  actionLoading: boolean;
  onApprove: (req: RequestRecord, total: number, deposit: number, meetGreet?: string) => void;
  onDecline: (req: RequestRecord) => void;
  onDelete: (req: RequestRecord) => void;
  onUpdateReferralReward: (req: RequestRecord, status: string) => void;
}) {
  const petDetails: PetDetail[] = Array.isArray(req.petDetails)
    ? req.petDetails
    : [];
  const hasPetDetails = petDetails.length > 0;
  const hasAnxiety = !!req.petAnxieties && req.petAnxieties.trim().length > 0;
  const breakdown: BreakdownItem[] = Array.isArray(req.priceBreakdown)
    ? req.priceBreakdown
    : [];
  const [editTotal, setEditTotal] = useState(req.totalPrice || 0);
  const [editDeposit, setEditDeposit] = useState(
    req.depositAmount ?? Math.round((req.totalPrice || 0) * 0.5),
  );
  const [depositTouched, setDepositTouched] = useState(false);
  const handleTotalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    const total = Number.isFinite(v) && v >= 0 ? v : 0;
    setEditTotal(total);
    if (!depositTouched) setEditDeposit(Math.round(total * 0.5));
  };
  const handleDepositChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDepositTouched(true);
    const v = Number(e.target.value);
    setEditDeposit(Number.isFinite(v) && v >= 0 ? v : 0);
  };
  const [editMeetGreet, setEditMeetGreet] = useState(
    req.meetGreetFee !== undefined && req.meetGreetFee !== null
      ? String(req.meetGreetFee)
      : "",
  );
  const handleMeetGreetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditMeetGreet(e.target.value);
  };
  // Owner-facing summary of the computed Meet & Greet travel fee.
  const meetGreetInfo = req.meetGreetOutsideArea
    ? "Outside service area: offer a free virtual meet & greet instead."
    : req.meetGreetDistanceMiles !== undefined &&
        req.meetGreetDistanceMiles !== null
      ? "Auto distance " + String(req.meetGreetDistanceMiles) + " mi one-way" + (req.meetGreetFee !== undefined && req.meetGreetFee !== null ? " leads to " + formatPrice(req.meetGreetFee) : "") + ". Override before approving if needed."
      : "No distance was computed. Enter a fee below before approving if one applies.";
  const depositAmount =
    req.depositAmount ?? Math.round((req.totalPrice || 0) * 0.5);
  const submittedAt = new Date(req.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="border border-brand-tan/20 rounded-lg p-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-sans font-semibold text-brand-brown text-base">
              {req.clientName || "—"}
            </p>
            <StatusBadge status={req.status} />
          </div>
          <p className="font-sans text-xs text-brand-brown-light mt-1">
            {req.clientEmail || "—"}
            {req.clientPhone ? ` · ${req.clientPhone}` : ""}
          </p>
          <p className="font-sans text-xs text-brand-tan mt-0.5">
            Submitted {submittedAt}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-sans font-semibold text-brand-brown text-lg leading-tight">
            {formatPrice(req.totalPrice)}
          </p>
          <p className="font-sans text-xs text-brand-brown-light">total</p>
        </div>
      </div>

      {/* Client */}
      <DetailSection title="Client">
        <DetailRow label="Name" value={req.clientName || EMPTY_VALUE} />
        <DetailRow label="Email" value={req.clientEmail || EMPTY_VALUE} />
        <DetailRow
          label="Phone"
          value={req.clientPhone?.trim() ? req.clientPhone.trim() : EMPTY_VALUE}
        />
        <DetailRow
          label="Address"
          value={
            req.clientAddress?.trim() ? req.clientAddress.trim() : EMPTY_VALUE
          }
        />
        {req.hearAboutUs?.trim() && (
          <DetailRow label="How did you hear about us" value={req.hearAboutUs.trim()} />
        )}
        {req.referredBy?.trim() && (
          <>
            <DetailRow label="Referred by" value={req.referredBy.trim()} />
            <div className="grid grid-cols-[118px_1fr] gap-2 sm:grid-cols-[150px_1fr] items-center">
              <span className="font-sans text-xs font-semibold text-brand-brown-light">
                Referral reward
              </span>
              <select
                value={req.referralRewardStatus ?? "pending"}
                onChange={(e) => onUpdateReferralReward(req, e.target.value)}
                disabled={actionLoading}
                className="font-sans text-sm text-brand-brown border border-brand-tan/25 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-brand-tan/40 disabled:opacity-50 max-w-[180px]"
              >
                <option value="pending">Pending</option>
                <option value="issued">Issued</option>
                <option value="used">Used</option>
              </select>
            </div>
          </>
        )}
      </DetailSection>

      {/* Stay */}
      <DetailSection title="Stay">
        <DetailRow
          label="Arrival"
          value={`${formatDate(req.arrivalDate)} at ${formatTime(req.arrivalTime)}`}
        />
        <DetailRow
          label="Departure"
          value={`${formatDate(req.departureDate)} at ${formatTime(req.departureTime)}`}
        />
      </DetailSection>

      {/* Pets */}
      <DetailSection title="Pets">
        {hasPetDetails ? (
          <div className="space-y-2">
            {petDetails.map((pet, i) => (
              <PetDetailBlock key={`${pet.name}-${i}`} pet={pet} />
            ))}
          </div>
        ) : (
          <>
            {req.petNames?.trim() && (
              <DetailRow label="Names" value={req.petNames.trim()} />
            )}
            <DetailRow label="Pets" value={summarizePets(req.pets)} />
          </>
        )}
      </DetailSection>

      {/* Care details */}
      <DetailSection title="Care Details">
        <DetailRow
          label="Sleeps in bed"
          value={
            req.petSleepsInBed === "yes"
              ? "Yes"
              : req.petSleepsInBed === "no"
                ? "No"
                : EMPTY_VALUE
          }
        />
        {hasAnxiety && (
          <>
            <DetailRow label="Anxiety" value={req.petAnxieties!.trim()} />
            <DetailRow
              label="How it shows"
              value={
                req.petAnxietyManifestation?.trim()
                  ? req.petAnxietyManifestation.trim()
                  : EMPTY_VALUE
              }
            />
          </>
        )}
        {req.petQuirks?.trim() && (
          <DetailRow label="Quirks" value={req.petQuirks.trim()} />
        )}
      </DetailSection>

      {/* Notes */}
      {req.notes?.trim() && (
        <DetailSection title="Notes">
          <p className="font-sans text-sm text-brand-brown italic leading-relaxed">
            &ldquo;{req.notes.trim()}&rdquo;
          </p>
        </DetailSection>
      )}

      {/* Price */}
      <DetailSection title="Price">
        {req.status === "pending" ? (
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="block">
                <span className="font-sans text-xs font-semibold text-brand-brown-light">
                  Total price ($)
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={editTotal}
                  onChange={handleTotalChange}
                  disabled={actionLoading}
                  className="mt-1 w-full border border-brand-tan/30 rounded-md px-2 py-1 font-sans text-sm text-brand-brown focus:outline-none focus:ring-2 focus:ring-brand-tan/40"
                />
              </label>
              <label className="block">
                <span className="font-sans text-xs font-semibold text-brand-brown-light">
                  Deposit ($)
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={editDeposit}
                  onChange={handleDepositChange}
                  disabled={actionLoading}
                  className="mt-1 w-full border border-brand-tan/30 rounded-md px-2 py-1 font-sans text-sm text-brand-brown focus:outline-none focus:ring-2 focus:ring-brand-tan/40"
                />
              </label>
            </div>
            <p className="font-sans text-xs text-brand-brown-light">
              Review the total and deposit before approving. The booking, the
              client emails and the remaining balance all use these values.
            </p>
            <div className="border-t border-brand-tan/10 pt-2 mt-2">
              <label className="block">
                <span className="font-sans text-xs font-semibold text-brand-brown-light">
                  Meet &amp; Greet travel fee ($) (owner only)
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={editMeetGreet}
                  onChange={handleMeetGreetChange}
                  placeholder={
                    req.meetGreetFee !== undefined && req.meetGreetFee !== null
                      ? String(req.meetGreetFee)
                      : "0"
                  }
                  disabled={actionLoading}
                  className="mt-1 w-full border border-brand-tan/30 rounded-md px-2 py-1 font-sans text-sm text-brand-brown focus:outline-none focus:ring-2 focus:ring-brand-tan/40"
                />
              </label>
              <p className="font-sans text-xs text-brand-brown-light mt-1">
                {meetGreetInfo}
              </p>
            </div>
          </div>
        ) : (
          <DetailRow label="Total" value={formatPrice(req.totalPrice)} />
        )}
        <DetailRow label="Holiday rate" value={req.isHoliday ? "Yes" : "No"} />
        {req.meetGreetFee !== undefined && req.meetGreetFee !== null && (
          <DetailRow label="Meet & Greet fee" value={formatPrice(req.meetGreetFee)} />
        )}
        {breakdown.length > 0 && (
          <div className="pt-1">
            {breakdown.map((item, i) => (
              <DetailRow
                key={`${item.label}-${i}`}
                label={item.label}
                value={`${formatPrice(item.rate)}/night × ${formatDayCount(
                  item.days,
                )} day${item.days === 1 ? "" : "s"} = ${formatPrice(item.subtotal)}`}
              />
            ))}
          </div>
        )}
        {req.status === "approved" && (
          <DetailRow
            label="Deposit"
            value={
              <span className="text-green-700">
                {formatPrice(depositAmount)} due via Zelle
                (jen.johnpetservices@proton.me), Venmo (@jjhpetservices), PayPal
                (paypal.me/jenjohnpetservices), or Cash App ($jenjohnpetservices).
                Dates are locked in once received.
              </span>
            }
          />
        )}
      </DetailSection>

      {/* Actions */}
      <div className="flex gap-2 pt-3 mt-3 border-t border-brand-tan/10">
        {req.status === "pending" && (
          <>
            <button
              onClick={() => onApprove(req, editTotal, editDeposit, editMeetGreet)}
              disabled={actionLoading}
              className="flex-1 bg-green-600 text-white font-sans font-medium text-xs px-3 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {actionLoading ? "..." : "Approve"}
            </button>
            <button
              onClick={() => onDecline(req)}
              disabled={actionLoading}
              className="flex-1 bg-red-500 text-white font-sans font-medium text-xs px-3 py-2 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              {actionLoading ? "..." : "Decline"}
            </button>
          </>
        )}
        <button
          onClick={() => onDelete(req)}
          disabled={actionLoading}
          className={`font-sans text-xs font-medium px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 transition-colors disabled:opacity-50 ${
            req.status === "pending" ? "flex-1" : "ml-auto"
          }`}
        >
          {actionLoading ? "..." : "Delete request"}
        </button>
      </div>
    </div>
  );
}

function RequestsSection() {
  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [filter, setFilter] = useState<RequestFilter>("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null); // request _id being acted on

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await adminGetRequests();
      if (result.success) {
        setRequests(result.data);
      } else {
        setError(result.error);
      }
    } catch {
      setError("Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async (
    req: RequestRecord,
    editedTotal?: number,
    editedDeposit?: number,
    editedMeetGreet?: string,
  ) => {
    setActionLoading(req._id);
    try {
      const approvedTotal = editedTotal ?? req.totalPrice;
      const depositAmount =
        editedDeposit ?? Math.round(approvedTotal * 0.5);
      const meetGreetFee =
        editedMeetGreet !== undefined && editedMeetGreet.trim() !== ""
          ? Number(editedMeetGreet)
          : (req.meetGreetFee ?? undefined);
      const result = await adminUpdateRequestStatus({
        id: req._id,
        status: "approved",
        depositAmount,
        depositLink: "manual",
        meetGreetFee,
        clientName: req.clientName,
        clientEmail: req.clientEmail,
        clientPhone: req.clientPhone,
        arrivalDate: req.arrivalDate,
        arrivalTime: req.arrivalTime,
        departureDate: req.departureDate,
        departureTime: req.departureTime,
        pets: req.pets,
        isHoliday: req.isHoliday,
        totalPrice: approvedTotal,
        holidaySurchargeDays: req.holidaySurchargeDays,
        holidaySurcharge: req.holidaySurcharge,
        priceBreakdown: req.priceBreakdown,
        notes: req.notes,
        petNames: req.petNames,
        petDetails: req.petDetails,
      });
      if (result.success) {
        load();
      } else {
        setError(result.error);
      }
    } catch {
      setError("Failed to approve request");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (req: RequestRecord) => {
    setActionLoading(req._id);
    try {
      const result = await adminUpdateRequestStatus({
        id: req._id,
        status: "declined",
        clientName: req.clientName,
        clientEmail: req.clientEmail,
        clientPhone: req.clientPhone,
        arrivalDate: req.arrivalDate,
        arrivalTime: req.arrivalTime,
        departureDate: req.departureDate,
        departureTime: req.departureTime,
        pets: req.pets,
        isHoliday: req.isHoliday,
        totalPrice: req.totalPrice,
        priceBreakdown: req.priceBreakdown,
        notes: req.notes,
        petNames: req.petNames,
        petDetails: req.petDetails,
      });
      if (result.success) {
        load();
      } else {
        setError(result.error);
      }
    } catch {
      setError("Failed to decline request");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (req: RequestRecord) => {
    if (
      !window.confirm(
        "Delete this booking request permanently? This cannot be undone.",
      )
    ) {
      return;
    }
    setActionLoading(req._id);
    setError("");
    setFeedback("");
    try {
      const result = await adminDeleteRequest({ id: req._id });
      if (result.success) {
        // Remove from local state so the card disappears immediately.
        setRequests((prev) => prev.filter((r) => r._id !== req._id));
        setFeedback("Request deleted.");
      } else {
        setFeedback(result.error);
      }
    } catch {
      setFeedback("Failed to delete request.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateReferralReward = async (req: RequestRecord, status: string) => {
    setActionLoading(req._id);
    setError("");
    setFeedback("");
    try {
      const result = await adminUpdateReferralRewardStatus({
        requestId: req._id,
        status,
      });
      if (result.success) {
        // Reflect the change locally immediately, matching how status
        // changes handle local state.
        setRequests((prev) =>
          prev.map((r) =>
            r._id === req._id ? { ...r, referralRewardStatus: status } : r,
          ),
        );
        setFeedback("Referral reward updated.");
      } else {
        setError(result.error);
      }
    } catch {
      setError("Failed to update referral reward");
    } finally {
      setActionLoading(null);
    }
  };

  const counts = useMemo(() => {
    const c: Record<RequestFilter, number> = {
      all: requests.length,
      pending: 0,
      approved: 0,
      declined: 0,
    };
    for (const r of requests) {
      if (r.status === "pending") c.pending++;
      else if (r.status === "approved") c.approved++;
      else if (r.status === "declined") c.declined++;
    }
    return c;
  }, [requests]);

  const visible = useMemo(
    () =>
      filter === "all"
        ? requests
        : requests.filter((r) => r.status === filter),
    [requests, filter],
  );

  return (
    <section className="bg-white rounded-xl shadow-sm border border-brand-tan/20 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h2 className="font-sans text-lg font-semibold tracking-wide uppercase text-brand-brown">
            Booking Requests
          </h2>
          <p className="font-sans text-sm text-brand-brown-light mt-0.5">
            Every detail the client submitted, exactly as they entered it.
          </p>
        </div>
        <div className="flex gap-1 bg-brand-tan/10 rounded-lg p-1">
          {REQUEST_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`font-sans text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
                filter === f.key
                  ? "bg-brand-brown text-brand-cream"
                  : "text-brand-brown hover:bg-brand-tan/20"
              }`}
            >
              {f.label}
              <span
                className={
                  filter === f.key
                    ? "text-brand-cream/80"
                    : "text-brand-brown-light"
                }
              >
                {" "}({counts[f.key]})
              </span>
            </button>
          ))}
        </div>
      </div>

      {feedback && (
        <p className="font-sans text-xs text-brand-brown-light mb-3">
          {feedback}
        </p>
      )}

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorMessage message={error} />
      ) : visible.length === 0 ? (
        <EmptyMessage
          message={
            filter === "all"
              ? "No booking requests yet."
              : `No ${filter} booking requests.`
          }
        />
      ) : (
        <div className="space-y-4">
          {visible.map((req) => (
            <RequestCard
              key={req._id}
              req={req}
              actionLoading={actionLoading === req._id}
              onApprove={handleApprove}
              onDecline={handleDecline}
              onDelete={handleDelete}
              onUpdateReferralReward={handleUpdateReferralReward}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ── Section: Confirmed Bookings ──────────────────────────────────────────

/**
 * Per-booking deposit tracker. The owner marks whether the deposit was paid
 * and (when paid) which method the client used. Saving a paid deposit fires the
 * client-facing deposit-received confirmation email.
 */
function BookingDepositControl({
  b,
  onSaved,
}: {
  b: BookingRecord;
  onSaved: () => void;
}) {
  const [draftPaid, setDraftPaid] = useState(b.depositPaid);
  const [draftMethod, setDraftMethod] = useState(b.paymentMethod ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setDraftPaid(b.depositPaid);
    setDraftMethod(b.paymentMethod ?? "");
  }, [b._id, b.depositPaid, b.paymentMethod]);

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const result = await adminUpdateBookingDeposit({
        id: b._id,
        depositPaid: draftPaid,
        paymentMethod: draftPaid ? draftMethod : undefined,
        clientName: b.clientName,
        clientEmail: b.clientEmail,
        arrivalDate: b.arrivalDate,
        departureDate: b.departureDate,
        totalPrice: b.totalPrice,
        petNames: b.petNames,
        depositAmount: b.depositAmount,
      });
      if (result.success) {
        onSaved();
      } else {
        setError(result.error);
      }
    } catch {
      setError("Failed to update deposit");
    } finally {
      setSaving(false);
    }
  };

  const paidBtn = `px-3 py-1 rounded-full font-sans text-xs font-medium transition-colors ${
    draftPaid
      ? "bg-green-600 text-white"
      : "bg-white border border-brand-tan/40 text-brand-brown hover:bg-green-50"
  }`;
  const unpaidBtn = `px-3 py-1 rounded-full font-sans text-xs font-medium transition-colors ${
    !draftPaid
      ? "bg-brand-tan text-white"
      : "bg-white border border-brand-tan/40 text-brand-brown hover:bg-brand-tan/20"
  }`;

  return (
    <div className="mt-3 pt-3 border-t border-brand-tan/10 space-y-2">
      <div className="flex items-center gap-3">
        <span className="font-sans text-xs font-medium text-brand-brown">
          Deposit paid?
        </span>
        <button
          type="button"
          onClick={() => setDraftPaid(true)}
          className={paidBtn}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => setDraftPaid(false)}
          className={unpaidBtn}
        >
          No
        </button>
      </div>
      {draftPaid && (
        <div className="flex items-center gap-2">
          <span className="font-sans text-xs text-brand-brown-light">
            Paid via
          </span>
          <select
            value={draftMethod}
            onChange={(e) => setDraftMethod(e.target.value)}
            className="border border-brand-tan/30 rounded-lg px-2 py-1 font-sans text-xs text-brand-brown focus:outline-none focus:ring-2 focus:ring-brand-brown/30"
          >
            <option value="" disabled>
              Select method
            </option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving || (draftPaid && !draftMethod)}
          className="px-3 py-1 rounded-lg bg-brand-brown text-brand-cream font-sans text-xs font-medium hover:bg-brand-brown-light disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Deposit"}
        </button>
        {error && (
          <span className="font-sans text-xs text-red-600">{error}</span>
        )}
      </div>
    </div>
  );
}

/** The remaining balance for a booking (total minus the deposit). */
function bookingRemainingBalance(b: BookingRecord): number {
  return b.totalPrice - bookingDeposit(b);
}

/** Control to record whether the remaining balance has been received. */
function BalanceControl({
  b,
  onSaved,
}: {
  b: BookingRecord;
  onSaved: () => void;
}) {
  const [draftPaid, setDraftPaid] = useState(!!b.balancePaid);
  const [draftMethod, setDraftMethod] = useState(b.balancePaymentMethod ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setDraftPaid(!!b.balancePaid);
    setDraftMethod(b.balancePaymentMethod ?? "");
  }, [b._id, b.balancePaid, b.balancePaymentMethod]);

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const result = await adminUpdateBookingBalance({
        id: b._id,
        balancePaid: draftPaid,
        balancePaymentMethod: draftPaid ? draftMethod : undefined,
        clientName: b.clientName,
        clientEmail: b.clientEmail,
        arrivalDate: b.arrivalDate,
        departureDate: b.departureDate,
        totalPrice: b.totalPrice,
        petNames: b.petNames,
        depositAmount: b.depositAmount,
      });
      if (result.success) {
        onSaved();
      } else {
        setError(result.error);
      }
    } catch {
      setError("Failed to update remaining balance");
    } finally {
      setSaving(false);
    }
  };

  const paidBtn = `px-3 py-1 rounded-full font-sans text-xs font-medium transition-colors ${
    draftPaid
      ? "bg-green-600 text-white"
      : "bg-white border border-brand-tan/40 text-brand-brown hover:bg-green-50"
  }`;
  const unpaidBtn = `px-3 py-1 rounded-full font-sans text-xs font-medium transition-colors ${
    !draftPaid
      ? "bg-brand-tan text-white"
      : "bg-white border border-brand-tan/40 text-brand-brown hover:bg-brand-tan/20"
  }`;

  // Already recorded as paid on the server. Show the received state with no
  // duplicate paid button. The toggle can still be flipped to No to unmark,
  // which saves unpaid and sends no email.
  const alreadyPaid = !!b.balancePaid;

  return (
    <div className="mt-3 pt-3 border-t border-brand-tan/10 space-y-2">
      <div className="flex items-center gap-3">
        <span className="font-sans text-xs font-medium text-brand-brown">
          Remaining balance received?
        </span>
        <button
          type="button"
          onClick={() => setDraftPaid(true)}
          className={paidBtn}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => setDraftPaid(false)}
          className={unpaidBtn}
        >
          No
        </button>
      </div>
      {draftPaid && (
        <div className="flex items-center gap-2">
          <span className="font-sans text-xs text-brand-brown-light">
            Received via
          </span>
          <select
            value={draftMethod}
            onChange={(e) => setDraftMethod(e.target.value)}
            className="border border-brand-tan/30 rounded-lg px-2 py-1 font-sans text-xs text-brand-brown focus:outline-none focus:ring-2 focus:ring-brand-brown/30"
          >
            <option value="" disabled>
              Select method
            </option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      )}
      {alreadyPaid && draftPaid ? (
        <div className="flex items-center gap-2">
          <span className="inline-block font-sans text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-md">
            Balance received{draftMethod ? ` via ${draftMethod}` : ""}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {draftPaid ? (
            <button
              type="button"
              onClick={save}
              disabled={saving || !draftMethod}
              className="px-3 py-1 rounded-lg bg-green-600 text-white font-sans text-xs font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Mark balance paid & email client"}
            </button>
          ) : (
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="px-3 py-1 rounded-lg bg-brand-brown text-brand-cream font-sans text-xs font-medium hover:bg-brand-brown-light disabled:opacity-50"
            >
              {saving ? "Saving..." : "Mark balance unpaid"}
            </button>
          )}
          {error && (
            <span className="font-sans text-xs text-red-600">{error}</span>
          )}
        </div>
      )}
    </div>
  );
}

/** Compact read-only list of which client emails have been sent for a booking.
 *  Each row reflects the real one-time-send guard, so it is informational only. */
function EmailSentChecklist({ b }: { b: BookingRecord }) {
  const rows: { label: string; sent: boolean }[] = [
    { label: "Approved", sent: true },
    { label: "Deposit received", sent: !!b.depositEmailSent },
    { label: "Deposit reminder", sent: !!b.depositReminderSent },
    { label: "Balance received", sent: !!b.balanceEmailSent },
    { label: "End of stay", sent: !!b.postCompletionSent },
    { label: "Pet profile / return code", sent: !!b.profileExists },
  ];
  if (b.cancellationEmailSent) {
    rows.push({ label: "Cancellation", sent: true });
  }
  if (b.rescheduleEmailSent) {
    rows.push({ label: "Reschedule", sent: true });
  }

  return (
    <div className="mt-3 pt-3 border-t border-brand-tan/10">
      <p className="font-sans text-[11px] font-medium uppercase tracking-wide text-brand-brown-light mb-2">
        Sent to this client
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {rows.map((r) => (
          <label
            key={r.label}
            className="flex items-center gap-2 font-sans text-xs text-brand-brown-light"
          >
            <input
              type="checkbox"
              checked={r.sent}
              readOnly
              disabled
              className="accent-green-600 h-3.5 w-3.5"
            />
            {r.label}
          </label>
        ))}
      </div>
    </div>
  );
}

/** The deposit expected for a booking (stored value, else half the total). */
function bookingDeposit(b: BookingRecord): number {
  return b.depositAmount ?? Math.round(b.totalPrice * 0.5);
}

/** Cancel confirmation with a refund readout shown before the action runs. */
function CancelBookingControl({
  b,
  onSaved,
}: {
  b: BookingRecord;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const refund = computeRefund({
    arrivalDate: b.arrivalDate,
    isHoliday: b.isHoliday ?? false,
    depositAmount: b.depositAmount,
    totalPrice: b.totalPrice,
  });
  const method = b.paymentMethod?.trim()
    ? `via ${b.paymentMethod.trim()}`
    : "your payment method on file";

  const confirm = async () => {
    setBusy(true);
    setError("");
    setDone("");
    try {
      const result = await adminCancelBooking({
        bookingId: b._id,
        requestId: b.requestId,
        clientName: b.clientName,
        clientEmail: b.clientEmail,
        arrivalDate: b.arrivalDate,
        departureDate: b.departureDate,
        isHoliday: b.isHoliday ?? false,
        depositAmount: b.depositAmount,
        totalPrice: b.totalPrice,
        paymentMethod: b.paymentMethod,
        petNames: b.petNames,
      });
      if (result.success) {
        setDone(
          result.data.emailed
            ? "Booking cancelled. Cancellation notice sent to the client."
            : "Booking cancelled. (Cancellation notice had already been sent.)",
        );
        setOpen(false);
        onSaved();
      } else {
        setError(result.error);
      }
    } catch {
      setError("Failed to cancel booking");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-brand-tan/10">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="px-3 py-1 rounded-lg border border-red-300 text-red-700 font-sans text-xs font-medium hover:bg-red-50"
        >
          Cancel Booking
        </button>
      ) : (
        <div className="space-y-3">
          <div className="bg-brand-cream border border-brand-tan/20 rounded-lg p-3">
            <p className="font-sans text-xs font-semibold uppercase tracking-wide text-brand-brown mb-2">
              Cancellation Confirmation
            </p>
            {refund > 0 ? (
              <p className="font-sans text-sm text-brand-brown">
                Refund due to client:{" "}
                <span className="font-semibold">{formatPrice(refund)}</span>{" "}
                ({method}). The cancellation notice will state this refund.
              </p>
            ) : (
              <p className="font-sans text-sm text-brand-brown">
                <span className="font-semibold">No refund</span> due. This
                booking is non refundable, so the cancellation notice will state
                $0.
              </p>
            )}
          </div>
          {error && <p className="font-sans text-xs text-red-600">{error}</p>}
          {done && <p className="font-sans text-xs text-green-700">{done}</p>}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={confirm}
              disabled={busy}
              className="px-3 py-1 rounded-lg bg-red-600 text-white font-sans text-xs font-medium hover:bg-red-700 disabled:opacity-50"
            >
              {busy ? "Cancelling..." : "Confirm Cancellation"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={busy}
              className="px-3 py-1 rounded-lg border border-brand-tan/30 text-brand-brown font-sans text-xs font-medium hover:bg-brand-tan/10 disabled:opacity-50"
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function BookingsSection() {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await adminGetBookings();
      if (result.success) {
        // Sort: upcoming first (by arrivalDate ascending)
        const sorted = [...result.data].sort((a, b) =>
          a.arrivalDate.localeCompare(b.arrivalDate),
        );
        setBookings(sorted);
      } else {
        setError(result.error);
      }
    } catch {
      setError("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="bg-white rounded-xl shadow-sm border border-brand-tan/20 p-6">
      <h2 className="font-sans text-lg font-semibold tracking-wide uppercase text-brand-brown mb-4">
        Confirmed Bookings
      </h2>

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorMessage message={error} />
      ) : bookings.length === 0 ? (
        <EmptyMessage message="No confirmed bookings yet." />
      ) : (
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
          {bookings.map((b) => (
            <div
              key={b._id}
              className="border border-brand-tan/20 rounded-lg p-4 space-y-1"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-sans font-semibold text-brand-brown">
                    {b.clientName}
                  </p>
                  <p className="font-sans text-xs text-brand-brown-light">
                    {b.clientEmail}
                  </p>
                </div>
                <span className="font-sans font-semibold text-brand-brown text-sm">
                  {formatPrice(b.totalPrice)}
                </span>
              </div>
              <div className="font-sans text-xs text-brand-brown-light">
                <p>
                  {formatDate(b.arrivalDate)} – {formatDate(b.departureDate)}
                </p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <span
                  className={`inline-block font-sans text-xs px-2 py-0.5 rounded-full ${
                    b.depositPaid
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {b.depositPaid
                    ? b.paymentMethod
                      ? `Deposit Paid via ${b.paymentMethod}`
                      : "Deposit Paid"
                    : "Deposit Pending"}
                </span>
                {!b.depositPaid && (
                  <span className="font-sans text-xs text-brand-brown-light">
                    ({formatPrice(Math.round(b.totalPrice * 0.5))} due via Zelle
                    jen.johnpetservices@proton.me, Venmo @jjhpetservices, PayPal
                    paypal.me/jenjohnpetservices, or Cash App $jenjohnpetservices)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <span className="font-sans text-xs font-medium text-brand-brown">
                  Remaining balance:
                  <span className="font-semibold">
                    {" " + formatPrice(bookingRemainingBalance(b))}
                  </span>
                </span>
                <span
                  className={`inline-block font-sans text-xs px-2 py-0.5 rounded-full ${
                    b.balancePaid
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {b.balancePaid
                    ? b.balancePaymentMethod
                      ? `Received via ${b.balancePaymentMethod}`
                      : "Received"
                    : "Outstanding"}
                </span>
              </div>
              <BookingDepositControl b={b} onSaved={load} />
              <BalanceControl b={b} onSaved={load} />
              <div className="flex items-center gap-2 pt-1">
                <CancelBookingControl b={b} onSaved={load} />
                <RescheduleControl b={b} onSaved={load} />
              </div>
              <EmailSentChecklist b={b} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Section: Reviews Management ──────────────────────────────────────────

function ReviewsSection() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [quote, setQuote] = useState("");
  const [date, setDate] = useState(todayIso());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await loadReviews();
      if (result.success) {
        setReviews(result.data);
      } else {
        setError(result.error);
      }
    } catch {
      setError("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setName("");
    setQuote("");
    setDate(todayIso());
    setEditingId(null);
    setFeedback("");
  };

  const startEdit = (r: Review) => {
    setEditingId(r._id ?? null);
    setName(r.name);
    setQuote(r.quote);
    setDate(displayToIso(r.date));
    setFeedback("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !quote.trim() || !date) return;
    const payload = {
      name: name.trim(),
      quote: quote.trim(),
      date: isoToDisplay(date),
    };
    setSaving(true);
    setFeedback("");
    try {
      const result = editingId
        ? await editReview({ id: editingId, ...payload })
        : await addReview(payload);
      if (result.success) {
        resetForm();
        setFeedback(editingId ? "Review updated." : "Review added.");
        load();
      } else {
        setFeedback(result.error);
      }
    } catch {
      setFeedback("Failed to save review.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r: Review) => {
    if (!r._id) return;
    if (!window.confirm(`Delete review from ${r.name}? This cannot be undone.`)) {
      return;
    }
    setDeletingId(r._id);
    setFeedback("");
    try {
      const result = await deleteReviewAction({ id: r._id });
      if (result.success) {
        setFeedback("Review deleted.");
        load();
      } else {
        setFeedback(result.error);
      }
    } catch {
      setFeedback("Failed to delete review.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="bg-white rounded-xl shadow-sm border border-brand-tan/20 p-6">
      <h2 className="font-sans text-lg font-semibold tracking-wide uppercase text-brand-brown mb-1">
        Reviews
      </h2>
      <p className="font-sans text-sm text-brand-brown-light mb-4">
        Manage the testimonials shown in the homepage carousel. Changes appear
        on the public page right away.
      </p>

      {/* Add / edit form */}
      <form
        onSubmit={handleSubmit}
        className="border border-brand-tan/20 rounded-lg p-4 space-y-3 mb-5"
      >
        <p className="font-sans text-sm font-semibold text-brand-brown">
          {editingId ? "Edit review" : "Add a review"}
        </p>
        <div>
          <label className="block font-sans text-xs text-brand-brown-light mb-1">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Annie W."
            className="w-full border border-brand-tan/30 rounded-lg px-3 py-2 font-sans text-sm text-brand-brown focus:outline-none focus:ring-2 focus:ring-brand-brown/30"
            required
          />
        </div>
        <div>
          <label className="block font-sans text-xs text-brand-brown-light mb-1">
            Review Text
          </label>
          <textarea
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            rows={4}
            placeholder="What did the client say?"
            className="w-full border border-brand-tan/30 rounded-lg px-3 py-2 font-sans text-sm text-brand-brown focus:outline-none focus:ring-2 focus:ring-brand-brown/30 resize-y"
            required
          />
        </div>
        <div>
          <label className="block font-sans text-xs text-brand-brown-light mb-1">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-brand-tan/30 rounded-lg px-3 py-2 font-sans text-sm text-brand-brown focus:outline-none focus:ring-2 focus:ring-brand-brown/30"
            required
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-brand-brown text-brand-cream font-sans font-medium tracking-wider uppercase text-xs px-4 py-2 rounded-lg hover:bg-brand-brown-light transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : editingId ? "Save Changes" : "Add Review"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="font-sans text-xs text-brand-tan underline hover:text-brand-brown transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
        {feedback && (
          <p className="font-sans text-xs text-brand-brown-light">
            {feedback}
          </p>
        )}
      </form>

      {/* Review list */}
      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorMessage message={error} />
      ) : reviews.length === 0 ? (
        <EmptyMessage message="No reviews yet. Add one above." />
      ) : (
        <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
          {reviews.map((r) => (
            <div
              key={r._id}
              className="border border-brand-tan/20 rounded-lg p-4"
            >
              <div className="flex justify-between items-start gap-3">
                <div>
                  <p className="font-sans font-semibold text-brand-brown">
                    {r.name}
                  </p>
                  <p className="font-sans text-xs text-brand-brown-light">
                    {r.date}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => startEdit(r)}
                    className="font-sans text-xs font-medium text-brand-brown bg-brand-tan/10 hover:bg-brand-tan/20 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(r)}
                    disabled={deletingId === r._id}
                    className="font-sans text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {deletingId === r._id ? "..." : "Delete"}
                  </button>
                </div>
              </div>
              <p className="font-sans text-sm text-brand-brown-light mt-2 italic line-clamp-3">
                &ldquo;{r.quote}&rdquo;
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Change Password Section ──
function ChangePasswordSection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const result = await changePassword({
        data: { currentPassword: current, newPassword: next },
      });
      if (result.success) {
        setMessage({ type: "success", text: "Password updated successfully." });
        setCurrent("");
        setNext("");
      } else {
        setMessage({
          type: "error",
          text: result.error || "Could not update the password.",
        });
      }
    } catch {
      setMessage({ type: "error", text: "Could not update the password. Please try again." });
    } finally {
      setSaving(false);
    }
  };
  return (
    <section className="bg-white rounded-xl shadow-sm border border-brand-tan/20 p-6">
      <h2 className="font-sans text-lg font-semibold tracking-wide uppercase text-brand-brown mb-1">
        Change Password
      </h2>
      <p className="font-sans text-sm text-brand-brown-light mb-4">
        Update the admin password. Use at least 8 characters. Your new password
        is stored securely and stays the same across updates.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label
            htmlFor="current-password"
            className="block font-sans text-sm font-semibold tracking-wide uppercase text-brand-brown mb-1"
          >
            Current Password
          </label>
          <input
            id="current-password"
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className="w-full border border-brand-tan/30 rounded-lg px-4 py-2 font-sans text-brand-brown focus:outline-none focus:ring-2 focus:ring-brand-brown/30"
            placeholder="Enter current password"
            autoComplete="current-password"
          />
        </div>
        <div>
          <label
            htmlFor="new-password"
            className="block font-sans text-sm font-semibold tracking-wide uppercase text-brand-brown mb-1"
          >
            New Password
          </label>
          <input
            id="new-password"
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className="w-full border border-brand-tan/30 rounded-lg px-4 py-2 font-sans text-brand-brown focus:outline-none focus:ring-2 focus:ring-brand-brown/30"
            placeholder="Enter new password"
            autoComplete="new-password"
          />
        </div>
        {message && (
          <p
            className={
              message.type === "success"
                ? "font-sans text-sm text-green-700"
                : "font-sans text-sm text-red-600"
            }
          >
            {message.text}
          </p>
        )}
        <button
          type="submit"
          disabled={saving || current.length === 0 || next.length === 0}
          className="bg-brand-brown text-brand-cream font-sans font-medium tracking-wider uppercase text-sm px-6 py-3 rounded-lg hover:bg-brand-brown-light transition-colors disabled:opacity-50"
        >
          {saving ? "Updating..." : "Update Password"}
        </button>
      </form>
    </section>
  );
}

// ── Meet & Greet Calculator + Settings Section ─────────────────────────────
function MeetGreetSection() {
  const [mode, setMode] = useState<"address" | "manual">("address");
  const [address, setAddress] = useState("");
  const [miles, setMiles] = useState("");
  const [result, setResult] = useState<MeetGreetCalcResult | null>(null);
  const [calcErr, setCalcErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [saved, setSaved] = useState("");
  const loadSettings = useCallback(async () => {
    try { const r: any = await meetGreetGetSettings(); if (r?.success) setSettings(r.data); } catch { /* ignore */ }
  }, []);
  useEffect(() => { loadSettings(); }, [loadSettings]);
  const runCalc = async () => {
    setBusy(true); setCalcErr(""); setResult(null);
    try {
      const r = await meetGreetCalculate({
        oneWayMiles: mode === "manual" && miles.trim() !== "" ? Number(miles) : undefined,
        clientAddress: mode === "address" && address.trim() !== "" ? address.trim() : undefined,
      });
      setResult(r);
    } catch (e) { setCalcErr(e instanceof Error ? e.message : "Calculation failed"); }
    finally { setBusy(false); }
  };
  const save = async () => {
    setSaved("");
    try {
      const r: any = await meetGreetSaveSettings({
        baseAddress: settings?.baseAddress,
        flatFee: Number(settings?.flatFee),
        freeRadiusMiles: Number(settings?.freeRadiusMiles),
        feeStartsAtOneWay: Number(settings?.feeStartsAtOneWay),
        ratePerMile: Number(settings?.ratePerMile),
        feeCap: Number(settings?.feeCap),
        outsideServiceAreaMiles: Number(settings?.outsideServiceAreaMiles),
        distanceProvider: settings?.distanceProvider,
        virtualNote: settings?.virtualNote,
      });
      setSaved(r?.success ? "Settings saved." : (r?.error || "Save failed."));
    } catch (e) { setSaved(e instanceof Error ? e.message : "Save failed."); }
  };
  const setNum = (k: string, v: string) => setSettings((sx: any) => ({ ...sx, [k]: v }));
  const inputCls = "mt-1 w-full border border-brand-tan/30 rounded-md px-2 py-1 font-sans text-sm text-brand-brown focus:outline-none focus:ring-2 focus:ring-brand-tan/40";
  return (
    <div className="border border-brand-tan/20 rounded-lg p-5">
      <h2 className="font-sans text-xl font-bold text-brand-brown">Meet &amp; Greet Travel Fee</h2>
      <p className="font-sans text-xs text-brand-brown-light mt-1">
        Owner only. Computed from one way driving distance (base to client). Never shown to clients.
      </p>
      <div className="mt-4 border border-brand-tan/15 rounded-lg p-4 bg-white">
        <div className="flex gap-2">
          {(["address", "manual"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={"font-sans text-sm px-3 py-1 rounded-full border transition-colors " + (mode === m ? "bg-brand-brown text-brand-cream border-brand-brown" : "bg-white text-brand-brown border-brand-tan/30")}>{m === "address" ? "By address" : "Manual miles"}</button>
          ))}
        </div>
        {mode === "address" ? (
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Client home address" className={inputCls + " mt-2"} />
        ) : (
          <input type="number" min={0} value={miles} onChange={(e) => setMiles(e.target.value)} placeholder="One way miles" className={inputCls + " mt-2"} />
        )}
        <button onClick={runCalc} disabled={busy} className="mt-2 bg-brand-brown text-brand-cream rounded-md px-3 py-1.5 font-sans text-sm disabled:opacity-50">{busy ? "..." : "Calculate"}</button>
        {calcErr && <p className="font-sans text-xs text-red-600 mt-2">{calcErr}</p>}
        {result && (
          <div className="mt-3 font-sans text-sm text-brand-brown">
            <p className="font-semibold">{result.outsideArea ? "Outside service area: offer a free virtual meet & greet." : "Travel fee: " + result.formattedFee}</p>
            <p className="text-xs text-brand-brown-light">Distance: {result.oneWayMiles} mi one way (via {result.mode}) · Tier: {result.tier}</p>
            {(result.status !== "ok" || !result.outsideArea) && result.status !== "ok" && result.message ? (
              <p className="text-xs text-red-600 mt-1">{result.message} (use manual miles instead)</p>
            ) : null}
          </div>
        )}
      </div>
      <div className="mt-4">
        <h3 className="font-sans text-sm font-semibold text-brand-brown">Settings</h3>
        {!settings && <p className="font-sans text-xs text-brand-brown-light">Loading...</p>}
        {settings && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
            <label className="block sm:col-span-2">
              <span className="font-sans text-xs font-semibold text-brand-brown-light">Base address</span>
              <input value={settings.baseAddress || ""} onChange={(e) => setNum("baseAddress", e.target.value)} className={inputCls} />
            </label>
            {([["flatFee","Flat fee"],["freeRadiusMiles","Free radius miles"],["feeStartsAtOneWay","Fee starts at (one way)"],["ratePerMile","Rate per mile"],["feeCap","Fee cap"],["outsideServiceAreaMiles","Outside area miles"]] as const).map(([k, label]) => (
              <label className="block" key={k}>
                <span className="font-sans text-xs font-semibold text-brand-brown-light">{label}</span>
                <input type="number" value={settings[k] ?? ""} onChange={(e) => setNum(k, e.target.value)} className={inputCls} />
              </label>
            ))}
            <label className="block">
              <span className="font-sans text-xs font-semibold text-brand-brown-light">Distance provider</span>
              <select value={settings.distanceProvider || "manual"} onChange={(e) => setNum("distanceProvider", e.target.value)} className={inputCls}>
                <option value="manual">Manual (default)</option>
                <option value="mapbox">Mapbox</option>
                <option value="google">Google</option>
              </select>
            </label>
          </div>
        )}
        <button onClick={save} className="mt-3 bg-brand-brown text-brand-cream rounded-md px-3 py-1.5 font-sans text-sm">Save settings</button>
        {saved && <p className="font-sans text-xs mt-1 text-brand-brown-light">{saved}</p>}
        <p className="font-sans text-xs text-brand-brown-light mt-2">Free radius is set to 20 miles: meet & greets are free for addresses within 19 miles and below.</p>
      </div>
    </div>
  );
}

// ── Email Templates Section ───────────────────────────────────────────────
function EmailTemplatesSection() {
  const [views, setViews] = useState<TemplateView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [sendingTest, setSendingTest] = useState<string | null>(null);
  const [testRecipient, setTestRecipient] = useState(
    "jen.johnpetservices@proton.me",
  );
  const [feedback, setFeedback] = useState<{
    slug: string;
    type: "success" | "error";
    text: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await loadEmailTemplates();
      if (result.success) {
        setViews(result.data);
      } else {
        setError(result.error);
      }
    } catch {
      setError("Failed to load email templates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const update = (slug: string, patch: Partial<TemplateView>) => {
    setViews((prev) =>
      prev.map((v) => (v.slug === slug ? { ...v, ...patch } : v)),
    );
  };

  const handleSave = async (v: TemplateView) => {
    setSaving(v.slug);
    setFeedback(null);
    try {
      const result = await saveEmailTemplate({
        slug: v.slug,
        body: v.body,
        subject: v.subject,
      });
      if (result.success) {
        setFeedback({ slug: v.slug, type: "success", text: "Saved." });
        load();
      } else {
        setFeedback({ slug: v.slug, type: "error", text: result.error });
      }
    } catch {
      setFeedback({
        slug: v.slug,
        type: "error",
        text: "Could not save. Please try again.",
      });
    } finally {
      setSaving(null);
    }
  };

  const handleSendTest = async (v: TemplateView) => {
    setSendingTest(v.slug);
    setFeedback(null);
    try {
      const result = await adminSendTestEmail({
        slug: v.slug,
        subject: v.subject,
        body: v.body,
        recipient: testRecipient.trim() || "jen.johnpetservices@proton.me",
      });
      if (result.success) {
        setFeedback({ slug: v.slug, type: "success", text: "Test email sent." });
      } else {
        setFeedback({ slug: v.slug, type: "error", text: result.error });
      }
    } catch {
      setFeedback({
        slug: v.slug,
        type: "error",
        text: "Could not send the test email. Please try again.",
      });
    } finally {
      setSendingTest(null);
    }
  };

  return (
    <section className="bg-white rounded-xl shadow-sm border border-brand-tan/20 p-6">
      <h2 className="font-sans text-lg font-semibold tracking-wide uppercase text-brand-brown mb-1">
        Email Templates
      </h2>
      <p className="font-sans text-sm text-brand-brown-light mb-4">
        Edit the emails we send to clients. Leave an email as Default and the
        original text is used. When you save your own wording it is remembered
        and sent going forward.
      </p>

      <div className="mb-5">
        <label className="block font-sans text-xs text-brand-brown-light mb-1">
          Test recipient
        </label>
        <input
          type="email"
          value={testRecipient}
          onChange={(e) => setTestRecipient(e.target.value)}
          placeholder="jen.johnpetservices@proton.me"
          className="w-full max-w-lg border border-brand-tan/30 rounded-lg px-3 py-2 font-sans text-sm text-brand-brown focus:outline-none focus:ring-2 focus:ring-brand-brown/30"
        />
        <p className="font-sans text-xs text-brand-brown-light mt-1">
          Send Test delivers a real copy of each email to this address so you can
          review exactly what a client receives.
        </p>
      </div>

      {loading ? (
        <p className="font-sans text-sm text-brand-brown-light">Loading...</p>
      ) : error ? (
        <p className="font-sans text-sm text-red-600">{error}</p>
      ) : (
        <div className="space-y-6">
          {views.map((v) => (
            <div
              key={v.slug}
              className="border border-brand-tan/20 rounded-lg p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-sans text-sm font-semibold text-brand-brown">
                    {v.label}
                  </p>
                  <p className="font-sans text-xs text-brand-brown-light mt-1">
                    {v.description}
                  </p>
                </div>
                <span
                  className={
                    v.custom
                      ? "inline-block shrink-0 font-sans text-xs font-medium uppercase tracking-wide px-3 py-1 rounded-full bg-green-100 text-green-800"
                      : "inline-block shrink-0 font-sans text-xs font-medium uppercase tracking-wide px-3 py-1 rounded-full bg-brand-tan/30 text-brand-brown"
                  }
                >
                  {v.custom ? "Custom edit" : "Default"}
                </span>
              </div>

              <div>
                <label className="block font-sans text-xs text-brand-brown-light mb-1">
                  Subject line (optional)
                </label>
                <input
                  type="text"
                  value={v.subject}
                  onChange={(e) => update(v.slug, { subject: e.target.value })}
                  placeholder={v.defaultSubject}
                  className="w-full border border-brand-tan/30 rounded-lg px-3 py-2 font-sans text-sm text-brand-brown focus:outline-none focus:ring-2 focus:ring-brand-brown/30"
                />
              </div>

              <div>
                <label className="block font-sans text-xs text-brand-brown-light mb-1">
                  Email body text
                </label>
                <textarea
                  value={v.body}
                  onChange={(e) => update(v.slug, { body: e.target.value })}
                  rows={10}
                  className="w-full border border-brand-tan/30 rounded-lg px-3 py-2 font-sans text-sm text-brand-brown focus:outline-none focus:ring-2 focus:ring-brand-brown/30 resize-y"
                />
              </div>

              {feedback && feedback.slug === v.slug && (
                <p
                  className={
                    feedback.type === "success"
                      ? "font-sans text-sm text-green-700"
                      : "font-sans text-sm text-red-600"
                  }
                >
                  {feedback.text}
                </p>
              )}

              <button
                type="button"
                onClick={() => handleSave(v)}
                disabled={saving === v.slug}
                className="bg-brand-brown text-brand-cream font-sans font-medium tracking-wider uppercase text-sm px-6 py-3 rounded-lg hover:bg-brand-brown-light transition-colors disabled:opacity-50"
              >
                {saving === v.slug ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={() => handleSendTest(v)}
                disabled={sendingTest === v.slug}
                className="border border-brand-brown/40 text-brand-brown font-sans font-medium tracking-wider uppercase text-sm px-5 py-3 rounded-lg hover:bg-brand-tan/20 transition-colors disabled:opacity-50"
              >
                {sendingTest === v.slug ? "Sending..." : "Send Test"}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Main Admin Component ─────────────────────────────────────────────────

function Admin() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [flow, setFlow] = useState<"login" | "request" | "set">("login");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [flowMessage, setFlowMessage] = useState("");
  const [flowError, setFlowError] = useState("");

  // Restore the session from the admin_auth cookie on mount so a successful
  // login sticks across reloads. Also detect a ?resetToken= link and switch
  // to the set a new password form.
  useEffect(() => {
    if (
      typeof document !== "undefined" &&
      document.cookie.indexOf(ADMIN_COOKIE_NAME + "=true") !== -1
    ) {
      setAuthenticated(true);
    }
    if (typeof window !== "undefined") {
      const tok = new URLSearchParams(window.location.search).get("resetToken");
      if (tok) {
        setResetToken(tok);
        setFlow("set");
      }
    }
  }, []);

  const clearResetToken = () => {
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", window.location.pathname);
    }
    setResetToken(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await verifyPassword({ data: { password } });
      if (result.success) {
        setAuthenticated(true);
        document.cookie = `${ADMIN_COOKIE_NAME}=true; path=/; max-age=86400; SameSite=Strict; Secure`;
      } else {
        setError(result.error || "Invalid password");
      }
    } catch {
      setError("Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFlowMessage("");
    setFlowError("");
    try {
      const result = await requestPasswordReset({ data: { email: email.trim() } });
      if (result && result.success === false) {
        setFlowError(result.error || "Could not request a password reset.");
      } else {
        setFlowMessage(
          "If an account exists for that email, a reset link is on its way.",
        );
      }
    } catch {
      setFlowMessage(
        "If an account exists for that email, a reset link is on its way.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setFlowError("");
    setFlowMessage("");
    if (newPassword.length < 8) {
      setFlowError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setFlowError("Passwords do not match.");
      return;
    }
    if (!resetToken) {
      setFlowError("This reset link is invalid or has expired. Request a new one.");
      return;
    }
    setLoading(true);
    try {
      const result = await resetPassword({
        data: { resetToken, newPassword },
      });
      if (result && result.success === false) {
        setFlowError(
          result.error || "This reset link is invalid or has expired. Request a new one.",
        );
      } else {
        clearResetToken();
        setFlow("login");
        setFlowMessage("Password reset. Log in with your new password.");
      }
    } catch {
      setFlowError("Password reset failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!authenticated) {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-brand-cream px-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="font-sans text-2xl font-semibold tracking-wide uppercase text-brand-brown">
              Admin Panel
            </h1>
            <p className="font-script text-xl text-brand-tan mt-2">
              Jen &amp; John&rsquo;s Pet Services
            </p>
          </div>

          {flow === "request" && (
            <form
              onSubmit={handleRequestReset}
              className="bg-white rounded-xl shadow-sm border border-brand-tan/20 p-6 space-y-4"
            >
              <p className="font-sans text-sm text-brand-brown">
                Enter the admin email and we will send a reset link.
              </p>
              <div>
                <label
                  htmlFor="reset-email"
                  className="block font-sans text-sm font-semibold tracking-wide uppercase text-brand-brown mb-1"
                >
                  Admin Email
                </label>
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-brand-tan/30 rounded-lg px-4 py-2 font-sans text-brand-brown focus:outline-none focus:ring-2 focus:ring-brand-brown/30"
                  placeholder="you@example.com"
                  autoFocus
                />
              </div>
              {flowMessage && (
                <p className="font-sans text-sm text-green-700 text-center">
                  {flowMessage}
                </p>
              )}
              {flowError && (
                <p className="font-sans text-sm text-red-600 text-center">
                  {flowError}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-brown text-brand-cream font-sans font-medium tracking-wider uppercase text-sm px-6 py-3 rounded-lg hover:bg-brand-brown-light transition-colors disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFlow("login");
                  setFlowMessage("");
                  setFlowError("");
                }}
                className="w-full font-sans text-sm text-brand-tan hover:text-brand-brown transition-colors underline"
              >
                Back to login
              </button>
            </form>
          )}

          {flow === "set" && (
            <form
              onSubmit={handleReset}
              className="bg-white rounded-xl shadow-sm border border-brand-tan/20 p-6 space-y-4"
            >
              <p className="font-sans text-sm text-brand-brown">
                Set a new admin password.
              </p>
              <div>
                <label
                  htmlFor="new-password"
                  className="block font-sans text-sm font-semibold tracking-wide uppercase text-brand-brown mb-1"
                >
                  New Password
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border border-brand-tan/30 rounded-lg px-4 py-2 font-sans text-brand-brown focus:outline-none focus:ring-2 focus:ring-brand-brown/30"
                  placeholder="At least 8 characters"
                  autoFocus
                />
              </div>
              <div>
                <label
                  htmlFor="confirm-password"
                  className="block font-sans text-sm font-semibold tracking-wide uppercase text-brand-brown mb-1"
                >
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border border-brand-tan/30 rounded-lg px-4 py-2 font-sans text-brand-brown focus:outline-none focus:ring-2 focus:ring-brand-brown/30"
                  placeholder="Re enter your new password"
                />
              </div>
              {flowMessage && (
                <p className="font-sans text-sm text-green-700 text-center">
                  {flowMessage}
                </p>
              )}
              {flowError && (
                <p className="font-sans text-sm text-red-600 text-center">
                  {flowError}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-brown text-brand-cream font-sans font-medium tracking-wider uppercase text-sm px-6 py-3 rounded-lg hover:bg-brand-brown-light transition-colors disabled:opacity-50"
              >
                {loading ? "Saving..." : "Set New Password"}
              </button>
            </form>
          )}

          {flow === "login" && (
            <form
              onSubmit={handleLogin}
              className="bg-white rounded-xl shadow-sm border border-brand-tan/20 p-6 space-y-4"
            >
              <div>
                <label
                  htmlFor="password"
                  className="block font-sans text-sm font-semibold tracking-wide uppercase text-brand-brown mb-1"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-brand-tan/30 rounded-lg px-4 py-2 font-sans text-brand-brown focus:outline-none focus:ring-2 focus:ring-brand-brown/30"
                  placeholder="Enter admin password"
                  autoFocus
                />
              </div>
              {flowMessage && (
                <p className="font-sans text-sm text-green-700 text-center">
                  {flowMessage}
                </p>
              )}
              {error && (
                <p className="font-sans text-sm text-red-600 text-center">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-brown text-brand-cream font-sans font-medium tracking-wider uppercase text-sm px-6 py-3 rounded-lg hover:bg-brand-brown-light transition-colors disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Sign In"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFlow("request");
                  setFlowMessage("");
                  setFlowError("");
                }}
                className="w-full font-sans text-sm text-brand-tan hover:text-brand-brown transition-colors underline"
              >
                Forgot password?
              </button>
            </form>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-brand-cream px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-sans text-2xl font-semibold tracking-wide uppercase text-brand-brown">
              Admin Dashboard
            </h1>
            <p className="font-script text-lg text-brand-tan">
              Jen &amp; John&rsquo;s Pet Services
            </p>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/content"
              className="font-sans text-sm font-medium bg-brand-brown text-brand-cream px-4 py-2 rounded-lg hover:bg-brand-brown-light transition-colors"
            >
              Content Studio
            </a>
            <button
              onClick={() => {
                document.cookie = `${ADMIN_COOKIE_NAME}=; path=/; max-age=0; SameSite=Strict; Secure`;
                setAuthenticated(false);
                setPassword("");
              }}
              className="font-sans text-sm text-brand-tan hover:text-brand-brown transition-colors underline"
            >
              Sign Out
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Calendar Management (full width) */}
          <div className="md:col-span-2">
            <AvailabilitySection />
          </div>

          {/* Requests */}
          <div className="md:col-span-2">
            <RequestsSection />
          </div>

          {/* Meet & Greet Calculator (just underneath booking info) */}
          <div className="md:col-span-2">
            <MeetGreetSection />
          </div>

          {/* Approved Bookings */}
          <div className="md:col-span-2">
            <BookingsSection />
          </div>

          {/* Reviews (full width) */}
          <div className="md:col-span-2">
            <ReviewsSection />
          </div>

          {/* Email Templates (full width) */}
          <div className="md:col-span-2">
            <EmailTemplatesSection />
          </div>

          {/* Admin Settings */}
          <div className="md:col-span-2">
            <ChangePasswordSection />
          </div>
        </div>
      </div>
    </main>
  );
}
