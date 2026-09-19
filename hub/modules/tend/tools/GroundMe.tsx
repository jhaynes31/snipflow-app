"use client";

import { useState } from "react";
import { Btn, Card } from "@/core/ui";
import { ToolFrame } from "./ToolFrame";

const SENSES = [
  ["5 things you can see", 5],
  ["4 things you can touch", 4],
  ["3 things you can hear", 3],
  ["2 things you can smell", 2],
  ["1 thing you can taste", 1],
] as const;

const RESET = ["Dim the lights", "Headphones or earplugs", "Weighted blanket or a heavy hoodie", "A glass of water", "Loosen anything tight", "Somewhere with less going on"];

export function GroundMe() {
  const [mode, setMode] = useState<"pick" | "breathe" | "senses" | "reset">("pick");
  return (
    <ToolFrame toolKey="groundMe">
      {mode === "pick" && (
        <div className="sh-stack">
          <Btn big onClick={() => setMode("breathe")}>Breathe with the circle</Btn>
          <Btn big variant="secondary" onClick={() => setMode("senses")}>5-4-3-2-1 senses</Btn>
          <Btn big variant="secondary" onClick={() => setMode("reset")}>Sensory reset checklist</Btn>
        </div>
      )}
      {mode === "breathe" && <Breathe />}
      {mode === "senses" && <Senses />}
      {mode === "reset" && (
        <Card>
          <p className="sh-muted">Tick what you can. Any one of these counts.</p>
          <ul className="sh-list mt-3">
            {RESET.map((r) => (
              <li key={r}>
                <label className="sh-toggle">
                  <input type="checkbox" />
                  <span>{r}</span>
                </label>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </ToolFrame>
  );
}

function Breathe() {
  const [running, setRunning] = useState(false);
  return (
    <Card className="tend-breathe-card">
      <p className="sh-muted">In for four, hold for four, out for six. Follow the circle. Six rounds is about two minutes.</p>
      <div className={`tend-breathe ${running ? "is-running" : ""}`} aria-hidden>
        <div className="tend-breathe-circle" />
      </div>
      <div className="tend-breathe-words" aria-live="polite">
        {running ? "In… hold… out…" : "Ready when you are."}
      </div>
      <div className="sh-choices">
        <Btn big onClick={() => setRunning((r) => !r)}>{running ? "Pause" : "Start"}</Btn>
      </div>
    </Card>
  );
}

function Senses() {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState<number[]>([]);
  const current = SENSES[step];
  if (!current) {
    return (
      <Card>
        <p>That&apos;s the whole exercise. You&apos;re here, now.</p>
      </Card>
    );
  }
  const [label, count] = current;
  const ticked = done[step] ?? 0;
  return (
    <Card>
      <h2 className="sh-h2">{label}</h2>
      <p className="sh-muted">Tap once for each one you notice. No need to type them.</p>
      <div className="sh-choices">
        {Array.from({ length: count }, (_, i) => (
          <Btn key={i} variant={i < ticked ? "primary" : "secondary"} onClick={() => setDone((d) => { const n = [...d]; n[step] = Math.max(n[step] ?? 0, i + 1); return n; })}>
            {i + 1}
          </Btn>
        ))}
      </div>
      <div className="sh-choices">
        <Btn onClick={() => setStep(step + 1)}>{ticked >= count ? "Next" : "Skip ahead"}</Btn>
      </div>
    </Card>
  );
}
