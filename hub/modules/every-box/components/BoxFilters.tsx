"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { areasIn } from "@/convex/everyBox/areas";
import { isTender } from "@/convex/everyBox/tenders";
import { useEveryBox } from "./context";

/** Who-tends filter: everyone, just me, just my partner, or boxes we share. */
export type WhoFilter = "all" | "me" | "partner" | "both";

export interface BoxFilters {
  who: WhoFilter;
  /** `null` = every category, `"__none"` = boxes with no category, otherwise the name. */
  area: string | null;
}

export const NO_AREA = "__none";
const DEFAULT: BoxFilters = { who: "all", area: null };
const KEY = "everybox.filters";

// Tiny store so the same filter sticks between the home screen and the boxes
// screen, and survives a reload (it's a per-device preference).
let current: BoxFilters = DEFAULT;
const listeners = new Set<() => void>();
function load(): BoxFilters {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as Partial<BoxFilters>;
    const who = (["all", "me", "partner", "both"] as const).includes(parsed.who as WhoFilter) ? (parsed.who as WhoFilter) : "all";
    const area = typeof parsed.area === "string" ? parsed.area : null;
    return { who, area };
  } catch {
    return DEFAULT;
  }
}
let loaded = false;
function get(): BoxFilters {
  if (!loaded) {
    current = load();
    loaded = true;
  }
  return current;
}
function set(next: BoxFilters) {
  current = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  for (const cb of listeners) cb();
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useBoxFilters(): [BoxFilters, (next: Partial<BoxFilters>) => void] {
  const value = useSyncExternalStore(subscribe, get, () => DEFAULT);
  const update = useCallback((next: Partial<BoxFilters>) => set({ ...get(), ...next }), []);
  return [value, update];
}

export function applyBoxFilters<T extends Pick<Doc<"ebCategories">, "tenderId" | "tenderIds" | "area">>(
  items: T[],
  filters: BoxFilters,
  me: Id<"ebPartners">,
  partnerId: Id<"ebPartners"> | null,
): T[] {
  return items.filter((c) => {
    if (filters.who === "me" && !isTender(c, me)) return false;
    if (filters.who === "partner" && !(partnerId && isTender(c, partnerId))) return false;
    if (filters.who === "both" && !(isTender(c, me) && partnerId && isTender(c, partnerId))) return false;
    if (filters.area === NO_AREA && c.area) return false;
    if (filters.area && filters.area !== NO_AREA && c.area !== filters.area) return false;
    return true;
  });
}

interface Props {
  items: Array<Pick<Doc<"ebCategories">, "tenderId" | "tenderIds" | "area">>;
}

/**
 * Two rows of chips: who tends, and category. Only shows options that would
 * change anything (no partner yet → no who-row; no categories → no area-row).
 */
export function BoxFilterBar({ items }: Props) {
  const { partner, other } = useEveryBox();
  const [filters, update] = useBoxFilters();
  const areas = areasIn(items);
  const anyUncategorised = items.some((c) => !c.area);
  const showWho = other !== null;
  const showArea = areas.length > 0;
  if (!showWho && !showArea) return null;

  const whoOptions: Array<{ value: WhoFilter; label: string }> = [
    { value: "all", label: "Everyone" },
    { value: "me", label: "Me" },
    { value: "partner", label: other?.displayName ?? "Partner" },
    { value: "both", label: "Both of us" },
  ];
  // Count matches per who-option so a chip never leads to an empty screen unexpectedly.
  const count = (f: Partial<BoxFilters>) =>
    applyBoxFilters(items, { ...filters, ...f }, partner._id, other?._id ?? null).length;

  return (
    <div className="mb-4 grid gap-2" aria-label="Filters">
      {showWho && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs eb-muted">Tended by</span>
          {whoOptions.map((o) => (
            <button
              key={o.value}
              type="button"
              className="eb-chip"
              style={filters.who === o.value ? { outline: "2px solid var(--eb-accent)", color: "var(--eb-accent)" } : undefined}
              aria-pressed={filters.who === o.value}
              onClick={() => update({ who: o.value })}
              title={`${count({ who: o.value })} matching`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
      {showArea && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs eb-muted">Category</span>
          <button
            type="button"
            className="eb-chip"
            style={filters.area === null ? { outline: "2px solid var(--eb-accent)", color: "var(--eb-accent)" } : undefined}
            aria-pressed={filters.area === null}
            onClick={() => update({ area: null })}
          >
            All
          </button>
          {areas.map((a) => (
            <button
              key={a}
              type="button"
              className="eb-chip"
              style={filters.area === a ? { outline: "2px solid var(--eb-accent)", color: "var(--eb-accent)" } : undefined}
              aria-pressed={filters.area === a}
              onClick={() => update({ area: a })}
              title={`${count({ area: a })} matching`}
            >
              {a}
            </button>
          ))}
          {anyUncategorised && areas.length > 0 && (
            <button
              type="button"
              className="eb-chip"
              style={filters.area === NO_AREA ? { outline: "2px solid var(--eb-accent)", color: "var(--eb-accent)" } : undefined}
              aria-pressed={filters.area === NO_AREA}
              onClick={() => update({ area: NO_AREA })}
            >
              No category
            </button>
          )}
        </div>
      )}
    </div>
  );
}
