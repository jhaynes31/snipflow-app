import { Link, createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ScriptBody from "~/components/dmScreen/ScriptBody";
import { AUDIENCE_LABEL, BODY_HELP, DM_SCREEN_CONFIG, TAG_HELP, TAG_LABEL, blankSection, presenterHeartbeatKey, sameSections, scanScript, scriptSavedKey, totalTargetMinutes, wordCount, type DmScript, type ScriptSection, type ScriptVersion, type SectionTag } from "~/lib/dmScreen";
import { getScript, listVersions, restoreVersion, saveScript } from "~/server/dmScreen";

/**
 * The DM Screen editor (presentation script spec, Section 4.2). Sections
 * edit in place and can move up or down. Autosave on a short debounce with
 * a visible state; paused while a presenter view is open (Rule 2.1).
 * Version history restores any of the last saves. No AI here (Rule 2.2).
 */
export const Route = createFileRoute("/_admin/admin/scripts_/$id")({
  loader: ({ params }) => getScript({ data: { id: Number(params.id) } }),
  component: EditorPage,
});

const card = "rounded-xl border border-[#406080]/30 bg-[#111a28]";
const focus = "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c08020]";
const input = `w-full px-3 py-2 rounded-lg bg-[#0d1520]/60 border border-[#406080]/40 text-[#e0e0e0] text-sm ${focus}`;
const field = `px-3 py-2 rounded-lg bg-[#0d1520]/60 border border-[#406080]/40 text-[#e0e0e0] text-sm ${focus}`;
const btnPrimary = `px-4 py-2 rounded-lg bg-[#c08020] hover:bg-[#a06a18] text-[#0d1520] font-bold font-fantasy text-sm disabled:opacity-50 ${focus}`;
const btnGhost = `px-3 py-1.5 rounded-lg border border-[#406080]/40 text-[#a0a0a0] hover:text-[#e0e0e0] hover:border-[#c08020]/50 font-fantasy text-xs disabled:opacity-50 ${focus}`;
const fmt = (iso: string) => (iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }) : "");

type SaveState = "saved" | "dirty" | "saving" | "paused" | "conflict" | "error";

/** Tells any presenter view open in this browser that a newer version exists; it shows a quiet mark and never reloads (Section 5.5). */
function announceSave(scriptId: number, version: number) {
  try {
    localStorage.setItem(scriptSavedKey(scriptId), String(version));
  } catch {
    /* ignore */
  }
}

/** A presenter view writes a timestamp every few seconds; a fresh one means John is on stage. */
function presenterOpen(scriptId: number): boolean {
  try {
    const at = Number(localStorage.getItem(presenterHeartbeatKey(scriptId)) ?? 0);
    return Date.now() - at < DM_SCREEN_CONFIG.presenterHeartbeatMs * 3;
  } catch {
    return false;
  }
}

function EditorPage() {
  const initial = Route.useLoaderData();
  if (!initial) {
    return (
      <main className="min-h-dvh py-6 px-4" data-script-editor>
        <p className="text-[#a0a0a0] font-fantasy text-center">That script is gone. <Link to="/admin/scripts" search={{}} className="underline text-[#c08020]">Back to the DM Screen</Link></p>
      </main>
    );
  }
  return <Editor initial={initial} />;
}

