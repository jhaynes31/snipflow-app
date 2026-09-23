"use client";

import { useEffect, useState } from "react";
import { heartwoodDbName, type HeartwoodPerson } from "./settings";

/**
 * Reads Heartwood's own on-device data (IndexedDB, same address) for the
 * Today line. Read-only, and only the person's own database. Heartwood's
 * `sessions` store is indexed by `status` (hub/heartwood/src/db/db.ts).
 */
export interface HeartwoodToday {
  /** The next planned session, or the one in progress. */
  next: { templateId: string; scheduledDate: string; inProgress: boolean; fiveMinute: boolean } | null;
  /** Sessions finished so far. */
  done: number;
  /** True when this person has opened Heartwood on this device at least once. */
  started: boolean;
}

function openDb(name: string): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(null);
    let req: IDBOpenDBRequest;
    try {
      // No version: never upgrade or create; a missing database opens empty and is closed and deleted below.
      req = indexedDB.open(name);
    } catch {
      return resolve(null);
    }
    let created = false;
    req.onupgradeneeded = () => {
      created = true;
    };
    req.onsuccess = () => {
      const db = req.result;
      if (created || !db.objectStoreNames.contains("sessions")) {
        db.close();
        if (created) indexedDB.deleteDatabase(name);
        return resolve(null);
      }
      resolve(db);
    };
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
  });
}

function readAll<T>(db: IDBDatabase, store: string): Promise<T[]> {
  return new Promise((resolve) => {
    try {
      const req = db.transaction(store, "readonly").objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result as T[]);
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

interface StoredSession {
  templateId: string;
  sequenceIndex: number;
  scheduledDate: string;
  status: "planned" | "in-progress" | "completed" | "skipped" | "partial";
  fiveMinute?: boolean;
}

export async function readHeartwoodToday(who: HeartwoodPerson): Promise<HeartwoodToday> {
  const db = await openDb(heartwoodDbName(who));
  if (!db) return { next: null, done: 0, started: false };
  try {
    const sessions = await readAll<StoredSession>(db, "sessions");
    const inProgress = sessions.find((s) => s.status === "in-progress");
    const planned = sessions.filter((s) => s.status === "planned").sort((a, b) => a.sequenceIndex - b.sequenceIndex)[0];
    const pick = inProgress ?? planned;
    return {
      next: pick
        ? { templateId: pick.templateId, scheduledDate: pick.scheduledDate, inProgress: Boolean(inProgress), fiveMinute: pick.fiveMinute === true }
        : null,
      done: sessions.filter((s) => s.status === "completed" || s.status === "partial").length,
      started: true,
    };
  } finally {
    db.close();
  }
}

/** Heartwood's session names, kept in step with hub/heartwood/src/data/templates.ts. */
export function sessionName(templateId: string): string {
  const names: Record<string, string> = {
    strengthA: "Strength A",
    strengthB: "Strength B",
    ptAnkles: "PT: Ankles & Balance",
    ptKneesHips: "PT: Knees & Hips",
    ptMobility: "Mobility Therapist",
    somatic: "Somatic Movement",
    fascia: "Fascia Release",
    pelvicFloor: "Pelvic Floor",
    freestyle: "Freestyle",
  };
  return names[templateId] ?? templateId.replace(/-/g, " ");
}

export function useHeartwoodToday(who: HeartwoodPerson | null): HeartwoodToday | null {
  const [state, setState] = useState<{ who: HeartwoodPerson | null; value: HeartwoodToday | null }>({ who: null, value: null });
  useEffect(() => {
    if (!who) return;
    let live = true;
    readHeartwoodToday(who).then((value) => {
      if (live) setState({ who, value });
    });
    return () => {
      live = false;
    };
  }, [who]);
  return state.who === who ? state.value : null;
}
