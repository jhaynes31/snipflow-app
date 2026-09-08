"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { DayPicker } from "react-day-picker";
import type { DateRange, DayButtonProps } from "react-day-picker";
import { format } from "date-fns";
import "react-day-picker/style.css";

export interface DateRangeSelection {
  from: string; // "YYYY-MM-DD"
  to: string; // "YYYY-MM-DD"
}

export interface PartialDayInfo {
  date: string; // "YYYY-MM-DD"
  afterTime: string; // e.g. "10:00 AM"
}

interface AvailabilityCalendarProps {
  onDateRangeSelect?: (range: DateRangeSelection | undefined) => void;
  selectedRange?: DateRangeSelection | undefined;
}

export default function AvailabilityCalendar({
  onDateRangeSelect,
  selectedRange: externalRange,
}: AvailabilityCalendarProps) {
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [partialDays, setPartialDays] = useState<PartialDayInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<DateRange | undefined>();
  const cancelledRef = useRef(false);

  // Fetch blocked dates and partial days from the plain /api/availability
  // route. All other dates are available by default. This never falls back to
  // "all dates available": a failed or slow fetch shows an explicit error
  // state instead, so the calendar is only shown as fully available when we
  // actually know it.
  const fetchAvailability = useCallback(async () => {
    cancelledRef.current = false;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/availability", {
        headers: { Accept: "application/json" },
      });
      const result = await res.json();
      if (cancelledRef.current) return;
      if (res.ok && result.success) {
        setBlockedDates(result.dates ?? []);
        setPartialDays(result.partial ?? []);
        setError(false);
      } else {
        console.warn(
          "Availability fetch failed:",
          result.error ?? `HTTP ${res.status}`,
        );
        setError(true);
      }
    } catch (err) {
      if (!cancelledRef.current) {
        console.error("Failed to fetch availability:", err);
        setError(true);
      }
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAvailability();
    return () => {
      cancelledRef.current = true;
    };
  }, [fetchAvailability]);

  // Sync external range changes into internal state
  useEffect(() => {
    if (externalRange) {
      setSelected({
        from: new Date(externalRange.from + "T00:00:00"),
        to: new Date(externalRange.to + "T00:00:00"),
      });
    }
  }, [externalRange?.from, externalRange?.to]);

  // Build Sets for O(1) lookups
  const blockedDateSet = useMemo(() => new Set(blockedDates), [blockedDates]);
  const partialByDate = useMemo(
    () => new Map(partialDays.map((p) => [p.date, p.afterTime])),
    [partialDays],
  );

  // Canonical availability key: blocked dates and partial days are painted in
  // one atomic render. The disabled function and the partial modifier both
  // derive from this single snapshot of the fetched payload, so a calendar
  // can never show a partial day without its blocked days (or vice versa).
  const availabilityKey = useMemo(
    () => JSON.stringify(blockedDates) + "|" + JSON.stringify(partialDays),
    [blockedDates, partialDays],
  );

  // Handle date selection
  const handleSelect = useCallback(
    (range: DateRange | undefined) => {
      setSelected(range);
      if (onDateRangeSelect && range?.from) {
        const fromStr = format(range.from, "yyyy-MM-dd");
        const toStr = range.to ? format(range.to, "yyyy-MM-dd") : fromStr;
        onDateRangeSelect({ from: fromStr, to: toStr });
      } else if (onDateRangeSelect) {
        onDateRangeSelect(undefined);
      }
    },
    [onDateRangeSelect],
  );

  // Build the disabled function. Only ever called after a successful fetch,
  // so it must never blanket-allow all future dates. Partial days are NOT
  // disabled here: they stay clickable (arrival capable after the stated
  // time) but render distinctly in amber with their after time label.
  const disabledDays = useCallback(
    (date: Date) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Disable today and past
      if (date <= today) return true;

      // Disable dates that are explicitly fully blocked
      const dateStr = format(date, "yyyy-MM-dd");
      return blockedDateSet.has(dateStr);
    },
    [blockedDateSet],
  );

  const partialDates = useMemo(
    () => partialDays.map((p) => new Date(p.date + "T00:00:00")),
    // availabilityKey keeps this in lockstep with the blocked-date set used
    // by disabledDays; both flip in the same render as the calendar.
    [availabilityKey],
  );

  // Custom day button so partial days carry a native tooltip with the real
  // after time and a small amber dot mark.
  const PartialDayButton = useCallback(
    (props: DayButtonProps) => {
      const { day, modifiers, children, ...buttonProps } = props;
      const afterTime = partialByDate.get(day.isoDate);
      const isPartial = Boolean(afterTime);
      return (
        <button
          type="button"
          {...buttonProps}
          title={
            isPartial
              ? `We can accommodate arrivals after ${afterTime}`
              : undefined
          }
          data-partial={isPartial || undefined}
        >
          {children}
          {isPartial && (
            <span className="rdp-partial-dot" aria-hidden="true" />
          )}
        </button>
      );
    },
    [partialByDate],
  );

  // ---- Render states ----

  // Loading skeleton
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-brand-tan/20 p-4 sm:p-6">
        <h3 className="font-sans text-sm font-semibold tracking-wide uppercase text-brand-brown mb-4 text-center">
          Check Availability
        </h3>
        <div className="flex justify-center">
          <div className="animate-pulse space-y-3">
            {/* Weekday header skeleton */}
            <div className="flex gap-1">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className="w-9 h-4 bg-brand-tan/15 rounded"
                />
              ))}
            </div>
            {/* Row skeletons */}
            {Array.from({ length: 5 }).map((_, row) => (
              <div key={row} className="flex gap-1">
                {Array.from({ length: 7 }).map((_, col) => (
                  <div
                    key={col}
                    className="w-9 h-9 bg-brand-tan/10 rounded"
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <p className="font-sans text-xs text-brand-tan text-center mt-3">
          Loading availability...
        </p>
      </div>
    );
  }

  // Error state: never present the calendar as fully available. Show a
  // neutral card with a Retry button that re-runs the fetch.
  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-brand-tan/20 p-4 sm:p-6">
        <h3 className="font-sans text-sm font-semibold tracking-wide uppercase text-brand-brown mb-4 text-center">
          Check Availability
        </h3>
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <p className="font-sans text-sm text-brand-tan">
            We couldn't load the availability calendar. Please refresh the page.
          </p>
          <button
            type="button"
            onClick={fetchAvailability}
            className="bg-brand-brown text-brand-cream font-sans font-medium tracking-wider uppercase text-xs px-4 py-2 rounded-lg hover:bg-brand-brown-light transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Success state: the calendar renders only when we know the blocked dates.
  // The key on availabilityKey forces DayPicker to mount its grid fresh for
  // this exact payload, so blocked days (disabled) and partial days (amber)
  // are painted together from one render. No intermediate paint can show a
  // partial day without its blocked dates.
  return (
    <div className="bg-white rounded-xl shadow-sm border border-brand-tan/20 p-4 sm:p-6">
      <h3 className="font-sans text-sm font-semibold tracking-wide uppercase text-brand-brown mb-4 text-center">
        Check Availability
      </h3>
      <div className="flex justify-center">
        <DayPicker
          key={availabilityKey}
          mode="range"
          selected={selected}
          onSelect={handleSelect}
          disabled={disabledDays}
          numberOfMonths={1}
          className="rdp-brand"
          modifiers={{ partial: partialDates }}
          modifiersClassNames={{ partial: "rdp-partial" }}
          components={{ DayButton: PartialDayButton }}
        />
      </div>
      <div className="mt-3 space-y-1.5 text-center">
        <div className="flex items-center justify-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-amber-400" />
          <p className="font-sans text-xs text-brand-tan">
            Partial day: arrivals accepted after the labeled time
          </p>
        </div>
        {partialDays.length > 0 && (
          <ul className="font-sans text-xs text-brand-tan">
            {partialDays.map((p) => (
              <li key={p.date}>
                {format(new Date(p.date + "T00:00:00"), "MMM d")}: we can
                accommodate arrivals after {p.afterTime}
              </li>
            ))}
          </ul>
        )}
        <p className="font-sans text-xs text-brand-tan">
          All dates available unless marked unavailable.
        </p>
      </div>
    </div>
  );
}