function Editor({ initial }: { initial: DmScript }) {
  const [script, setScript] = useState<DmScript>(initial);
  const [name, setName] = useState(initial.name);
  const [sections, setSections] = useState<ScriptSection[]>(initial.sections);
  const [state, setState] = useState<SaveState>("saved");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<Record<string, boolean>>({});
  const [versions, setVersions] = useState<ScriptVersion[] | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const latest = useRef({ name, sections, version: initial.version });
  latest.current = { name, sections, version: script.version };
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dirty = name !== script.name || !sameSections(sections, script.sections);

  const save = useCallback(async (force = false) => {
    const cur = latest.current;
    if (!force && presenterOpen(script.id)) {
      setState("paused");
      return;
    }
    setState("saving");
    setError("");
    try {
      const res = await saveScript({ data: { id: script.id, name: cur.name.trim() || script.name, sections: cur.sections, baseVersion: cur.version } });
      if (res.conflict && res.script) {
        setScript(res.script);
        setState("conflict");
        return;
      }
      if (!res.ok || !res.script) {
        setError(res.error ?? "Could not save.");
        setState("error");
        return;
      }
      setScript(res.script);
      announceSave(script.id, res.script.version);
      // Keep John's typing that landed while the save was in flight.
      setName((n) => (n === cur.name ? res.script!.name : n));
      setState("saved");
      if (historyOpen) listVersions({ data: { id: script.id } }).then(setVersions).catch(() => {});
    } catch (e) {
      setError(String(e));
      setState("error");
    }
  }, [script.id, script.name, historyOpen]);

  // Section 4.2: autosave on a short debounce.
  useEffect(() => {
    if (!dirty || state === "conflict") return;
    setState((s) => (s === "saving" ? s : presenterOpen(script.id) ? "paused" : "dirty"));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save(false), DM_SCREEN_CONFIG.autosaveMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, sections]);

  // Warn before leaving with unsaved words.
  useEffect(() => {
    const onLeave = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  const update = (id: string, patch: Partial<ScriptSection>) => setSections((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const move = (idx: number, dir: -1 | 1) =>
    setSections((list) => {
      const j = idx + dir;
      if (j < 0 || j >= list.length) return list;
      const a = [...list];
      [a[idx], a[j]] = [a[j], a[idx]];
      return a.map((s, i) => ({ ...s, order: i }));
    });
  const addAfter = (idx: number) => setSections((list) => [...list.slice(0, idx + 1), blankSection(idx + 1), ...list.slice(idx + 1)].map((s, i) => ({ ...s, order: i })));
  const remove = (idx: number) => {
    const s = sections[idx];
    if (s.title || s.body || s.notes) {
      if (!confirm(`Remove section ${idx + 1}${s.title ? ` "${s.title}"` : ""}? Earlier versions keep it, so it can be restored from the history.`)) return;
    }
    setSections((list) => list.filter((_, i) => i !== idx).map((x, i) => ({ ...x, order: i })));
  };
  const openHistory = async () => {
    setHistoryOpen((o) => !o);
    if (!versions) setVersions(await listVersions({ data: { id: script.id } }).catch(() => []));
  };
  const restore = async (v: ScriptVersion) => {
    if (!confirm(`Restore version ${v.version} (${v.sectionCount} section${v.sectionCount === 1 ? "" : "s"}, saved ${fmt(v.savedAt)})? The current text is kept in the history too.`)) return;
    if (timer.current) clearTimeout(timer.current);
    const res = await restoreVersion({ data: { id: script.id, versionId: v.id } });
    if (!res.ok || !res.script) {
      setError(res.error ?? "Could not restore.");
      return;
    }
    setScript(res.script);
    announceSave(script.id, res.script.version);
    setName(res.script.name);
    setSections(res.script.sections);
    setState("saved");
    setVersions(await listVersions({ data: { id: script.id } }).catch(() => []));
  };
  const reloadFromServer = () => {
    setName(script.name);
    setSections(script.sections);
    setState("saved");
  };

  const total = totalTargetMinutes(sections);
  // Section 4.3: the shared word lists, run as he types. They warn and never block.
  const flags = useMemo(() => scanScript(sections, script.audience), [sections, script.audience]);
  const stateLabel: Record<SaveState, string> = {
    saved: "✓ Saved",
    dirty: "Unsaved changes",
    saving: "Saving...",
    paused: "Presenter view is open: autosave paused",
    conflict: "Changed elsewhere",
    error: "Could not save",
  };

  return (
    <main className="min-h-dvh py-6 px-4" style={{ background: "linear-gradient(180deg, #0d1520 0%, #111a28 50%, #0d1520 100%)" }} data-script-editor data-save-state={state}>
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-[#a0a0a0] font-fantasy"><Link to="/admin/scripts" search={{}} className="underline hover:text-[#c08020]">The DM Screen</Link> · {AUDIENCE_LABEL[script.audience]} script{script.isDefault ? " · default" : ""} · v{script.version}</p>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} aria-label="Script name" className={`mt-1 w-full bg-transparent border-b border-[#406080]/40 focus:border-[#c08020] text-2xl font-fantasy text-[#c08020] py-1 ${focus}`} data-script-name />
          </div>
          <div className="text-right space-y-1">
            <p className={`text-xs font-fantasy ${state === "saved" ? "text-[#7fd08a]" : state === "error" || state === "conflict" ? "text-red-300" : "text-[#e0c080]"}`} data-save-indicator>{stateLabel[state]}</p>
            <div className="flex flex-wrap gap-2 justify-end">
              {(state === "paused" || state === "dirty" || state === "error") && <button type="button" onClick={() => save(true)} className={btnGhost} data-save-now>💾 Save now</button>}
              {state === "conflict" && <button type="button" onClick={reloadFromServer} className={btnGhost} data-reload-script>↻ Load the newer copy</button>}
              <a href={`/admin/scripts/${script.id}/present`} target="_blank" rel="noopener" className={`${btnGhost} border-[#c08020]/50 text-[#c08020]`} data-present-link>▶ Present</a>
              <button type="button" onClick={openHistory} className={btnGhost} data-history-toggle>🕘 History</button>
              <Link to="/admin/scripts" search={{}} className={btnGhost}>Done</Link>
            </div>
          </div>
        </div>
        {state === "paused" && <p className="text-[11px] text-[#e0c080] font-fantasy" data-paused-note>A presenter view of this script is open, so nothing saves on its own right now (a live presentation never changes under John). Use Save now if you mean it.</p>}
        {state === "conflict" && <p className="text-[11px] text-red-300 font-fantasy" data-conflict-note>This script was saved from somewhere else since this page loaded. Load the newer copy to keep editing; your words here are not saved.</p>}
        {error && <div className="p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-300 text-sm font-fantasy" data-editor-error>{error}</div>}

        {historyOpen && (
          <section className={`${card} p-4`} data-history>
            <h2 className="font-fantasy text-[#c08020] text-sm mb-1">Version history</h2>
            <p className="text-[11px] text-[#a0a0a0] mb-2">The last {DM_SCREEN_CONFIG.versionsKept} saves. Restoring one keeps what is there now as a version too, so nothing is lost either way.</p>
            {!versions ? (
              <p className="text-xs text-[#a0a0a0]">Loading...</p>
            ) : versions.length === 0 ? (
              <p className="text-xs text-[#a0a0a0]">No saves yet.</p>
            ) : (
              <ul className="space-y-1">
                {versions.map((v) => (
                  <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#406080]/30 px-3 py-1.5" data-version={v.version}>
                    <span className="text-xs text-[#e0e0e0]">v{v.version} · {v.name} · {v.sectionCount} section{v.sectionCount === 1 ? "" : "s"} <span className="text-[#808080]">· {fmt(v.savedAt)}{v.version === script.version ? " · current" : ""}</span></span>
                    {v.version !== script.version && <button type="button" onClick={() => restore(v)} className={btnGhost} data-version-restore>Restore</button>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <p className="text-[11px] text-[#a0a0a0] font-fantasy" data-script-summary>{sections.length} section{sections.length === 1 ? "" : "s"}{total ? ` · about ${total} minute${total === 1 ? "" : "s"} if the targets hold` : ""}. {BODY_HELP}</p>
        {flags.length > 0 && (
          <p className="text-[11px] text-[#e0c080] font-fantasy" data-flag-summary>⚠️ {flags.length} thing{flags.length === 1 ? "" : "s"} to check before you present. They are marked under the sections. Warnings only; nothing stops you saving.</p>
        )}
        {script.audience === "recruit" && (
          <p className="text-[11px] text-[#606080] font-fantasy" data-tag-help>Recruit scripts: mark each section a <span className="text-[#7fd08a]">Trust fact</span> (public, safe to state anywhere) or a <span className="text-[#e0c080]">Presentation fact</span> (for the conversation). Just a label, so you can see at a glance what belongs where.</p>
        )}

        <ol className="space-y-3" data-section-list>
          {sections.map((s, idx) => (
            <li key={s.id} className={`${card} p-4 space-y-2`} data-section={s.id} data-section-index={idx}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[#c08020] font-fantasy text-sm w-6">{idx + 1}.</span>
                <input value={s.title} onChange={(e) => update(s.id, { title: e.target.value })} placeholder="Section title, e.g. The problem" maxLength={160} className={`${field} flex-1 min-w-[10rem]`} data-section-title />
                <input value={s.slideRef} onChange={(e) => update(s.id, { slideRef: e.target.value })} placeholder="Slide 4" maxLength={40} className={`${field} w-24`} aria-label="Slide reference" data-section-slide />
                <label className="text-[11px] text-[#a0a0a0] font-fantasy flex items-center gap-1">
                  <input type="number" min={0} max={180} step={0.5} value={s.targetMinutes ?? ""} onChange={(e) => update(s.id, { targetMinutes: e.target.value === "" ? null : Number(e.target.value) })} className={`${field} w-20 py-1`} aria-label="Target minutes" data-section-minutes />
                  min
                </label>
                {script.audience === "recruit" && (
                  <select value={s.tag} onChange={(e) => update(s.id, { tag: e.target.value as SectionTag })} aria-label="Trust marker" title={TAG_HELP[s.tag]} className={`${field} py-1 text-xs ${s.tag === "trust" ? "text-[#7fd08a]" : s.tag === "presentation" ? "text-[#e0c080]" : "text-[#a0a0a0]"}`} data-section-tag>
                    {(["", "trust", "presentation"] as SectionTag[]).map((t) => (
                      <option key={t} value={t} className="bg-gray-900">{TAG_LABEL[t]}</option>
                    ))}
                  </select>
                )}
                <span className="flex-1" />
                <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0} className={btnGhost} aria-label="Move up" data-section-up>↑</button>
                <button type="button" onClick={() => move(idx, 1)} disabled={idx === sections.length - 1} className={btnGhost} aria-label="Move down" data-section-down>↓</button>
                <button type="button" onClick={() => remove(idx)} className="text-[11px] text-[#606080] hover:text-red-300 font-fantasy px-1" aria-label="Remove section" data-section-remove>✕</button>
              </div>
              <div className="grid gap-2 lg:grid-cols-[3fr_2fr]">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-[#e0b45a] font-fantasy">What you say{s.body ? ` · ${wordCount(s.body)} words` : ""}</label>
                    <button type="button" onClick={() => setPreview((p) => ({ ...p, [s.id]: !p[s.id] }))} className="text-[11px] text-[#a0a0a0] hover:text-[#e0e0e0] font-fantasy" data-section-preview-toggle>{preview[s.id] ? "Hide preview" : "👁 Preview"}</button>
                  </div>
                  <textarea value={s.body} onChange={(e) => update(s.id, { body: e.target.value })} rows={6} maxLength={DM_SCREEN_CONFIG.maxBodyChars} placeholder="The words, as you would say them." className={`${input} resize-y font-sans leading-relaxed`} data-section-body />
                  {flags.filter((f) => f.sectionId === s.id).map((f, i) => (
                    <p key={i} className="mt-1 text-[11px] text-[#e0c080] font-fantasy" data-section-flag={f.ruleId}>⚠️ "{f.matched}": {f.rule}</p>
                  ))}
                  {preview[s.id] && (
                    <div className="mt-2 rounded-lg border border-[#c08020]/20 bg-[#0d1520]/60 p-3 text-[#e0e0e0] text-base leading-relaxed" data-section-preview>
                      <ScriptBody body={s.body} />
                      {!s.body.trim() && <p className="text-[#606080] text-xs">Nothing to show yet.</p>}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-[11px] text-[#a0a0a0] font-fantasy">Notes to self (never read aloud)</label>
                  <textarea value={s.notes} onChange={(e) => update(s.id, { notes: e.target.value })} rows={6} maxLength={DM_SCREEN_CONFIG.maxNotesChars} placeholder="Reminders, pauses, what to check before moving on." className={`${input} resize-y border-dashed border-[#e0c080]/40 bg-[#1c1a12]/60 text-[#e0c080] italic`} data-section-notes />
                </div>
              </div>
              <div>
                <button type="button" onClick={() => addAfter(idx)} className="text-[11px] text-[#808080] hover:text-[#c08020] font-fantasy" data-section-add-after>➕ Add a section after this one</button>
              </div>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => addAfter(sections.length - 1)} disabled={sections.length >= DM_SCREEN_CONFIG.maxSections} className={btnPrimary} data-section-add>➕ Add a section</button>
          {sections.length === 0 && <p className="text-xs text-[#a0a0a0] font-fantasy self-center">A script is a list of sections. Add the first one.</p>}
        </div>
      </div>
    </main>
  );
}
