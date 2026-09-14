import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AUDIENCE_LABEL, type ScriptAudience } from "~/lib/dmScreen";
import { archiveScript, createScript, duplicateScript, listScripts, renameScript, setDefaultScript, type ScriptListItem } from "~/server/dmScreen";

/**
 * The DM Screen, script list (presentation script spec, Section 4.1).
 * Scripts grouped by audience with new, duplicate, rename, set as default,
 * and archive. No delete: an archived script can always come back.
 */
export const Route = createFileRoute("/_admin/admin/scripts")({
  validateSearch: (s: Record<string, unknown>): { archived?: 1 } => ({ archived: Number(s.archived) === 1 ? 1 : undefined }),
  component: ScriptsPage,
});

const card = "rounded-xl border border-[#406080]/30 bg-[#111a28]";
const focus = "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c08020]";
const input = `px-3 py-2 rounded-lg bg-[#0d1520]/60 border border-[#406080]/40 text-[#e0e0e0] text-sm ${focus}`;
const btnPrimary = `px-4 py-2 rounded-lg bg-[#c08020] hover:bg-[#a06a18] text-[#0d1520] font-bold font-fantasy text-sm disabled:opacity-50 ${focus}`;
const btnGhost = `px-3 py-1.5 rounded-lg border border-[#406080]/40 text-[#a0a0a0] hover:text-[#e0e0e0] hover:border-[#c08020]/50 font-fantasy text-xs disabled:opacity-50 ${focus}`;
const fmt = (iso: string) => (iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }) : "");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const linkTo = (to: string, params?: Record<string, string>) => ({ to, params } as any);

