import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { STUDIO_CONFIG, STUDIO_SOURCES, STUDIO_STATUSES, fmtLength, studioLink, type StudioStatus, type StudioStep, type VideoProject } from "~/lib/studio";
import { getStudioVideo, updateStudioVideo, type StudioPatch } from "~/server/studio";
import ScriptStep from "./ScriptStep";
import StepBar from "./StepBar";

const card = "rounded-xl border border-[#406080]/30 bg-[#111a28]";
const btnGhost = "px-3 py-1.5 rounded-lg border border-[#406080]/40 text-[#a0a0a0] hover:text-[#e0e0e0] hover:border-[#c08020]/50 font-fantasy text-xs disabled:opacity-50";

type SaveState = "saved" | "dirty" | "saving" | "error" | "conflict";

/** Deep-merge two patches so a burst of edits becomes one save. */
function mergePatch(a: StudioPatch, b: StudioPatch): StudioPatch {
  return { ...a, ...b, script: a.script || b.script ? { ...(a.script ?? {}), ...(b.script ?? {}) } : undefined };
}

/**
 * One video, four steps, autosave throughout (Recording Studio spec,
 * Cohesion rules). Edits queue up and go out together after a short pause;
 * a closed tab loses at most the last second of typing. A stale tab is
 * told so and shown the newer version rather than overwriting it.
 */
export default function StudioShell({ id }: { id: number }) {
  const [video, setVideo] = useState<VideoProject | null | undefined>(undefined);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [error, setError] = useState("");
  const pending = useRef<StudioPatch>({});
  const inFlight = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const versionRef = useRef(1);

  useEffect(() => {
    let alive = true;
    getStudioVideo({ data: { id } })
      .then((v) => {
        if (!alive) return;
        setVideo(v);
        if (v) versionRef.current = v.version;
      })
      .catch((e) => alive && setError(String(e)));
    return () => {
      alive = false;
    };
  }, [id]);

  const flush = useCallback(async () => {
    if (inFlight.current || !Object.keys(pending.current).length) return;
    const patch = pending.current;
    pending.current = {};
    inFlight.current = true;
    setSaveState("saving");
    try {
      const res = await updateStudioVideo({ data: { id, version: versionRef.current, patch } });
      if (res.ok && res.video) {
        versionRef.current = res.video.version;
        const saved = res.video;
        setVideo((v) => (v ? { ...v, version: saved.version, updatedAt: saved.updatedAt } : v));
        setSaveState(Object.keys(pending.current).length ? "dirty" : "saved");
      } else if (res.conflict) {
        pending.current = {};
        if (res.current) {
          versionRef.current = res.current.version;
          setVideo(res.current);
        }
        setSaveState("conflict");
      } else {
        pending.current = mergePatch(patch, pending.current);
        setSaveState("error");
        setError(res.error || "Could not save.");
      }
    } catch {
      pending.current = mergePatch(patch, pending.current);
      setSaveState("error");
    } finally {
      inFlight.current = false;
      if (Object.keys(pending.current).length) timer.current = setTimeout(() => void flush(), saveStateRef.current === "error" ? 3000 : STUDIO_CONFIG.autosaveMs);
    }
  }, [id]);
  const saveStateRef = useRef<SaveState>("saved");
  saveStateRef.current = saveState;

  const queue = useCallback(
    (patch: StudioPatch, now = false) => {
      pending.current = mergePatch(pending.current, patch);
      setVideo((v) => {
        if (!v) return v;
        const next: VideoProject = { ...v, ...(patch.title != null ? { title: patch.title } : {}), ...(patch.noScript != null ? { noScript: patch.noScript } : {}), ...(patch.step ? { step: patch.step } : {}), ...(patch.status ? { status: patch.status } : {}), ...(patch.background ? { background: patch.background } : {}), ...(patch.topic != null ? { topic: patch.topic } : {}) };
        if (patch.script) next.script = { ...v.script, ...patch.script };
        return next;
      });
      setSaveState("dirty");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), now ? 0 : STUDIO_CONFIG.autosaveMs);
    },
    [flush],
  );

  // Leaving the page: send whatever is still queued without waiting for the debounce.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      if (timer.current) clearTimeout(timer.current);
      void flush();
    };
  }, [flush]);

  const go = (step: StudioStep) => queue({ step }, true);

  if (video === undefined) return <p className="text-[#a0a0a0] font-fantasy text-sm py-10 text-center">Opening the Studio...</p>;
  if (video === null)
    return (
      <div className={`${card} p-6 text-center space-y-3`}>
        <p className="text-[#e0e0e0] font-fantasy">That video is not in the library any more.</p>
        <Link {...studioLink()} className={btnGhost}>← Video Library</Link>
      </div>
    );

  const src = STUDIO_SOURCES[video.source];
  const saveLabel = saveState === "saved" ? "✓ Saved" : saveState === "saving" ? "Saving..." : saveState === "dirty" ? "Unsaved changes" : saveState === "conflict" ? "Updated elsewhere, reloaded" : "Could not save, retrying";

  return (
    <div className="space-y-4" data-studio data-studio-id={video.id} data-studio-current={video.step}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Link {...studioLink()} className={btnGhost} data-studio-back>← Library</Link>
          <input
            value={video.title}
            onChange={(e) => queue({ title: e.target.value })}
            onBlur={() => void flush()}
            aria-label="Video title"
            className="min-w-0 flex-1 bg-transparent border-b border-transparent hover:border-[#406080]/50 focus:border-[#c08020] focus:outline-none text-[#e8c884] font-fantasy text-lg px-1"
            data-studio-title
          />
        </div>
        <div className="flex items-center gap-2 text-xs font-fantasy">
          {video.recruiting && <span className="px-2 py-0.5 rounded bg-[#2e7d4f]/25 border border-[#2e7d4f]/50 text-[#9be3b6]" data-studio-recruiting>🛡️ Guild recruiting</span>}
          <span className="px-2 py-0.5 rounded bg-[#204060]/30 text-[#a0a0a0]">{src.icon} {src.label}</span>
          <span className={`px-2 py-0.5 rounded ${saveState === "error" ? "bg-red-900/30 text-red-300" : saveState === "conflict" ? "bg-[#c08020]/20 text-[#e8c884]" : "bg-[#204060]/30 text-[#a0a0a0]"}`} data-studio-save={saveState}>{saveLabel}</span>
        </div>
      </div>

      <StepBar current={video.step} onSelect={go} />
      {error && <p className="text-red-300 text-sm font-fantasy" data-studio-error>{error}</p>}

      <div className={`${card} p-5`}>
        {video.step === "script" && <ScriptStep video={video} onChange={(p) => queue(p)} onNext={() => go("record")} />}
        {video.step === "record" && (
          <ComingNext
            title="Record"
            lines={["Camera and microphone pickers, a 9:16 preview with a grid, and a mic level meter.", "Your background: blur, the tavern, the branded backdrop, your own picture, or a green screen.", "A 3, 2, 1 countdown, the prompter under the camera, and as many takes as you like."]}
            back={() => go("script")}
            next={() => go("edit")}
          />
        )}
        {video.step === "edit" && (
          <ComingNext
            title="Edit"
            lines={["Trim the start and end, cut a flubbed line, and tighten long pauses.", "Captions from your voice, corrected against the script, in brand styles.", "B roll placed on the lines you tagged, full screen or picture in picture."]}
            back={() => go("record")}
            next={() => go("save")}
          />
        )}
        {video.step === "save" && <SaveStep video={video} onStatus={(status) => queue({ status }, true)} back={() => go("edit")} />}
      </div>
    </div>
  );
}

