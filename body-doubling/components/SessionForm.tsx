"use client";

import { useState } from "react";
import type { Block } from "@/convex/rules";
import { defaultDropInSlots, sessionHours } from "@/convex/rules";
import { BlockStrip, ErrorNote, formatWhen, useRun } from "./ui";

export type SessionInput = {
  title: string;
  startsAt: number;
  blocks: Block[];
  gameTitle?: string;
  capacity: number;
  dropInSlots: number;
};

export const DEFAULT_BLOCKS: Block[] = [
  { kind: "bookend", category: "Opening circle", hours: 0.5 },
  { kind: "work", category: "Business", hours: 1 },
  { kind: "work", category: "Play", hours: 1 },
  { kind: "work", category: "Clean", hours: 1 },
  { kind: "bookend", category: "Closing circle", hours: 0.5 },
];

function toLocalInput(ms: number): string {
  const d = new Date(ms - new Date(ms).getTimezoneOffset() * 60_000);
  return d.toISOString().slice(0, 16);
}

/** Create or edit a session, with a live preview of how it will look on the schedule. */
export function SessionForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: SessionInput;
  submitLabel: string;
  onSubmit: (s: SessionInput) => Promise<unknown>;
}) {
  const [title, setTitle] = useState(initial?.title ?? "Body Doubling Session");
  const [when, setWhen] = useState(initial ? toLocalInput(initial.startsAt) : "");
  const [blocks, setBlocks] = useState<Block[]>(initial?.blocks ?? DEFAULT_BLOCKS);
  const [gameTitle, setGameTitle] = useState(initial?.gameTitle ?? "");
  const [capacity, setCapacity] = useState(initial?.capacity ?? 8);
  const [dropIns, setDropIns] = useState(initial?.dropInSlots ?? defaultDropInSlots(8));
  const [dropInsTouched, setDropInsTouched] = useState(Boolean(initial));
  const { busy, error, run } = useRun();

  const setBlock = (i: number, patch: Partial<Block>) => setBlocks(blocks.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  const startsAt = when ? new Date(when).getTime() : NaN;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void run(() => onSubmit({ title, startsAt, blocks, gameTitle: gameTitle || undefined, capacity, dropInSlots: dropIns }));
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="t">Name</label>
          <input id="t" className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="w">Starts</label>
          <input id="w" className="input" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="c">Total seats</label>
          <select
            id="c"
            className="input"
            value={capacity}
            onChange={(e) => {
              const c = Number(e.target.value);
              setCapacity(c);
              if (!dropInsTouched) setDropIns(defaultDropInSlots(c));
            }}
          >
            {[6, 7, 8, 9, 10, 11, 12].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="d">Saved for drop-ins</label>
          <select
            id="d"
            className="input"
            value={dropIns}
            onChange={(e) => {
              setDropIns(Number(e.target.value));
              setDropInsTouched(true);
            }}
          >
            {[0, 1, 2, 3, 4].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="g">Game (optional)</label>
          <input id="g" className="input" value={gameTitle} placeholder="e.g. Stardew Valley" onChange={(e) => setGameTitle(e.target.value)} />
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="label">Blocks, in order</legend>
        {blocks.map((b, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <select className="input" style={{ width: 130 }} value={b.kind} onChange={(e) => setBlock(i, { kind: e.target.value as Block["kind"] })}>
              <option value="bookend">Bookend</option>
              <option value="work">Work block</option>
            </select>
            <input className="input" style={{ flex: 1, minWidth: 140 }} value={b.category} onChange={(e) => setBlock(i, { category: e.target.value })} required />
            <select className="input" style={{ width: 100 }} value={b.hours} onChange={(e) => setBlock(i, { hours: Number(e.target.value) })}>
              {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map((h) => (
                <option key={h} value={h}>
                  {h} hr
                </option>
              ))}
            </select>
            <button type="button" className="btn btn-quiet btn-small" onClick={() => setBlocks(blocks.filter((_, j) => j !== i))} aria-label="Remove block">
              ✕
            </button>
          </div>
        ))}
        <button type="button" className="btn btn-quiet btn-small" onClick={() => setBlocks([...blocks, { kind: "work", category: "", hours: 1 }])}>
          + Add a block
        </button>
      </fieldset>

      <div className="space-y-2 rounded-2xl p-4" style={{ background: "var(--bg)", border: "1px dashed var(--line)" }}>
        <p className="muted text-xs font-bold uppercase">Preview</p>
        <p className="font-bold">
          {title || "Untitled"} {gameTitle && <span className="pill">🎮 {gameTitle}</span>}
        </p>
        <p className="muted text-sm">
          {Number.isFinite(startsAt) ? formatWhen(startsAt) : "Pick a start time"} · {sessionHours(blocks)} hours · {capacity - dropIns} member + {dropIns} drop-in seats
        </p>
        <BlockStrip blocks={blocks} />
      </div>

      <button className="btn" disabled={busy}>
        {submitLabel}
      </button>
      <ErrorNote error={error} />
    </form>
  );
}
