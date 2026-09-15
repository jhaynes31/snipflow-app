import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CUE_LABEL, DEFAULT_PROMPTER_SETTINGS, PROMPTER_CONFIG, PROMPTER_SETTINGS_KEY, beatMillis, emphasisRuns, formatSeconds, hashText, normalizeSettings, scriptSourceText, sectionShares, type Beat, type BeatSet, type PrompterSettings, type ScriptParts } from "~/lib/prompterBeats";
import { buildBeats } from "~/server/prompter";

/**
 * Step 4: Perform. A full-viewport prompter that shows one short beat at a
 * time near the top of the screen, closest to the phone's lens, and moves
 * at John's pace. This checkpoint: beats, the three-line window, timer
 * mode, keyboard control, mirror, and remembered settings. Voice-tracked
 * advance arrives next and degrades to exactly this.
 */

type Phase = "setup" | "countdown" | "running" | "paused" | "done";

const BG = "#0B0B0D";
const FG = "#F5F5F0";
const ACCENT = "#E0B45C";
const MUTED = "#6E6E76";

const readSettings = (): PrompterSettings => {
  try {
    return normalizeSettings(JSON.parse(localStorage.getItem(PROMPTER_SETTINGS_KEY) ?? "null"));
  } catch {
    return DEFAULT_PROMPTER_SETTINGS;
  }
};
const writeSettings = (s: PrompterSettings) => {
  try {
    localStorage.setItem(PROMPTER_SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
};

export default function Prompter({ parts: initialParts, scriptId, title, onClose }: { parts: ScriptParts | null; scriptId?: number; title?: string; onClose: () => void }) {
  const [pasted, setPasted] = useState("");
  const parts: ScriptParts | null = initialParts ?? (pasted.trim() ? { hook: "", body: pasted, cta: "" } : null);
  const [set, setSet] = useState<BeatSet | null>(null);
  const [currentHash, setCurrentHash] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState<PrompterSettings>(DEFAULT_PROMPTER_SETTINGS);
  const [phase, setPhase] = useState<Phase>("setup");
  const [index, setIndex] = useState(0);
  const [count, setCount] = useState<number>(PROMPTER_CONFIG.countdownSeconds);
  const [startedAt, setStartedAt] = useState(0);
  const [pausedFor, setPausedFor] = useState(0);
  const [pausedAt, setPausedAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [chrome, setChrome] = useState(true);
  const [wraps, setWraps] = useState(0);
  const beatRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const beats = set?.beats ?? [];
  const beat: Beat | undefined = beats[index];
  const running = phase === "running";
  const stale = Boolean(set && currentHash && set.sourceHash !== currentHash);

  // Settings are remembered per browser (Section 8).
  useEffect(() => setSettings(readSettings()), []);
  const update = useCallback((patch: Partial<PrompterSettings>) => {
    setSettings((s) => {
      const next = normalizeSettings({ ...s, ...patch });
      writeSettings(next);
      return next;
    });
  }, []);

  // The overlay owns the page while open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    rootRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Beats: fetch for the script we were opened with, or on demand for pasted text.
  const fetchBeats = useCallback(
    async (force = false) => {
      if (!parts) return;
      setLoading(true);
      setError("");
      try {
        const res = await buildBeats({ data: { ...parts, scriptId, force } });
        if (!res.ok || !res.beats) setError(res.error ?? "Could not prepare the beats.");
        else {
          setSet(res.beats);
          setIndex(0);
        }
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    },
    [parts?.hook, parts?.body, parts?.cta, scriptId], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    if (initialParts) fetchBeats(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialParts?.hook, initialParts?.body, initialParts?.cta, scriptId]);
  useEffect(() => {
    if (!parts) {
      setCurrentHash("");
      return;
    }
    let live = true;
    hashText(scriptSourceText(parts)).then((h) => live && setCurrentHash(h)).catch(() => {});
    return () => {
      live = false;
    };
  }, [parts?.hook, parts?.body, parts?.cta]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Take control ──
  const start = useCallback(() => {
    if (!beats.length) return;
    setIndex(0);
    setCount(PROMPTER_CONFIG.countdownSeconds);
    setPausedFor(0);
    setPhase("countdown");
  }, [beats.length]);
  useEffect(() => {
    if (phase !== "countdown") return;
    if (count <= 0) {
      setStartedAt(Date.now());
      setNow(Date.now());
      setPhase("running");
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, count]);
  const next = useCallback(() => setIndex((i) => (i < beats.length - 1 ? i + 1 : (setPhase("done"), i))), [beats.length]);
  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const togglePause = useCallback(() => {
    if (phase === "running") {
      setPausedAt(Date.now());
      setPhase("paused");
    } else if (phase === "paused") {
      setPausedFor((p) => p + (Date.now() - pausedAt));
      setPhase("running");
    } else if (phase === "setup" || phase === "done") start();
  }, [phase, pausedAt, start]);

  // Timer mode: each beat stays up for its words at the current wpm (Section 6).
  useEffect(() => {
    if (!running || !beat) return;
    const t = setTimeout(next, beatMillis(beat, settings.wpm));
    return () => clearTimeout(t);
  }, [running, index, beat, settings.wpm, next]);

  // Clock.
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [running]);
  const elapsedMs = startedAt ? (phase === "paused" ? pausedAt : phase === "done" ? now : now) - startedAt - pausedFor : 0;
  const remaining = set ? Math.max(0, set.estimatedSeconds - elapsedMs / 1000) : 0;

  // The bottom strip hides after a quiet moment during a take (Section 5).
  const poke = useCallback(() => {
    setChrome(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setChrome(false), PROMPTER_CONFIG.chromeHideMs);
  }, []);
  useEffect(() => {
    if (!running) {
      setChrome(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      return;
    }
    poke();
    window.addEventListener("mousemove", poke);
    return () => {
      window.removeEventListener("mousemove", poke);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [running, poke]);

  // Keys (Section 7). Nothing here scrolls the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT" || tag === "SELECT") {
        if (e.key === "Escape") onClose();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (running) poke();
      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePause();
          break;
        case "ArrowRight":
          e.preventDefault();
          if (phase === "running" || phase === "paused" || phase === "done") next();
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (phase === "running" || phase === "paused" || phase === "done") {
            prev();
            if (phase === "done") setPhase("paused");
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          update({ fontSize: settings.fontSize + 4 });
          break;
        case "ArrowDown":
          e.preventDefault();
          update({ fontSize: settings.fontSize - 4 });
          break;
        case "r":
        case "R":
          if (beats.length) start();
          break;
        case "m":
        case "M":
          update({ mirror: !settings.mirror });
          break;
        case "+":
        case "=":
          update({ wpm: settings.wpm + PROMPTER_CONFIG.wpmStep });
          break;
        case "-":
        case "_":
          update({ wpm: settings.wpm - PROMPTER_CONFIG.wpmStep });
          break;
        case "Escape":
          onClose();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, running, settings, beats.length, next, prev, start, togglePause, update, onClose, poke]);

  // Section 9: a beat that wraps past two lines is a chunking failure worth logging.
  useEffect(() => {
    const el = beatRef.current;
    if (!el || !beat || !running) return;
    const lines = el.offsetHeight / (settings.fontSize * 1.2);
    if (lines > 2.2) {
      setWraps((w) => w + 1);
      console.info(`[prompter] beat ${beat.id} wraps to ${Math.round(lines)} lines at ${settings.fontSize}px: "${beat.text}"`);
    }
  }, [beat, running, settings.fontSize]);

  const shares = useMemo(() => sectionShares(beats), [beats]);
  const prevBeat = beats[index - 1];
  const nextBeat = beats[index + 1];
  const pill = "rounded-md border border-[#2a2a30] bg-[#141418] px-3 py-1.5 text-sm text-[#d8d8d2] hover:border-[#E0B45C]/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E0B45C]";
  const primary = "rounded-md bg-[#E0B45C] px-5 py-2.5 text-base font-semibold text-[#0B0B0D] hover:bg-[#f0c46c] focus:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-40";

  const renderBeat = (b: Beat, role: "prev" | "current" | "next") => {
    const size = role === "current" ? settings.fontSize : role === "prev" ? settings.fontSize * 0.4 : settings.fontSize * 0.5;
    const opacity = role === "current" ? 1 : role === "prev" ? 0.25 : 0.35;
    return (
      <div key={`${role}-${b.id}`} ref={role === "current" ? beatRef : undefined} className="prompter-beat mx-auto" style={{ fontSize: size, opacity, maxWidth: "85vw", lineHeight: 1.2, fontWeight: 600, textAlign: "center", textWrap: "balance" }} data-beat-role={role} data-beat-id={b.id}>
        {emphasisRuns(b.text, b.emphasis).map((r, i) => (
          <span key={i} style={r.hit ? { color: ACCENT } : undefined} data-emphasis={r.hit ? "1" : undefined}>{r.text}</span>
        ))}
      </div>
    );
  };

  return (
    <div ref={rootRef} tabIndex={-1} className="fixed inset-0 z-[100] outline-none select-none" style={{ background: BG, color: FG, fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }} data-prompter data-phase={phase} data-beat-index={index} data-mirror={settings.mirror ? "1" : "0"} data-anchor={settings.anchor}>
      <style>{`
        .prompter-beat { transition: opacity ${PROMPTER_CONFIG.transitionMs}ms ease, transform ${PROMPTER_CONFIG.transitionMs}ms ease; animation: prompter-in ${PROMPTER_CONFIG.transitionMs}ms ease; }
        @keyframes prompter-in { from { opacity: 0; transform: translateY(6px); } }
        @media (prefers-reduced-motion: reduce) { .prompter-beat { transition: none; animation: none; } }
      `}</style>

      {phase === "setup" && (
        <div className="absolute inset-0 overflow-y-auto p-6" data-prompter-setup>
          <div className="max-w-2xl mx-auto space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em]" style={{ color: ACCENT }}>Step 4 · Perform</p>
                <h2 className="text-2xl font-semibold mt-1">{title || (initialParts ? "Prompter" : "Prompter: your own text")}</h2>
              </div>
              <button type="button" onClick={onClose} className={pill} data-prompter-close>Esc · Back to the script</button>
            </div>

            {!initialParts && (
              <div className="space-y-2">
                <label htmlFor="prompter-paste" className="block text-sm" style={{ color: MUTED }}>Paste anything you want to read. It is split into short beats the same way.</label>
                <textarea id="prompter-paste" value={pasted} onChange={(e) => setPasted(e.target.value)} rows={8} className="w-full rounded-md border border-[#2a2a30] bg-[#141418] p-3 text-base text-[#F5F5F0] focus:outline-none focus:border-[#E0B45C]" placeholder="Paste your text here" data-prompter-paste />
                <button type="button" onClick={() => fetchBeats(true)} disabled={!pasted.trim() || loading} className={primary} data-prompter-build>{loading ? "Splitting..." : "Split into beats"}</button>
              </div>
            )}

            {error && <p className="rounded-md border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-200" data-prompter-error>{error}</p>}
            {loading && initialParts && <p className="text-sm" style={{ color: MUTED }} data-prompter-loading>Splitting the script into beats...</p>}

            {set && (
              <div className="rounded-lg border border-[#2a2a30] bg-[#111114] p-4 space-y-3" data-prompter-ready>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-lg">{beats.length} beat{beats.length === 1 ? "" : "s"} · about <span data-prompter-estimate>{formatSeconds(set.estimatedSeconds)}</span> at {PROMPTER_CONFIG.wpm} wpm</p>
                  <p className="text-xs" style={{ color: MUTED }} data-prompter-source>{set.source === "ai" ? "Phrased by the beats pass" : "Split locally"}{set.beats.filter((b) => b.cue).length ? ` · ${set.beats.filter((b) => b.cue).length} cue${set.beats.filter((b) => b.cue).length === 1 ? "" : "s"}` : ""}</p>
                </div>
                {stale && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[#E0B45C]/40 bg-[#E0B45C]/10 px-3 py-2 text-sm" data-prompter-stale>
                    <span>The script changed since these beats were made.</span>
                    <button type="button" onClick={() => fetchBeats(true)} disabled={loading} className={pill} data-prompter-regenerate>{loading ? "Working..." : "Regenerate beats"}</button>
                  </div>
                )}
                <div className="max-h-48 overflow-y-auto rounded-md border border-[#2a2a30] p-2 text-sm leading-relaxed" style={{ color: "#c9c9c2" }} data-prompter-preview>
                  {beats.map((b) => (
                    <p key={b.id} className="py-0.5"><span className="mr-2 tabular-nums" style={{ color: MUTED }}>{b.id}.</span>{emphasisRuns(b.text, b.emphasis).map((r, i) => <span key={i} style={r.hit ? { color: ACCENT } : undefined}>{r.text}</span>)}{b.cue && <span className="ml-2 text-xs" style={{ color: MUTED }}>· {CUE_LABEL[b.cue]}</span>}</p>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button type="button" onClick={start} className={primary} data-prompter-start>▶ Start (Space)</button>
                  {initialParts && <button type="button" onClick={() => fetchBeats(true)} disabled={loading} className={pill} data-prompter-rebuild>Redo the beats</button>}
                </div>
              </div>
            )}

            <div className="rounded-lg border border-[#2a2a30] bg-[#111114] p-4 space-y-3 text-sm" data-prompter-settings>
              <p className="text-xs uppercase tracking-[0.2em]" style={{ color: MUTED }}>Settings</p>
              <label className="flex items-center gap-3">
                <span className="w-28">Text size</span>
                <input type="range" min={PROMPTER_CONFIG.fontMin} max={PROMPTER_CONFIG.fontMax} step={2} value={settings.fontSize} onChange={(e) => update({ fontSize: Number(e.target.value) })} className="flex-1 accent-[#E0B45C]" aria-label="Text size" data-prompter-font />
                <span className="w-14 text-right tabular-nums">{settings.fontSize}px</span>
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <span className="w-28">Text sits</span>
                {(["top", "center"] as const).map((a) => (
                  <button key={a} type="button" onClick={() => update({ anchor: a })} aria-pressed={settings.anchor === a} className={`${pill} ${settings.anchor === a ? "border-[#E0B45C] text-[#E0B45C]" : ""}`} data-prompter-anchor={a}>{a === "top" ? "At the top, nearest the lens" : "In the centre"}</button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="w-28">Timer pace</span>
                <button type="button" onClick={() => update({ wpm: settings.wpm - PROMPTER_CONFIG.wpmStep })} className={pill} aria-label="Slower">−</button>
                <span className="tabular-nums" data-prompter-wpm>{settings.wpm} wpm</span>
                <button type="button" onClick={() => update({ wpm: settings.wpm + PROMPTER_CONFIG.wpmStep })} className={pill} aria-label="Faster">+</button>
                <span style={{ color: MUTED }}>Each beat stays up for its words at this pace. Voice tracking, which follows your own pace, is the next update.</span>
              </div>
              <label className="flex items-center gap-3">
                <span className="w-28">Mirror</span>
                <input type="checkbox" checked={settings.mirror} onChange={(e) => update({ mirror: e.target.checked })} className="accent-[#E0B45C]" data-prompter-mirror />
                <span style={{ color: MUTED }}>Flips the words for a beam-splitter rig. M during a take.</span>
              </label>
              <p style={{ color: MUTED }}>Keys during a take: Space pause · ← → move · ↑ ↓ size · + − pace · R restart · M mirror · Esc exit.</p>
            </div>
          </div>
        </div>
      )}

      {phase === "countdown" && (
        <div className="absolute inset-0 grid place-items-center" data-prompter-countdown>
          <div className="text-center">
            <p className="font-semibold tabular-nums" style={{ fontSize: Math.max(96, settings.fontSize * 2.2), lineHeight: 1 }} data-prompter-count>{count}</p>
            <p className="mt-3 text-sm" style={{ color: MUTED }}>Settle your face. Hit record.</p>
          </div>
        </div>
      )}

      {(phase === "running" || phase === "paused" || phase === "done") && beat && (
        <>
          {/* The three-line window. Top by default: the closest point to the lens (Section 5). */}
          <div className={`absolute left-0 right-0 ${settings.anchor === "top" ? "top-[2vh]" : "top-1/2 -translate-y-1/2"} px-4`} style={{ transform: `${settings.anchor === "center" ? "translateY(-50%) " : ""}${settings.mirror ? "scaleX(-1)" : ""}`.trim() || undefined }} data-prompter-window>
            <div style={{ minHeight: settings.fontSize * 0.4 * 1.2 }}>{prevBeat ? renderBeat(prevBeat, "prev") : null}</div>
            <div className="mt-[0.35em]" style={{ fontSize: settings.fontSize }}>{renderBeat(beat, "current")}</div>
            {beat.cue && (
              <p className="mt-2 text-center" style={{ color: MUTED, fontSize: Math.max(12, settings.fontSize * 0.3) }} data-prompter-cue={beat.cue}>{CUE_LABEL[beat.cue]}</p>
            )}
            <div className="mt-[0.5em]" style={{ minHeight: settings.fontSize * 0.5 * 1.2 }}>{nextBeat ? renderBeat(nextBeat, "next") : null}</div>
          </div>

          {phase === "paused" && (
            <p className="absolute left-1/2 -translate-x-1/2 bottom-16 text-sm tracking-[0.2em] uppercase" style={{ color: MUTED }} data-prompter-paused>Paused · Space to resume</p>
          )}

          {/* Bottom strip: everything that is not script, away from the lens (Section 5). */}
          <div className="absolute left-0 right-0 bottom-0 px-4 pb-3 pt-2 transition-opacity" style={{ opacity: chrome || phase !== "running" ? 1 : 0, background: "linear-gradient(180deg, transparent, rgba(11,11,13,0.9) 40%)" }} data-prompter-chrome data-visible={chrome || phase !== "running" ? "1" : "0"}>
            <div className="flex h-1 gap-1 rounded overflow-hidden" data-prompter-progress>
              {shares.map((s) => {
                const startIdx = beats.findIndex((b) => b.section === s.section);
                const done = Math.min(s.count, Math.max(0, index + (phase === "done" ? 1 : 0) - startIdx));
                return (
                  <div key={s.section} className="relative bg-[#26262c]" style={{ flex: s.count }} data-progress-section={s.section}>
                    <div className="absolute inset-y-0 left-0" style={{ width: `${(done / s.count) * 100}%`, background: ACCENT }} />
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs tabular-nums" style={{ color: MUTED }}>
              <span data-prompter-place>{phase === "done" ? "Done" : `${index + 1} / ${beats.length}`}{wraps ? ` · ${wraps} long` : ""}</span>
              <span data-prompter-clock>{formatSeconds(elapsedMs / 1000)} · about {formatSeconds(remaining)} left</span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: "#55555c" }} data-prompter-mic="timer" title="Timer mode" />
                timer {settings.wpm} wpm
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