function ComingNext({ title, lines, back, next }: { title: string; lines: string[]; back: () => void; next: () => void }) {
  return (
    <section className="space-y-4" data-studio-placeholder={title.toLowerCase()}>
      <h3 className="font-fantasy text-[#c08020] text-lg">{title}: coming in the next checkpoint</h3>
      <ul className="list-disc pl-5 space-y-1 text-[#a0a0a0] text-sm font-fantasy">
        {lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      <p className="text-[#606080] text-xs font-fantasy">Your script and choices are saved, so nothing here needs redoing when this step opens.</p>
      <div className="flex justify-between">
        <button type="button" onClick={back} className={btnGhost}>← Back</button>
        <button type="button" onClick={next} className={btnGhost}>Skip ahead →</button>
      </div>
    </section>
  );
}

function SaveStep({ video, onStatus, back }: { video: VideoProject; onStatus: (s: StudioStatus) => void; back: () => void }) {
  return (
    <section className="space-y-4" data-studio-save-step>
      <h3 className="font-fantasy text-[#c08020] text-lg">Save</h3>
      <p className="text-[#a0a0a0] text-sm font-fantasy">
        This video lives in the Video Library under <span className="text-[#e0e0e0]">{video.title}</span>
        {video.durationSec ? ` · ${fmtLength(video.durationSec)}` : ""}. Download and share arrive with the export checkpoint; the status is yours to set now.
      </p>
      <div className="flex flex-wrap gap-2" data-studio-status-picker>
        {(Object.keys(STUDIO_STATUSES) as StudioStatus[]).map((s) => {
          const sel = video.status === s;
          return (
            <button key={s} type="button" onClick={() => onStatus(s)} aria-pressed={sel} data-studio-status={s} title={STUDIO_STATUSES[s].blurb} className={`px-3 py-1.5 rounded-lg border text-sm font-fantasy transition-all ${sel ? "border-[#c08020] bg-[#c08020]/15 text-[#e8c884]" : "border-[#406080]/40 text-[#a0a0a0] hover:border-[#c08020]/50 hover:text-[#e0e0e0]"}`}>
              {STUDIO_STATUSES[s].label}
            </button>
          );
        })}
      </div>
      <p className="text-[#606080] text-xs font-fantasy">{STUDIO_STATUSES[video.status].blurb}</p>
      {/* PLACEHOLDER: a future "Send to scheduler" button goes here (spec, Export). Posting and scheduling are out of scope for now. */}
      <div className="flex justify-between">
        <button type="button" onClick={back} className={btnGhost}>← Back</button>
        <Link {...studioLink()} className="px-4 py-2 rounded-lg bg-[#c08020] hover:bg-[#a06a18] text-[#0d1520] font-bold font-fantasy text-sm" data-studio-to-library>Open the Video Library</Link>
      </div>
    </section>
  );
}
