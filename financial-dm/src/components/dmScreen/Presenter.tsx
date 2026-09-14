import { useCallback, useEffect, useRef, useState } from "react";
import ScriptBody from "./ScriptBody";
import { DM_SCREEN_CONFIG, PRESENTER_CONFIG, clampScale, formatClock, presenterHeartbeatKey, presenterPosKey, presenterSizeKey, presenterThemeKey, scriptSavedKey, totalTargetMinutes, type DmScript, type PresenterDevice } from "~/lib/dmScreen";

/**
 * The presenter view (presentation script spec, Section 5). Loaded once,
 * then no network: the script is in memory, the position, text size, and
 * theme live in this browser, and nothing here ever reloads, pops a dialog,
 * or animates. Monitor and phone layouts are both first class. Everything
 * on screen is John's own script; no lead or recruit data exists here.
 */

type Phase = "pre" | "live" | "exit" | "ended";
type Theme = "dark" | "light";

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode: the view still works, it just forgets */
  }
};
const remove = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
};

interface WakeLockSentinel {
  release: () => Promise<void>;
  addEventListener?: (t: string, fn: () => void) => void;
}

export default function Presenter({ script }: { script: DmScript }) {
  const sections = script.sections;
  const n = sections.length;
  const [phase, setPhase] = useState<Phase>("pre");
  const [index, setIndex] = useState(0);
  const [savedPos, setSavedPos] = useState<number | null>(null);
  const [device, setDevice] = useState<PresenterDevice>("monitor");
  const [scale, setScale] = useState(PRESENTER_CONFIG.defaultScale.monitor);
  const [theme, setTheme] = useState<Theme>("dark");
  const [listOpen, setListOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [editedElsewhere, setEditedElsewhere] = useState(false);
  const [wakeNote, setWakeNote] = useState("");
  // Timer: accumulated ms while paused, and when the current run began.
  const [timer, setTimer] = useState<{ running: boolean; base: number; since: number; sectionMark: number }>({ running: false, base: 0, since: 0, sectionMark: 0 });
  const [now, setNow] = useState(() => Date.now());
  const wake = useRef<WakeLockSentinel | null>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);

  // ── Local state: read once, remember on change ──
  useEffect(() => {
    const isPhone = window.innerWidth < PRESENTER_CONFIG.phoneMaxWidth;
    const dev: PresenterDevice = isPhone ? "phone" : "monitor";
    setDevice(dev);
    setScale(clampScale(Number(read(presenterSizeKey(dev)) ?? PRESENTER_CONFIG.defaultScale[dev])));
    setTheme(read(presenterThemeKey) === "light" ? "light" : "dark");
    try {
      const pos = JSON.parse(read(presenterPosKey(script.id)) ?? "null") as { index?: number } | null;
      if (pos && typeof pos.index === "number" && pos.index > 0 && pos.index < n) setSavedPos(pos.index);
    } catch {
      /* ignore */
    }
    const onResize = () => setDevice(window.innerWidth < PRESENTER_CONFIG.phoneMaxWidth ? "phone" : "monitor");
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [script.id, n]);
  useEffect(() => {
    write(presenterSizeKey(device), String(scale));
  }, [scale, device]);
  useEffect(() => {
    write(presenterThemeKey, theme);
  }, [theme]);
  useEffect(() => {
    if (phase === "live") write(presenterPosKey(script.id), JSON.stringify({ index, version: script.version, at: Date.now() }));
  }, [index, phase, script.id, script.version]);

  // Rule 2.1: the editor pauses autosave while this heartbeat is fresh.
  useEffect(() => {
    if (phase === "ended") return;
    const beat = () => write(presenterHeartbeatKey(script.id), String(Date.now()));
    beat();
    const t = setInterval(beat, DM_SCREEN_CONFIG.presenterHeartbeatMs);
    return () => {
      clearInterval(t);
      remove(presenterHeartbeatKey(script.id));
    };
  }, [script.id, phase]);

  // Section 5.5: an edit elsewhere is noticed silently, never applied.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === scriptSavedKey(script.id) && Number(e.newValue) > script.version) setEditedElsewhere(true);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [script.id, script.version]);

  // No browser back-swipe on the phone, no rubber banding.
  useEffect(() => {
    const el = document.documentElement;
    const prev = { ob: el.style.overscrollBehavior, ta: el.style.touchAction, bg: document.body.style.background };
    el.style.overscrollBehavior = "none";
    el.style.touchAction = "pan-y";
    return () => {
      el.style.overscrollBehavior = prev.ob;
      el.style.touchAction = prev.ta;
      document.body.style.background = prev.bg;
    };
  }, []);

  // Section 5.3: keep the screen awake while live.
  const requestWake = useCallback(async () => {
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<WakeLockSentinel> } };
    if (!nav.wakeLock) {
      setWakeNote("This browser cannot keep the screen awake on its own. Turn off auto-lock for this session.");
      return;
    }
    try {
      wake.current = await nav.wakeLock.request("screen");
      setWakeNote("");
    } catch {
      setWakeNote("Could not keep the screen awake. Turn off auto-lock for this session.");
    }
  }, []);
  useEffect(() => {
    if (phase !== "live") return;
    requestWake();
    const onVis = () => {
      if (document.visibilityState === "visible") requestWake();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      wake.current?.release().catch(() => {});
      wake.current = null;
    };
  }, [phase, requestWake]);

  // Timer tick.
  useEffect(() => {
    if (!timer.running) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [timer.running]);
  const elapsed = timer.base + (timer.running ? now - timer.since : 0);
  const sectionElapsed = Math.max(0, elapsed - timer.sectionMark);

  // ── Navigation ──
  const go = useCallback(
    (to: number) => {
      const target = Math.max(0, Math.min(n - 1, to));
      setIndex((cur) => {
        if (target !== cur) setTimer((t) => ({ ...t, sectionMark: t.base + (t.running ? Date.now() - t.since : 0) }));
        return target;
      });
      setListOpen(false);
      setNotesOpen(false);
    },
    [n],
  );
  const next = useCallback(() => go(index + 1), [go, index]);
  const prev = useCallback(() => go(index - 1), [go, index]);
  const toggleTimer = useCallback(() => {
    setTimer((t) => (t.running ? { ...t, running: false, base: t.base + (Date.now() - t.since) } : { ...t, running: true, since: Date.now() }));
    setNow(Date.now());
  }, []);
  const resetTimer = useCallback(() => setTimer({ running: false, base: 0, since: 0, sectionMark: 0 }), []);
  const bigger = useCallback(() => setScale((s) => clampScale(s + PRESENTER_CONFIG.scaleStep)), []);
  const smaller = useCallback(() => setScale((s) => clampScale(s - PRESENTER_CONFIG.scaleStep)), []);

  const start = useCallback(
    (at: number) => {
      setIndex(Math.max(0, Math.min(n - 1, at)));
      setPhase("live");
      if (device === "phone") document.documentElement.requestFullscreen?.().catch(() => {});
    },
    [n, device],
  );
  const end = useCallback(() => {
    setPhase("ended");
    setTimer((t) => (t.running ? { ...t, running: false, base: t.base + (Date.now() - t.since) } : t));
    remove(presenterPosKey(script.id));
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  }, [script.id]);
  const close = useCallback(() => {
    window.close();
    // A window John opened himself will not close itself; send him back to the editor instead.
    setTimeout(() => {
      if (!window.closed) window.location.assign(`/admin/scripts/${script.id}`);
    }, 150);
  }, [script.id]);

  // Section 5.2: keys, including presentation remotes (Page Up and Page Down).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (phase === "pre") {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (n) start(savedPos ?? 0);
        }
        return;
      }
      if (phase === "exit") {
        if (e.key === "Escape" || e.key === "Enter") {
          e.preventDefault();
          end();
        } else if (e.key === "Backspace") setPhase("live");
        return;
      }
      if (phase !== "live") return;
      switch (e.key) {
        case "ArrowRight":
        case " ":
        case "PageDown":
          e.preventDefault();
          next();
          break;
        case "ArrowLeft":
        case "PageUp":
          e.preventDefault();
          prev();
          break;
        case "l":
        case "L":
          setListOpen((o) => !o);
          break;
        case "t":
        case "T":
          toggleTimer();
          break;
        case "r":
        case "R":
          resetTimer();
          break;
        case "+":
        case "=":
          bigger();
          break;
        case "-":
        case "_":
          smaller();
          break;
        case "n":
        case "N":
          setNotesOpen((o) => !o);
          break;
        case "Escape":
          if (listOpen) setListOpen(false);
          else setPhase("exit");
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, n, savedPos, start, end, next, prev, toggleTimer, resetTimer, bigger, smaller, listOpen]);

  // Swipes on the reading area.
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = touch.current;
    touch.current = null;
    if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (Math.abs(dx) >= PRESENTER_CONFIG.swipeMinPx && Math.abs(dy) < Math.abs(dx)) {
      e.preventDefault();
      if (dx < 0) next();
      else prev();
    }
  };

  // ── Theme ──
  const dark = theme === "dark";
  const bg = dark ? "#0b0f16" : "#fbf8f1";
  const fg = dark ? "#f4f1ea" : "#1c1a15";
  const dim = dark ? "#8c93a3" : "#5c5a52";
  const accent = "#d9a441";
  const notesBg = dark ? "#1b1710" : "#f1e7c9";
  const notesFg = dark ? "#e8c880" : "#5a4410";
  const panel = dark ? "#121826" : "#ffffff";
  const line = dark ? "#26304a" : "#d9d2c0";
  useEffect(() => {
    document.body.style.background = bg;
  }, [bg]);

  const phone = device === "phone";
  const cur = sections[index];
  const following = sections[index + 1];
  const total = totalTargetMinutes(sections);
  const overTarget = cur?.targetMinutes != null && sectionElapsed > cur.targetMinutes * 60_000;
  const btn = `rounded-lg border px-3 py-2 text-sm font-semibold ${dark ? "border-[#3a4560] text-[#dfe4f0] hover:bg-[#1a2234]" : "border-[#c9c2af] text-[#2a2820] hover:bg-[#f1ece0]"} focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9a441]`;
  const primary = "rounded-lg bg-[#d9a441] text-[#1c1a15] px-5 py-3 text-base font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-white";

  const root = { position: "fixed" as const, inset: 0, background: bg, color: fg, fontFamily: "'Work Sans', 'Segoe UI', system-ui, sans-serif", fontSize: `${scale}rem`, lineHeight: 1.5, overflow: "hidden", userSelect: "none" as const, WebkitUserSelect: "none" as const };

  if (!n) {
    return (
      <div style={root} data-presenter data-phase="empty">
        <div className="h-full grid place-items-center p-6 text-center">
          <div>
            <p className="text-2xl font-bold">{script.name}</p>
            <p style={{ color: dim }} className="mt-2">This script has no sections yet. Add some in the editor, then come back.</p>
            <a href={`/admin/scripts/${script.id}`} className={`${btn} inline-block mt-4`}>Open the editor</a>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "pre") {
    return (
      <div style={root} data-presenter data-phase="pre">
        <div className="h-full overflow-y-auto grid place-items-center p-6">
          <div className="max-w-xl w-full text-center space-y-4">
            <p className="text-xs uppercase tracking-widest" style={{ color: accent }}>The DM Screen</p>
            <h1 className="text-3xl font-bold" data-pre-name>{script.name}</h1>
            <p style={{ color: dim }} data-pre-summary>
              {n} section{n === 1 ? "" : "s"}{total ? ` · about ${total} minute${total === 1 ? "" : "s"} if the targets hold` : ""}
            </p>
            <div className="flex flex-col items-center gap-2 pt-2">
              <button type="button" onClick={() => start(savedPos ?? 0)} className={`${primary} w-full max-w-xs`} autoFocus data-start>
                {savedPos != null ? `▶ Resume at section ${savedPos + 1}` : "▶ Start"}
              </button>
              {savedPos != null && (
                <button type="button" onClick={() => start(0)} className={btn} data-start-over>Start from the beginning</button>
              )}
            </div>
            <p className="text-xs" style={{ color: dim }}>
              {device === "phone" ? "Tap the right half or swipe left for the next section. Tap the left half or swipe right to go back." : "Right arrow, Space, or Page Down for the next section. Left arrow or Page Up to go back. L for the section list, T for the timer, + and - for text size, Esc to end."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "ended") {
    return (
      <div style={root} data-presenter data-phase="ended">
        <div className="h-full grid place-items-center p-6 text-center">
          <div className="max-w-md w-full space-y-4">
            <h1 className="text-2xl font-bold">Presentation ended</h1>
            <p style={{ color: dim }}>{script.name} · {formatClock(elapsed)} on the clock</p>
            {editedElsewhere && (
              <div className="rounded-lg p-3 text-sm" style={{ background: notesBg, color: notesFg }} data-edited-elsewhere-note>
                This script was edited while you were presenting. Reload to pick up the newer copy.
                <div className="mt-2"><button type="button" onClick={() => window.location.reload()} className={btn} data-reload-latest>↻ Reload the latest copy</button></div>
              </div>
            )}
            <div className="flex flex-wrap justify-center gap-2">
              <button type="button" onClick={() => { resetTimer(); setSavedPos(null); setIndex(0); setPhase("pre"); }} className={btn} data-again>Open again</button>
              <a href={`/admin/scripts/${script.id}`} className={btn} data-to-editor>Open the editor</a>
              <button type="button" onClick={close} className={primary} data-close-window>Close this window</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={root} data-presenter data-phase={phase} data-device={device} data-theme={theme} data-section-index={index}>
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: line }}>
        <div className="h-full" style={{ width: `${((index + 1) / n) * 100}%`, background: accent }} data-progress={index + 1} />
      </div>

      {/* Top strip: place, timer, small controls */}
      <div className="absolute top-[3px] left-0 right-0 flex items-center justify-between gap-2 px-3 py-1.5 text-[0.75rem]" style={{ color: dim, fontSize: "0.85rem" }}>
        <span className="whitespace-nowrap" data-place>{phone ? `${index + 1}/${n}` : `Section ${index + 1} of ${n}`}{cur.slideRef ? ` · ${cur.slideRef}` : ""}</span>
        <button type="button" onClick={toggleTimer} className="tabular-nums px-2 py-0.5 rounded hover:opacity-80" style={{ color: overTarget ? "#e46b6b" : timer.running ? fg : dim }} aria-label="Start or pause the timer" data-timer data-timer-running={timer.running ? "1" : "0"}>
          ⏱ {formatClock(elapsed)}
          {cur.targetMinutes != null && <span data-section-timer> · {formatClock(sectionElapsed)} / {cur.targetMinutes} min</span>}
        </button>
        {!phone && (
          <span className="flex items-center gap-1">
            <button type="button" onClick={() => setListOpen((o) => !o)} className={btn} aria-label="Section list" data-list-toggle>☰ List</button>
            <button type="button" onClick={smaller} className={btn} aria-label="Smaller text" data-size-down>A−</button>
            <button type="button" onClick={bigger} className={btn} aria-label="Larger text" data-size-up>A+</button>
            <button type="button" onClick={() => setTheme(dark ? "light" : "dark")} className={btn} aria-label="Switch light or dark" data-theme-toggle>{dark ? "☀" : "☾"}</button>
            <button type="button" onClick={resetTimer} className={btn} aria-label="Reset the timer" data-timer-reset>↺</button>
            <button type="button" onClick={() => setPhase("exit")} className={btn} aria-label="End the presentation" data-exit>✕</button>
          </span>
        )}
        {phone && (
          <span className="flex items-center gap-1">
            <button type="button" onClick={smaller} className={btn} aria-label="Smaller text" data-size-down>A−</button>
            <button type="button" onClick={bigger} className={btn} aria-label="Larger text" data-size-up>A+</button>
            <button type="button" onClick={() => setTheme(dark ? "light" : "dark")} className={btn} aria-label="Switch light or dark" data-theme-toggle>{dark ? "☀" : "☾"}</button>
            <button type="button" onClick={() => setPhase("exit")} className={btn} aria-label="End the presentation" data-exit>✕</button>
          </span>
        )}
      </div>

      {/* Reading area: tap left third to go back, the rest to advance; swipe either way */}
      <div
        className={`absolute left-0 right-0 ${phone ? "top-12 bottom-[7.5rem]" : "top-14 bottom-16"} overflow-y-auto`}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("button, a")) return;
          const rect = e.currentTarget.getBoundingClientRect();
          if (e.clientX - rect.left < rect.width * 0.35) prev();
          else next();
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        data-reading-area
      >
        <div className={`${phone ? "px-5 py-3" : "px-10 py-6 grid gap-8"} h-full`} style={!phone ? { gridTemplateColumns: cur.notes ? "minmax(0, 1fr) minmax(16rem, 28%)" : "minmax(0, 1fr)" } : undefined}>
          <div className="min-w-0">
            <h2 className="font-bold leading-tight" style={{ fontSize: phone ? "1.35em" : "1.6em", color: accent }} data-section-title>{cur.title || `Section ${index + 1}`}</h2>
            <div className="mt-3" style={{ fontSize: phone ? "1.25em" : "1.5em", lineHeight: 1.55 }} data-section-body>
              <ScriptBody body={cur.body} />
              {!cur.body.trim() && <p style={{ color: dim }}>(No words written for this section yet.)</p>}
            </div>
            {phone && cur.notes && (
              <div className="mt-4">
                <button type="button" onClick={() => setNotesOpen((o) => !o)} className={btn} data-notes-toggle>{notesOpen ? "Hide notes" : "📝 Notes"}</button>
                {notesOpen && (
                  <div className="mt-2 rounded-lg p-3 italic whitespace-pre-wrap" style={{ background: notesBg, color: notesFg, fontSize: "0.95em" }} data-notes>{cur.notes}</div>
                )}
              </div>
            )}
          </div>
          {!phone && cur.notes && (
            <aside className="rounded-xl p-4 italic whitespace-pre-wrap self-start" style={{ background: notesBg, color: notesFg, fontSize: "0.95em" }} data-notes>
              <p className="not-italic text-xs uppercase tracking-widest mb-1" style={{ opacity: 0.7 }}>Notes, not read aloud</p>
              {cur.notes}
            </aside>
          )}
        </div>
      </div>

      {/* Bottom: next section, and on the phone the thumb controls */}
      <div className="absolute left-0 right-0 bottom-0" style={{ background: panel, borderTop: `1px solid ${line}` }}>
        <div className={`flex items-center justify-between gap-3 ${phone ? "px-4 py-2" : "px-10 py-3"}`} style={{ fontSize: "0.9rem" }}>
          <p className="truncate" style={{ color: dim }} data-next>{following ? <>Next: <span style={{ color: fg }}>{following.title || `Section ${index + 2}`}</span>{following.slideRef ? ` · ${following.slideRef}` : ""}</> : "Last section"}</p>
          {!phone && (
            <span className="flex gap-2 shrink-0">
              <button type="button" onClick={prev} disabled={index === 0} className={`${btn} disabled:opacity-40`} data-prev>◀ Previous</button>
              <button type="button" onClick={next} disabled={index === n - 1} className={`${btn} disabled:opacity-40`} data-next-btn>Next ▶</button>
            </span>
          )}
        </div>
        {phone && (
          <div className="grid grid-cols-[1fr_auto_auto_1fr] gap-2 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]" style={{ fontSize: "1rem" }}>
            <button type="button" onClick={prev} disabled={index === 0} className={`${btn} min-h-[3.5rem] text-base disabled:opacity-40`} data-prev>◀ Back</button>
            <button type="button" onClick={() => setListOpen((o) => !o)} className={`${btn} min-h-[3.5rem]`} aria-label="Section list" data-list-toggle>☰</button>
            <button type="button" onClick={resetTimer} className={`${btn} min-h-[3.5rem]`} aria-label="Reset the timer" data-timer-reset>↺</button>
            <button type="button" onClick={next} disabled={index === n - 1} className={`${btn} min-h-[3.5rem] text-base disabled:opacity-40`} data-next-btn>Next ▶</button>
          </div>
        )}
      </div>

      {/* Quiet notes: wake lock, edited elsewhere */}
      {(wakeNote || editedElsewhere) && (
        <div className="absolute left-3 bottom-[7.5rem] md:bottom-16 text-[0.7rem] pointer-events-none" style={{ color: dim, fontSize: "0.75rem" }}>
          {wakeNote && <span data-wake-note>{wakeNote} </span>}
          {editedElsewhere && <span data-edited-elsewhere title="Edited elsewhere; reload after the presentation">✎ edited elsewhere</span>}
        </div>
      )}

      {/* Section list */}
      {listOpen && (
        <div className="absolute inset-0 overflow-y-auto p-4" style={{ background: bg }} data-list>
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold" style={{ color: accent }}>Jump to a section</p>
              <button type="button" onClick={() => setListOpen(false)} className={btn} data-list-close>Close</button>
            </div>
            <ol className="space-y-1">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <button type="button" onClick={() => go(i)} className="w-full text-left rounded-lg px-3 py-3 border" style={{ borderColor: i === index ? accent : line, background: i === index ? (dark ? "#1a2234" : "#f6eed6") : "transparent", color: fg }} aria-current={i === index ? "true" : undefined} data-list-item={i}>
                    <span className="tabular-nums" style={{ color: dim }}>{i + 1}.</span> {s.title || `Section ${i + 1}`}
                    {s.slideRef && <span style={{ color: dim }}> · {s.slideRef}</span>}
                    {s.targetMinutes != null && <span style={{ color: dim }}> · {s.targetMinutes} min</span>}
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {/* End confirmation: in the page, never a browser dialog */}
      {phase === "exit" && (
        <div className="absolute inset-0 grid place-items-center p-6" style={{ background: dark ? "rgba(11,15,22,0.92)" : "rgba(251,248,241,0.94)" }} data-exit-confirm>
          <div className="max-w-sm w-full text-center space-y-3 rounded-xl p-5" style={{ background: panel, border: `1px solid ${line}` }}>
            <p className="text-lg font-bold">End the presentation?</p>
            <p className="text-sm" style={{ color: dim }}>Your place is kept until you end it.</p>
            <div className="flex justify-center gap-2">
              <button type="button" onClick={() => setPhase("live")} className={btn} autoFocus data-exit-cancel>Keep going</button>
              <button type="button" onClick={end} className={primary} data-exit-end>End</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
