"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useHub } from "@/core/shell/HubContext";
import { Btn, Card, ErrorNote, Field, Spinner, Toggle, useAction } from "@/core/ui";
import { ToolFrame } from "./ToolFrame";

function useNowTick(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/** One task, one timer, nothing else on screen. Optional body-doubling. */
export function FocusMode() {
  return (
    <ToolFrame toolKey="focusMode">
      <Body />
    </ToolFrame>
  );
}

function Body() {
  const { partner } = useHub();
  const current = useQuery(api.tend.focus.current);
  const start = useMutation(api.tend.focus.start);
  const extend = useMutation(api.tend.focus.extend);
  const end = useMutation(api.tend.focus.end);
  const { busy, error, run } = useAction();
  const [task, setTask] = useState("");
  const [minutes, setMinutes] = useState(25);
  const [company, setCompany] = useState(false);
  const now = useNowTick();
  if (!current) return <Spinner />;
  const s = current.mine;

  if (s) {
    const left = Math.max(0, Math.ceil((s.endsAt - now) / 1000));
    const over = left === 0;
    const mm = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
    return (
      <div className="tend-focus">
        <p className="sh-eyebrow">{s.task}</p>
        <p className="tend-timer tend-timer-big" aria-live="polite">{over ? "Time." : mm}</p>
        {s.bodyDoubleWanted && partner && (
          <p className="sh-muted">{s.joinedProfileId ? `${partner.displayName} is body-doubling with you.` : `${partner.displayName} can join from their Tend.`}</p>
        )}
        <ErrorNote error={error} />
        {over ? (
          <>
            <p>Keep going, break, or switch? No pressure either way.</p>
            <div className="sh-choices">
              <Btn big disabled={busy} onClick={() => void run(() => extend({ id: s._id, minutes: 25 }))}>Keep going (25 more)</Btn>
              <Btn big variant="secondary" disabled={busy} onClick={() => void run(() => end({ id: s._id }))}>Break</Btn>
              <Btn big variant="ghost" disabled={busy} onClick={() => void run(() => end({ id: s._id }))}>Switch</Btn>
            </div>
          </>
        ) : (
          <div className="sh-choices">
            <Btn variant="ghost" disabled={busy} onClick={() => void run(() => end({ id: s._id }))}>Stop early</Btn>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card>
      <form
        className="sh-stack-sm"
        onSubmit={(e) => {
          e.preventDefault();
          void run(() => start({ task, minutes, bodyDoubleWanted: company }));
        }}
      >
        <Field label="One task">
          <input className="sh-input" value={task} onChange={(e) => setTask(e.target.value)} maxLength={200} required />
        </Field>
        <Field label="Minutes">
          <input className="sh-input sh-input-sm" type="number" min={1} max={180} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
        </Field>
        {partner && <Toggle checked={company} onChange={setCompany} label={`${partner.displayName} is body-doubling`} hint="Shows them you're focusing and lets them join from their own device." />}
        <ErrorNote error={error} />
        <div>
          <Btn type="submit" big disabled={busy || !task.trim()}>Start</Btn>
        </div>
      </form>
    </Card>
  );
}
