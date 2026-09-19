"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ENERGY_LABELS, readTendSettings, statusLineFor, tilesFor, WEATHER, type Weather } from "@/convex/tend/pure";
import { COPY, type HelpKind } from "@/core/copy/strings";
import { useHub } from "@/core/shell/HubContext";
import { Btn, ErrorNote, LinkBtn, useAction } from "@/core/ui";

const NEEDS: HelpKind[] = ["space", "quietPresence", "practicalHelp", "words", "prayer", "dontFixIt"];

type Step = "weather" | "kinds" | "need" | "after";

/**
 * "How are you, really?" Tend's fuller check-in, behind the shell's button.
 * Under a minute, taps not typing, every step skippable. It never sends a
 * heads-up or turns anything on by itself.
 */
export function CheckIn() {
  const router = useRouter();
  const { profile, partner, gentle } = useHub();
  const record = useMutation(api.tend.checkIns.record);
  const setGentle = useMutation(api.gentleMode.set);
  const { busy, error, run } = useAction();
  const settings = readTendSettings(profile.moduleSettings);
  const tiles = tilesFor(settings);

  const [step, setStep] = useState<Step>("weather");
  const [weather, setWeather] = useState<Weather | null>(null);
  const [energy, setEnergy] = useState(3);
  const [kinds, setKinds] = useState<string[]>([]);
  const [need, setNeed] = useState<HelpKind | null>(null);
  const [saved, setSaved] = useState<{ id: string; answer: "steady" | "tender" | "low" } | null>(null);

  async function finish(finalNeed: HelpKind | null, opts: { justLogging?: boolean; turnGentleOff?: boolean } = {}) {
    const w = weather ?? "partlyCloudy";
    const result = await run(() =>
      record({ weather: w, energy, kinds, need: finalNeed ?? undefined, justLogging: opts.justLogging, turnGentleOff: opts.turnGentleOff }),
    );
    if (!result) return;
    setSaved(result);
    if (opts.justLogging) router.push("/");
    else setStep("after");
  }

  if (step === "weather") {
    return (
      <div className="sh-container sh-narrow sh-lowdemand tend-checkin">
        <h1 className="sh-h1">{COPY.checkInButton}</h1>
        <div className="tend-weather" role="group" aria-label="Weather">
          {WEATHER.map((w) => (
            <button
              key={w.key}
              type="button"
              className={`tend-weather-btn ${weather === w.key ? "is-on" : ""}`}
              aria-pressed={weather === w.key}
              onClick={() => setWeather(w.key)}
            >
              <span className="tend-weather-glyph" aria-hidden>
                {w.glyph}
              </span>
              <span>{w.label}</span>
            </button>
          ))}
        </div>
        <label className="tend-energy">
          <span className="sh-label">Energy: {ENERGY_LABELS[energy - 1]}</span>
          <input type="range" min={1} max={5} step={1} value={energy} onChange={(e) => setEnergy(Number(e.target.value))} aria-valuetext={ENERGY_LABELS[energy - 1]} />
          <span className="tend-energy-ends">
            <span>Running on empty</span>
            <span>Revved up</span>
          </span>
        </label>
        <ErrorNote error={error} />
        <div className="sh-stack">
          <Btn big disabled={busy || !weather} onClick={() => setStep("kinds")}>
            Next
          </Btn>
          <Btn big variant="secondary" disabled={busy} onClick={() => void finish(null, { justLogging: true })}>
            Just logging, I&apos;m fine
          </Btn>
          {gentle && (
            <Btn big variant="ghost" disabled={busy} onClick={() => void finish(null, { justLogging: true, turnGentleOff: true })}>
              Feeling steadier. Gentle day off.
            </Btn>
          )}
        </div>
      </div>
    );
  }

  if (step === "kinds") {
    return (
      <div className="sh-container sh-narrow sh-lowdemand tend-checkin">
        <h1 className="sh-h1">What kind of hard?</h1>
        <p className="sh-muted">Pick any that fit, or none.</p>
        <div className="tend-tiles" role="group" aria-label="What kind of hard">
          {tiles.map((t) => {
            const on = kinds.includes(t.key);
            return (
              <button
                key={t.key}
                type="button"
                className={`sh-chip tend-tile ${on ? "is-on" : ""}`}
                aria-pressed={on}
                onClick={() => setKinds(on ? kinds.filter((k) => k !== t.key) : [...kinds, t.key])}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <div className="sh-stack">
          <Btn big onClick={() => setStep("need")}>
            Next
          </Btn>
          <Btn big variant="ghost" onClick={() => setStep("need")}>
            Skip this
          </Btn>
        </div>
      </div>
    );
  }

  if (step === "need") {
    return (
      <div className="sh-container sh-narrow sh-lowdemand tend-checkin">
        <h1 className="sh-h1">What I need</h1>
        <ErrorNote error={error} />
        <div className="sh-stack">
          {NEEDS.filter((n) => n !== "prayer" || settings.faith).map((n) => (
            <Btn key={n} big variant={need === n ? "primary" : "secondary"} disabled={busy} onClick={() => { setNeed(n); void finish(n); }}>
              {COPY.help[n]}
            </Btn>
          ))}
          <Btn big variant="ghost" disabled={busy} onClick={() => void finish(null)}>
            Nothing right now
          </Btn>
        </div>
      </div>
    );
  }

  // After: saved. Offer a heads-up (never automatic) and, on a low day, a gentle day.
  const low = saved?.answer === "low";
  const status = weather ? statusLineFor(weather, energy, kinds, tiles) : "";
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (need) params.set("help", need);
  if (kinds.length) params.set("kinds", kinds.join(","));
  if (saved) params.set("checkIn", saved.id);
  return (
    <div className="sh-container sh-narrow sh-lowdemand tend-checkin">
      <h1 className="sh-h1">{low ? "Thank you for saying so." : "Noted."}</h1>
      <p>{low ? "Would either of these help right now?" : "That's the whole check-in."}</p>
      <ErrorNote error={error} />
      <div className="sh-stack">
        {partner && (
          <LinkBtn href={`/heads-up/new?${params.toString()}`} big variant={low ? "primary" : "secondary"}>
            Send {partner.displayName} a heads-up
          </LinkBtn>
        )}
        {low && !gentle && (
          <Btn
            big
            variant="secondary"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await setGentle({ on: true });
                router.push("/");
              })
            }
          >
            Turn on a gentle day
          </Btn>
        )}
        <LinkBtn href="/" big variant="ghost">
          {low ? "Neither. Just noting it." : "Back home"}
        </LinkBtn>
      </div>
      <p className="sh-muted mt-6">
        <Link href="/help-now" className="sh-link">
          {COPY.needHelpNow}
        </Link>
      </p>
    </div>
  );
}
