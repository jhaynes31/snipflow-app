"use client";

import Link from "next/link";
import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";
import { BlockStrip, formatDay, formatTime, Seats } from "./ui";

export type PublicSession = FunctionReturnType<typeof api.sessions.upcoming>[number];

export function SessionCard({ s }: { s: PublicSession }) {
  const day = formatDay(s.startsAt);
  const end = s.startsAt + s.hours * 3_600_000;
  return (
    <Link href={`/sessions/${s._id}`} className="card flex gap-4 transition hover:shadow-md">
      <div
        className="flex h-20 w-16 shrink-0 flex-col items-center justify-center rounded-2xl"
        style={{ background: "var(--accent-soft)" }}
      >
        <span className="text-xs font-bold uppercase">{day.weekday}</span>
        <span className="text-2xl font-bold leading-none">{day.day}</span>
        <span className="text-xs">{day.month}</span>
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-bold">{s.title}</h3>
          {s.gameTitle && <span className="pill">🎮 {s.gameTitle}</span>}
          {s.full && <span className="pill pill-warn">Full · waitlist open</span>}
        </div>
        <p className="muted text-sm">
          {formatTime(s.startsAt)} – {formatTime(end)} · {s.hours} hours
        </p>
        <BlockStrip blocks={s.blocks} />
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          <Seats left={s.memberSeatsLeft} total={s.memberSeats} label="member" />
          <Seats left={s.dropInSeatsLeft} total={s.dropInSeats} label="drop-in" />
        </div>
      </div>
    </Link>
  );
}