function ScriptsPage() {
  const navigate = useNavigate();
  const { archived: showArchived } = Route.useSearch();
  const [items, setItems] = useState<ScriptListItem[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [newName, setNewName] = useState("");
  const [newAudience, setNewAudience] = useState<ScriptAudience>("client");
  const [renaming, setRenaming] = useState<{ id: number; name: string } | null>(null);

  const load = useCallback(() => listScripts().then(setItems).catch((e) => setError(String(e))), []);
  useEffect(() => {
    load();
  }, [load]);

  const run = async (key: string, fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setBusy(key);
    setError("");
    try {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Something went wrong.");
      await load();
    } finally {
      setBusy("");
    }
  };
  const create = async () => {
    if (!newName.trim()) return;
    setBusy("new");
    setError("");
    try {
      const res = await createScript({ data: { name: newName.trim(), audience: newAudience } });
      if (!res.ok || !res.id) setError(res.error ?? "Could not create the script.");
      else navigate(linkTo("/admin/scripts/$id", { id: String(res.id) }));
    } finally {
      setBusy("");
    }
  };
  const duplicate = async (id: number) => {
    setBusy(`dup${id}`);
    try {
      const res = await duplicateScript({ data: { id } });
      if (!res.ok || !res.id) setError(res.error ?? "Could not duplicate.");
      else navigate(linkTo("/admin/scripts/$id", { id: String(res.id) }));
    } finally {
      setBusy("");
    }
  };

  const visible = (items ?? []).filter((s) => (showArchived ? s.archived : !s.archived));
  const groups: Array<{ audience: ScriptAudience; list: ScriptListItem[] }> = (["client", "recruit"] as ScriptAudience[]).map((a) => ({ audience: a, list: visible.filter((s) => s.audience === a) }));
  const archivedCount = (items ?? []).filter((s) => s.archived).length;

  return (
    <main className="min-h-dvh py-6 px-4" style={{ background: "linear-gradient(180deg, #0d1520 0%, #111a28 50%, #0d1520 100%)" }} data-scripts-page>
      <div className="max-w-4xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-fantasy text-[#c08020]" style={{ textShadow: "0 0 20px rgba(192, 128, 32, 0.3)" }}>📜 The DM Screen</h1>
          <p className="text-[#a0a0a0] text-xs font-fantasy mt-1">What you say, section by section. Write it here ahead of time, then press Present to read from it on your second monitor or your phone: it opens in its own window with nothing else on screen. Nothing here is generated: every word is yours.</p>
        </div>
        {error && <div className="p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-300 text-sm font-fantasy" data-scripts-error>{error}</div>}

        <section className={`${card} p-4`} data-script-new>
          <h2 className="font-fantasy text-[#c08020] text-sm mb-2">New script</h2>
          <p className="text-[11px] text-[#a0a0a0] mb-2">Starting from an existing one? Use Duplicate on it instead. That is the easiest way to make a short version or a variation.</p>
          <div className="flex flex-wrap gap-2">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") create(); }} placeholder="Script name, e.g. Client presentation" maxLength={120} className={`${input} flex-1 min-w-[14rem]`} data-script-new-name />
            <select value={newAudience} onChange={(e) => setNewAudience(e.target.value as ScriptAudience)} className={input} aria-label="Audience" data-script-new-audience>
              <option value="client" className="bg-gray-900">For clients</option>
              <option value="recruit" className="bg-gray-900">For recruits</option>
            </select>
            <button type="button" onClick={create} disabled={!newName.trim() || busy === "new"} className={btnPrimary} data-script-create>{busy === "new" ? "Creating..." : "➕ Create"}</button>
          </div>
        </section>

        {!items ? (
          <p className="text-xs text-[#a0a0a0] font-fantasy">Loading scripts...</p>
        ) : (
          groups.map((g) => (
            <section key={g.audience} className={`${card} p-4`} data-script-group={g.audience}>
              <h2 className="font-fantasy text-[#c08020] text-sm mb-2">{g.audience === "client" ? "🛡️ Client scripts" : "🧭 Recruit scripts"}{showArchived ? " · archived" : ""}</h2>
              {g.list.length === 0 ? (
                <p className="text-xs text-[#a0a0a0]">{showArchived ? "Nothing archived." : `No ${AUDIENCE_LABEL[g.audience].toLowerCase()} scripts yet. Create one above.`}</p>
              ) : (
                <ul className="space-y-2">
                  {g.list.map((s) => (
                    <li key={s.id} className="rounded-lg border border-[#406080]/30 px-3 py-2" data-script-row={s.id}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          {renaming?.id === s.id ? (
                            <form
                              className="flex gap-2"
                              onSubmit={(e) => {
                                e.preventDefault();
                                const name = renaming.name.trim();
                                if (name) run(`ren${s.id}`, () => renameScript({ data: { id: s.id, name } })).then(() => setRenaming(null));
                              }}
                            >
                              <input autoFocus value={renaming.name} onChange={(e) => setRenaming({ id: s.id, name: e.target.value })} maxLength={120} className={`${input} py-1`} data-script-rename-input />
                              <button type="submit" className={btnGhost} data-script-rename-save>Save</button>
                              <button type="button" onClick={() => setRenaming(null)} className={btnGhost}>Cancel</button>
                            </form>
                          ) : (
                            <Link {...linkTo("/admin/scripts/$id", { id: String(s.id) })} className={`text-[#e0e0e0] font-fantasy hover:text-[#c08020] ${focus}`} data-script-open>
                              {s.name}
                              {s.isDefault && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-[#c08020]/20 text-[#c08020] align-middle" data-script-default-badge>default</span>}
                            </Link>
                          )}
                          <p className="text-[11px] text-[#808080]">{s.sectionCount} section{s.sectionCount === 1 ? "" : "s"} · v{s.version} · edited {fmt(s.updatedAt)}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {!s.archived && <a href={`/admin/scripts/${s.id}/present`} target="_blank" rel="noopener" className={`${btnGhost} border-[#c08020]/50 text-[#c08020]`} data-script-present>▶ Present</a>}
                          {!s.archived && <Link {...linkTo("/admin/scripts/$id", { id: String(s.id) })} className={btnGhost} data-script-edit>✏️ Edit</Link>}
                          {!s.archived && <button type="button" onClick={() => duplicate(s.id)} disabled={busy === `dup${s.id}`} className={`${btnGhost} border-[#c08020]/50 text-[#c08020]`} data-script-duplicate>{busy === `dup${s.id}` ? "Copying..." : "📄 Duplicate"}</button>}
                          {!s.archived && <button type="button" onClick={() => setRenaming({ id: s.id, name: s.name })} className={btnGhost} data-script-rename>Rename</button>}
                          {!s.archived && !s.isDefault && <button type="button" onClick={() => run(`def${s.id}`, () => setDefaultScript({ data: { id: s.id } }))} className={btnGhost} data-script-set-default>Set as default</button>}
                          {!s.archived ? (
                            <button type="button" onClick={() => { if (confirm(`Archive "${s.name}"? It leaves the list but is never deleted; you can bring it back any time.`)) run(`arc${s.id}`, () => archiveScript({ data: { id: s.id, archived: true } })); }} className="text-[11px] text-[#808080] hover:text-[#e0c080] font-fantasy" data-script-archive>Archive</button>
                          ) : (
                            <button type="button" onClick={() => run(`arc${s.id}`, () => archiveScript({ data: { id: s.id, archived: false } }))} className={btnGhost} data-script-unarchive>↩ Bring back</button>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))
        )}

        <p className="text-[11px] text-[#606080] font-fantasy">
          {showArchived ? (
            <Link to="/admin/scripts" search={{}} className="underline text-[#c08020]" data-scripts-show-live>Back to live scripts</Link>
          ) : (
            <Link to="/admin/scripts" search={{ archived: 1 }} className="underline" data-scripts-show-archived>Archived scripts ({archivedCount})</Link>
          )}
          {" · "}Scripts are never deleted. Archive puts one away; every save is kept in its version history.
        </p>
      </div>
    </main>
  );
}
