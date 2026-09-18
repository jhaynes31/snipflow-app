import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { studioLink, type StudioHandoff } from "~/lib/studio";
import { startStudioVideo } from "~/server/studio";

/**
 * The one "Record this" button every tool gets (Recording Studio spec,
 * Entry points). It hands the script, hook, topic, and B roll picks to the
 * Studio so John never retypes them. If a video for the same source is
 * already under way it offers to continue instead of starting fresh.
 */
export default function RecordThisButton({
  handoff,
  label = "🎬 Record this",
  className,
  onError,
}: {
  /** Builds the handoff; may save the source first. Return null to abort (the caller has shown why). */
  handoff: () => Promise<StudioHandoff | null> | StudioHandoff | null;
  label?: string;
  className?: string;
  onError?: (message: string) => void;
}) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [choice, setChoice] = useState<{ id: number; handoff: StudioHandoff } | null>(null);

  const start = async (fresh: boolean, h: StudioHandoff) => {
    setBusy(true);
    try {
      const res = await startStudioVideo({ data: { ...h, fresh } });
      if (!res.ok || !res.id) {
        onError?.(res.error || "Could not open the Studio.");
        return;
      }
      if (res.existing && !fresh) {
        setChoice({ id: res.id, handoff: h });
        return;
      }
      setChoice(null);
      navigate(studioLink(res.id));
    } catch {
      onError?.("Could not open the Studio.");
    } finally {
      setBusy(false);
    }
  };

  const click = async () => {
    setBusy(true);
    try {
      const h = await handoff();
      if (!h) return;
      await start(false, h);
    } catch {
      onError?.("Could not open the Studio.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={click}
        disabled={busy}
        className={className ?? "px-4 py-2 rounded-lg bg-[#c08020] hover:bg-[#a06a18] text-[#0d1520] font-bold transition-all text-sm font-fantasy disabled:opacity-50"}
        data-record-this
      >
        {busy ? "Opening the Studio..." : label}
      </button>
      {choice && (
        <span className="flex flex-wrap items-center gap-2 rounded-lg border border-[#c08020]/40 bg-[#c08020]/10 px-3 py-2 text-xs font-fantasy text-[#e8c884]" data-record-choice>
          You already started a video from this.
          <button type="button" onClick={() => navigate(studioLink(choice.id))} className="px-2 py-1 rounded bg-[#c08020] text-[#0d1520] font-bold" data-record-continue>▶ Continue where you left off</button>
          <button type="button" onClick={() => start(true, choice.handoff)} className="px-2 py-1 rounded border border-[#406080]/50 text-[#e0e0e0] hover:border-[#c08020]/60" data-record-fresh>Start fresh</button>
        </span>
      )}
    </span>
  );
}
