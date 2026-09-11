import { useCallback, useEffect, useMemo, useState } from "react";
import { QUEST_CONFIG, generatorById, type GeneratorId } from "~/lib/questConfig";
import { WEEKDAY_NAMES, defaultEndDate, groupByWeek, partOrderWarnings, generatorSummary, seriesBadge, slugProblem, suggestSlug, toISODate, weekdayOf, type PlannedSlot, type SlotStatus, SLOT_STATUSES } from "~/lib/questPlan";
import { getProfiles, type ClientProfile } from "~/server/questBoard";
import { acceptPlan, deleteQuest, deleteSeries, deleteSlot, draftPlan, draftSeriesOutline, getQuests, getSeries, getSlots, saveQuest, saveSeries, saveSlot, type ContentSlot, type Quest, type QuestInput, type Series, type SeriesInput, type SlotInput } from "~/server/quests";
import { acknowledgeFlags } from "~/server/campaign";

/**
 * Quest Board › Quests (spec, Section 6): the quest list and builder, the
 * Shows list (recurring series), and each quest's page with its generator
 * list, series, week-by-week calendar, and "Draft a plan".
 */

const input = "w-full px-3 py-2 rounded-lg bg-[#0d1520]/60 border border-[#406080]/40 text-[#e0e0e0] text-sm font-fantasy focus:outline-none focus:border-[#c08020]/50 placeholder:text-[#606080]";
const label = "block text-[#a0a0a0] text-xs font-fantasy mb-1";
const btn = "px-3 py-1.5 rounded-lg border text-xs font-fantasy transition-all";
const btnGhost = `${btn} border-[#406080]/40 text-[#a0a0a0] hover:text-[#e0e0e0] hover:border-[#c08020]/50`;
const btnGold = `${btn} border-[#c08020]/40 text-[#c08020] hover:bg-[#c08020]/15`;
const btnPrimary = "px-4 py-2 rounded-lg bg-[#c08020] hover:bg-[#a06a18] text-[#0d1520] font-bold font-fantasy text-sm disabled:opacity-50";

const STATUS_LABEL: Record<SlotStatus, string> = { idea: "Idea", drafted: "Drafted", approved: "Approved", posted: "Posted", skipped: "Skipped" };
const STATUS_TONE: Record<SlotStatus, string> = {
  idea: "bg-[#204060]/30 text-[#a0c8e0] border-[#406080]/40",
  drafted: "bg-[#c08020]/15 text-[#c08020] border-[#c08020]/40",
  approved: "bg-green-900/40 text-green-300 border-green-700/40",
  posted: "bg-[#7fd08a]/20 text-[#7fd08a] border-[#3f8f4a]/60",
  skipped: "bg-[#0d1520] text-[#606080] border-[#406080]/30",
};

function Pill({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-fantasy border ${className}`}>{children}</span>;
}

const today = () => toISODate(new Date());
const fmtDate = (iso: string) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
};

export default function QuestsSection({ questId, onSelectQuest }: { questId: number | null; onSelectQuest: (id: number | null) => void }) {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [profiles, setProfiles] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Partial<QuestInput> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [q, s, p] = await Promise.all([getQuests(), getSeries(), getProfiles()]);
      setQuests(q);
      setSeries(s);
      setProfiles(p);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const shows = series.filter((s) => s.kind === "recurring");
  const selected = quests.find((q) => q.id === questId) ?? null;

  if (selected) {
    return (
      <QuestDetail
        quest={selected}
        allSeries={series}
        profiles={profiles}
        onBack={() => onSelectQuest(null)}
        onEdit={() => {
          onSelectQuest(null);
          setEditing({ ...selected });
        }}
        onChanged={load}
      />
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[#a0a0a0] text-sm font-fantasy max-w-xl">
          A quest aims at <span className="text-[#e0e0e0]">one profile</span> and tests <span className="text-[#e0e0e0]">one idea</span>. The scoreboard tells you what it taught.
        </p>
        <button type="button" onClick={() => setEditing({})} className={btnPrimary} data-new-quest>
          ➕ New quest
        </button>
      </div>
      {error && <div className="p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-300 text-sm font-fantasy">{error}</div>}

      {editing && (
        <QuestForm
          initial={editing}
          profiles={profiles.filter((p) => !p.archived || p.id === editing.profileId)}
          shows={shows}
          takenSlugs={quests.filter((q) => q.id !== editing.id).map((q) => q.slug)}
          onCancel={() => setEditing(null)}
          onSaved={async (id) => {
            setEditing(null);
            await load();
            if (id) onSelectQuest(id);
          }}
        />
      )}

      {loading && quests.length === 0 ? (
        <p className="text-[#a0a0a0] font-fantasy text-sm py-6 text-center">Scrying for quests...</p>
      ) : quests.length === 0 ? (
        <p className="text-[#606080] font-fantasy text-sm py-6 text-center">No quests yet. Start one when a profile is ready.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {quests.map((q) => (
            <button key={q.id} type="button" onClick={() => onSelectQuest(q.id)} className="text-left rounded-xl border border-[#406080]/30 bg-[#111a28] p-4 hover:border-[#c08020]/50 transition-all space-y-2" data-quest={q.name}>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-fantasy text-[#e0e0e0] text-lg leading-tight">{q.name}</h3>
                <Pill className={q.status === "active" ? "bg-green-900/40 text-green-300 border-green-700/40" : q.status === "complete" ? "bg-[#0d1520] text-[#a0a0a0] border-[#406080]/40" : "bg-[#c08020]/15 text-[#c08020] border-[#c08020]/40"}>{q.status}</Pill>
              </div>
              <p className="text-[#a0a0a0] text-xs font-fantasy">
                For {q.profileName || "no profile"} · {fmtDate(q.startDate)} to {fmtDate(q.endDate)} · {q.postsPerWeek}/week
              </p>
              <p className="text-[#e0e0e0] text-sm">
                <span className="text-[#606080] text-[10px] uppercase tracking-wider font-fantasy mr-2">Testing</span>
                {q.testing}
              </p>
              <p className="text-[#7fd08a] text-xs font-fantasy">🔗 {QUEST_CONFIG.siteDomain}/{q.slug}</p>
            </button>
          ))}
        </div>
      )}

      <ShowsPanel shows={shows} onChanged={load} />
    </section>
  );
}

// ── Quest form ──────────────────────────────────────────────────────

function QuestForm({ initial, profiles, shows, takenSlugs, onCancel, onSaved }: { initial: Partial<QuestInput>; profiles: ClientProfile[]; shows: Series[]; takenSlugs: string[]; onCancel: () => void; onSaved: (id?: number) => void }) {
  const start = initial.startDate || today();
  const [form, setForm] = useState<QuestInput>({
    id: initial.id,
    name: initial.name ?? "",
    profileId: initial.profileId ?? (profiles[0]?.id ?? null),
    offerQuiz: initial.offerQuiz ?? profiles[0]?.recommendedQuiz ?? "life_insurance",
    lootHighlight: initial.lootHighlight ?? "",
    testing: initial.testing ?? "",
    platforms: initial.platforms ?? QUEST_CONFIG.platforms.map((p) => p.id),
    postsPerWeek: initial.postsPerWeek ?? QUEST_CONFIG.defaultPostsPerWeek,
    startDate: start,
    endDate: initial.endDate || defaultEndDate(start),
    slug: initial.slug ?? "",
    status: initial.status ?? "planning",
    retro: initial.retro ?? "",
    showIds: initial.showIds ?? shows.filter((s) => s.active).map((s) => s.id),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof QuestInput>(k: K, v: QuestInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const slugIssue = form.slug ? slugProblem(form.slug, takenSlugs) : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await saveQuest({ data: form });
      if (!res.ok) {
        setError(res.error || "Could not save.");
        return;
      }
      onSaved(res.id);
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-xl border border-[#c08020]/40 bg-[#111a28] p-5 space-y-4" data-quest-form>
      <h2 className="font-fantasy text-[#c08020] text-lg">{form.id ? `Edit: ${initial.name}` : "New quest"}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className={label}>Quest name *</span>
          <input
            className={input}
            value={form.name}
            onChange={(e) => {
              set("name", e.target.value);
              if (!form.id && !form.slug) set("slug", suggestSlug(e.target.value));
            }}
            placeholder="e.g. New Parent Armor"
            maxLength={80}
            required
          />
        </label>
        <label className="block">
          <span className={label}>Profile *</span>
          <select
            className={input}
            value={form.profileId ?? ""}
            onChange={(e) => {
              const id = Number(e.target.value) || null;
              set("profileId", id);
              const p = profiles.find((x) => x.id === id);
              if (p) set("offerQuiz", p.recommendedQuiz);
            }}
          >
            <option value="">Pick a profile</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block">
        <span className={label}>What we're testing * (one idea per quest)</span>
        <input className={input} value={form.testing} onChange={(e) => set("testing", e.target.value)} placeholder="e.g. Do job-change hooks book calls?" maxLength={300} required />
      </label>
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <span className={label}>Quiz offer</span>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(QUEST_CONFIG.quizzes) as Array<keyof typeof QUEST_CONFIG.quizzes>).map((q) => (
              <button key={q} type="button" onClick={() => set("offerQuiz", q)} aria-pressed={form.offerQuiz === q} className={`${btn} ${form.offerQuiz === q ? "bg-[#c08020]/20 border-[#c08020] text-[#c08020]" : "border-[#406080]/40 text-[#a0a0a0]"}`}>
                {QUEST_CONFIG.quizzes[q].label}
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className={label}>Loot to highlight (optional)</span>
          <input className={input} value={form.lootHighlight} onChange={(e) => set("lootHighlight", e.target.value)} placeholder="e.g. The Party Map" maxLength={120} />
        </label>
        <div>
          <span className={label}>Platforms</span>
          <div className="flex flex-wrap gap-2">
            {QUEST_CONFIG.platforms.map((pl) => {
              const on = form.platforms.includes(pl.id);
              return (
                <button key={pl.id} type="button" onClick={() => set("platforms", on ? form.platforms.filter((x) => x !== pl.id) : [...form.platforms, pl.id])} aria-pressed={on} className={`${btn} ${on ? "bg-[#c08020]/20 border-[#c08020] text-[#c08020]" : "border-[#406080]/40 text-[#a0a0a0]"}`}>
                  {pl.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <label className="block">
          <span className={label}>Start</span>
          <input
            type="date"
            className={input}
            value={form.startDate}
            onChange={(e) => {
              set("startDate", e.target.value);
              if (e.target.value) set("endDate", defaultEndDate(e.target.value));
            }}
          />
        </label>
        <label className="block">
          <span className={label}>End (default {QUEST_CONFIG.defaultQuestWeeks} weeks)</span>
          <input type="date" className={input} value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
        </label>
        <label className="block">
          <span className={label}>Posts per week</span>
          <input type="number" min={1} max={7} className={input} value={form.postsPerWeek} onChange={(e) => set("postsPerWeek", Number(e.target.value) || 1)} />
        </label>
        <label className="block">
          <span className={label}>Status</span>
          <select className={input} value={form.status} onChange={(e) => set("status", e.target.value as QuestInput["status"])}>
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="complete">Complete</option>
          </select>
        </label>
      </div>
      <label className="block">
        <span className={label}>Campaign link * (said on camera and shown on screen)</span>
        <div className="flex items-center gap-2">
          <span className="text-[#a0a0a0] text-sm font-fantasy shrink-0">{QUEST_CONFIG.siteDomain}/</span>
          <input className={input} value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="baby" maxLength={30} data-slug />
        </div>
        {slugIssue ? <p className="text-red-300 text-xs font-fantasy mt-1" data-slug-problem>{slugIssue}</p> : form.slug ? <p className="text-[#7fd08a] text-xs font-fantasy mt-1">“Take the free quiz at {QUEST_CONFIG.siteDomain}/{form.slug}.”</p> : null}
      </label>
      {shows.length > 0 && (
        <div>
          <span className={label}>Recurring shows in this quest</span>
          <div className="flex flex-wrap gap-2">
            {shows.map((s) => {
              const on = form.showIds.includes(s.id);
              return (
                <button key={s.id} type="button" onClick={() => set("showIds", on ? form.showIds.filter((x) => x !== s.id) : [...form.showIds, s.id])} aria-pressed={on} className={`${btn} ${on ? "bg-[#c08020]/20 border-[#c08020] text-[#c08020]" : "border-[#406080]/40 text-[#a0a0a0]"}`} data-show-toggle={s.name}>
                  {on ? "✓ " : ""}
                  {s.name} · {s.defaultWeekday}s
                </button>
              );
            })}
          </div>
        </div>
      )}
      {form.id && (
        <label className="block">
          <span className={label}>Retro: what did we learn? (fill in when the quest ends)</span>
          <textarea className={`${input} resize-none`} rows={2} value={form.retro} onChange={(e) => set("retro", e.target.value)} maxLength={2000} />
        </label>
      )}
      {error && <p className="text-red-300 text-sm font-fantasy">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className={btnGhost}>
          Cancel
        </button>
        <button type="submit" disabled={saving || Boolean(slugIssue)} className={btnPrimary} data-save-quest>
          {saving ? "Saving..." : "💾 Save quest"}
        </button>
      </div>
    </form>
  );
}

// ── Shows (recurring series) ───────────────────────────────────────

function ShowsPanel({ shows, onChanged }: { shows: Series[]; onChanged: () => void }) {
  const [editing, setEditing] = useState<Partial<SeriesInput> | null>(null);
  const [error, setError] = useState("");
  const toggle = async (s: Series) => {
    const res = await saveSeries({ data: { ...s, active: !s.active } });
    if (!res.ok) setError(res.error || "Could not update the show.");
    onChanged();
  };
  const remove = async (s: Series) => {
    if (!confirm(`Delete the show "${s.name}"? Slots that used it keep their content but lose the badge.`)) return;
    const res = await deleteSeries({ data: { id: s.id } });
    if (!res.ok) setError(res.error || "Could not delete the show.");
    onChanged();
  };
  return (
    <div className="rounded-xl border border-[#406080]/30 bg-[#111a28] p-4 space-y-3" data-shows>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="font-fantasy text-[#c08020]">📺 Shows</h3>
          <p className="text-[#a0a0a0] text-xs font-fantasy">Regular formats that carry across quests. Switch them on per quest when you build it.</p>
        </div>
        <button type="button" onClick={() => setEditing({ kind: "recurring", defaultWeekday: "Tuesday", defaultGenerator: "script", active: true })} className={btnGold} data-new-show>
          ➕ New show
        </button>
      </div>
      {error && <p className="text-red-300 text-xs font-fantasy">{error}</p>}
      {editing && <SeriesForm initial={editing} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); onChanged(); }} />}
      <ul className="grid gap-2 md:grid-cols-2">
        {shows.map((s) => {
          const g = generatorById(s.defaultGenerator);
          return (
            <li key={s.id} className={`rounded-lg border p-3 ${s.active ? "border-[#406080]/30" : "border-[#406080]/20 opacity-60"}`} data-show={s.name}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[#e0e0e0] font-fantasy">{s.name}</p>
                  <p className="text-[#a0a0a0] text-xs font-fantasy">
                    {s.defaultWeekday}s · {g?.label ?? s.defaultGenerator}
                    {g && !g.available ? " (not built yet)" : ""}
                    {s.slug ? ` · /${s.slug}` : ""}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {s.example && <Pill className="bg-[#c08020]/15 text-[#c08020] border-[#c08020]/40">Example: edit or delete</Pill>}
                  {!s.active && <Pill className="bg-[#0d1520] text-[#606080] border-[#406080]/30">Off</Pill>}
                </div>
              </div>
              {s.description && <p className="text-[#a0a0a0] text-xs mt-1">{s.description}</p>}
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setEditing({ ...s })} className={btnGhost}>✏️ Edit</button>
                <button type="button" onClick={() => toggle(s)} className={btnGhost}>{s.active ? "⏸ Switch off" : "▶ Switch on"}</button>
                <button type="button" onClick={() => remove(s)} className={`${btn} ml-auto border-transparent text-red-400/70 hover:text-red-400`}>🗑️ Delete</button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SeriesForm({ initial, questId, onCancel, onSaved }: { initial: Partial<SeriesInput>; questId?: number; onCancel: () => void; onSaved: () => void }) {
  const kind = initial.kind ?? "recurring";
  const [form, setForm] = useState<SeriesInput>({
    id: initial.id,
    name: initial.name ?? "",
    kind,
    questId: kind === "multi_part" ? (initial.questId ?? questId ?? null) : null,
    totalParts: kind === "multi_part" ? (initial.totalParts ?? 3) : null,
    outline: initial.outline ?? [],
    defaultWeekday: initial.defaultWeekday ?? "Tuesday",
    defaultGenerator: initial.defaultGenerator ?? "script",
    description: initial.description ?? "",
    slug: initial.slug ?? "",
    active: initial.active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof SeriesInput>(k: K, v: SeriesInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const parts = form.totalParts ?? 3;

  const draft = async () => {
    if (!form.questId) return;
    setDrafting(true);
    setError("");
    try {
      const res = await draftSeriesOutline({ data: { questId: form.questId, name: form.name, totalParts: parts, description: form.description } });
      if (!res.ok) setError(res.error || "No outline came back.");
      else set("outline", res.outline);
    } finally {
      setDrafting(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await saveSeries({ data: form });
      if (!res.ok) {
        setError(res.error || "Could not save.");
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-lg border border-[#c08020]/40 bg-[#0d1520]/50 p-4 space-y-3" data-series-form>
      <h4 className="font-fantasy text-[#c08020] text-sm">{form.id ? `Edit: ${initial.name}` : kind === "multi_part" ? "New multi-part series" : "New show"}</h4>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className={label}>Name *</span>
          <input className={input} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder={kind === "multi_part" ? "e.g. New Parent Armor" : "e.g. Trap or Treasure Tuesday"} maxLength={80} required />
        </label>
        <label className="block">
          <span className={label}>Default generator</span>
          <select className={input} value={form.defaultGenerator} onChange={(e) => set("defaultGenerator", e.target.value as GeneratorId)}>
            {QUEST_CONFIG.generators.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
                {g.available ? "" : " (not built yet)"}
              </option>
            ))}
          </select>
        </label>
        {kind === "recurring" ? (
          <label className="block">
            <span className={label}>Default weekday</span>
            <select className={input} value={form.defaultWeekday} onChange={(e) => set("defaultWeekday", e.target.value)}>
              {WEEKDAY_NAMES.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </label>
        ) : (
          <label className="block">
            <span className={label}>Parts (2 to 4)</span>
            <input type="number" min={2} max={4} className={input} value={parts} onChange={(e) => set("totalParts", Math.max(2, Math.min(4, Number(e.target.value) || 2)))} />
          </label>
        )}
        <label className="block">
          <span className={label}>Series link (optional, e.g. armor)</span>
          <input className={input} value={form.slug} onChange={(e) => set("slug", e.target.value)} maxLength={30} />
        </label>
      </div>
      <label className="block">
        <span className={label}>Description</span>
        <input className={input} value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={400} />
      </label>
      {kind === "multi_part" && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className={label}>Outline: one line per part</span>
            <button type="button" onClick={draft} disabled={drafting || !form.name} className={btnGold} data-draft-outline>
              {drafting ? "🔮 Drafting..." : "🔮 Draft the outline"}
            </button>
          </div>
          <div className="space-y-1.5">
            {Array.from({ length: parts }).map((_, i) => (
              <input
                key={i}
                className={input}
                value={form.outline[i] ?? ""}
                onChange={(e) => {
                  const next = [...form.outline];
                  next[i] = e.target.value;
                  set("outline", next);
                }}
                placeholder={`Part ${i + 1}: ...`}
                maxLength={200}
                data-outline-line
              />
            ))}
          </div>
        </div>
      )}
      {error && <p className="text-red-300 text-xs font-fantasy">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className={btnGhost}>Cancel</button>
        <button type="submit" disabled={saving} className={btnPrimary} data-save-series>{saving ? "Saving..." : "💾 Save"}</button>
      </div>
    </form>
  );
}

// ── Quest detail: generators, series, calendar, plan ───────────────

function QuestDetail({ quest, allSeries, profiles, onBack, onEdit, onChanged }: { quest: Quest; allSeries: Series[]; profiles: ClientProfile[]; onBack: () => void; onEdit: () => void; onChanged: () => void }) {
  const [slots, setSlots] = useState<ContentSlot[]>([]);
  const [error, setError] = useState("");
  const [filterGen, setFilterGen] = useState<GeneratorId | null>(null);
  const [editingSlot, setEditingSlot] = useState<Partial<SlotInput> | null>(null);
  const [plan, setPlan] = useState<{ slots: PlannedSlot[]; changes: string[]; source: "ai" | "fallback" } | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [newSeries, setNewSeries] = useState(false);
  const profile = profiles.find((p) => p.id === quest.profileId);
  const multiPart = allSeries.filter((s) => s.kind === "multi_part" && s.questId === quest.id);
  const showsOn = allSeries.filter((s) => s.kind === "recurring" && quest.showIds.includes(s.id));

  const loadSlots = useCallback(async () => {
    try {
      setSlots(await getSlots({ data: { questId: quest.id } }));
    } catch (e) {
      setError(String(e));
    }
  }, [quest.id]);
  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  const summary = useMemo(() => generatorSummary(slots), [slots]);
  const warnings = useMemo(() => partOrderWarnings(slots), [slots]);
  const visible = filterGen ? slots.filter((s) => s.generator === filterGen) : slots;
  const weeks = useMemo(() => groupByWeek(visible, quest.startDate || visible[0]?.date || today()), [visible, quest.startDate]);

  const setStatus = async (slot: ContentSlot, status: SlotStatus) => {
    setError("");
    if (status === "posted" && !slot.postUrl) {
      // Marking posted asks for the post link (Section 7.3).
      setEditingSlot({ ...slot, status: "posted" });
      return;
    }
    const res = await saveSlot({ data: { ...slot, status } });
    if (!res.ok) setError(res.error || "Could not update the slot.");
    await loadSlots();
  };
  const ackFlags = async (slot: ContentSlot) => {
    const res = await acknowledgeFlags({ data: { slotId: slot.id } });
    if (!res.ok) setError(res.error || "Could not acknowledge the flags.");
    await loadSlots();
  };
  const removeSlot = async (slot: ContentSlot) => {
    if (!confirm("Delete this slot?")) return;
    await deleteSlot({ data: { id: slot.id } });
    await loadSlots();
  };
  const runDraft = async () => {
    setDrafting(true);
    setError("");
    try {
      const res = await draftPlan({ data: { questId: quest.id } });
      if (!res.ok) setError(res.error || "Could not draft a plan.");
      else setPlan({ slots: res.slots, changes: res.changes, source: res.source });
    } finally {
      setDrafting(false);
    }
  };
  const accept = async (accepted: PlannedSlot[]) => {
    const res = await acceptPlan({ data: { questId: quest.id, slots: accepted } });
    if (!res.ok) setError(res.error || "Could not save the plan.");
    setPlan(null);
    await loadSlots();
    onChanged();
  };
  const removeQuest = async () => {
    if (!confirm(`Delete the quest "${quest.name}" and all of its slots?`)) return;
    await deleteQuest({ data: { id: quest.id } });
    onChanged();
    onBack();
  };

  return (
    <section className="space-y-5" data-quest-detail={quest.name}>
      <button type="button" onClick={onBack} className="text-[#a0a0a0] hover:text-[#e0e0e0] text-xs font-fantasy">← All quests</button>

      <div className="rounded-xl border border-[#406080]/30 bg-[#111a28] p-5 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-fantasy text-[#e0e0e0] text-2xl leading-tight">{quest.name}</h2>
            <p className="text-[#a0a0a0] text-xs font-fantasy mt-1">
              For {quest.profileName || "no profile"} · {fmtDate(quest.startDate)} to {fmtDate(quest.endDate)} · {quest.postsPerWeek} posts/week · {quest.platforms.map((p) => QUEST_CONFIG.platforms.find((x) => x.id === p)?.label ?? p).join(", ")} · {quest.status}
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onEdit} className={btnGhost}>✏️ Edit quest</button>
            <button type="button" onClick={removeQuest} className={`${btn} border-transparent text-red-400/70 hover:text-red-400`}>🗑️ Delete</button>
          </div>
        </div>
        <p className="text-[#e0e0e0] text-sm">
          <span className="text-[#606080] text-[10px] uppercase tracking-wider font-fantasy mr-2">Testing</span>
          {quest.testing}
        </p>
        <p className="text-[#a0a0a0] text-sm font-fantasy">
          Offer: {QUEST_CONFIG.quizzes[quest.offerQuiz].label}
          {quest.lootHighlight ? ` · Loot: ${quest.lootHighlight}` : ""} · Say it: <span className="text-[#7fd08a]">“Take the free quiz at {QUEST_CONFIG.siteDomain}/{quest.slug}.”</span>
        </p>

        {/* Generator list (Section 6.5) */}
        <div className="flex flex-wrap items-center gap-2 pt-1" data-generator-summary>
          <span className="text-[#606080] text-[10px] uppercase tracking-wider font-fantasy">Generators</span>
          {summary.length === 0 && <span className="text-[#606080] text-xs font-fantasy">none yet</span>}
          {summary.map((g) => (
            <button key={g.id} type="button" onClick={() => setFilterGen(filterGen === g.id ? null : g.id)} aria-pressed={filterGen === g.id} className={`${btn} ${filterGen === g.id ? "bg-[#c08020]/20 border-[#c08020] text-[#c08020]" : "border-[#406080]/40 text-[#e0e0e0]"}`}>
              {g.label} ×{g.count}
              {!g.available ? " (not built yet)" : ""}
            </button>
          ))}
          {filterGen && <button type="button" onClick={() => setFilterGen(null)} className="text-[#a0a0a0] text-xs font-fantasy underline">show all</button>}
        </div>
        <div className="flex flex-wrap items-center gap-2" data-series-summary>
          <span className="text-[#606080] text-[10px] uppercase tracking-wider font-fantasy">Series</span>
          {multiPart.length === 0 && showsOn.length === 0 && <span className="text-[#606080] text-xs font-fantasy">none yet</span>}
          {multiPart.map((s) => (
            <Pill key={s.id} className="bg-[#c08020]/15 text-[#c08020] border-[#c08020]/40">{s.name} ({s.totalParts} parts)</Pill>
          ))}
          {showsOn.map((s) => (
            <Pill key={s.id} className="bg-[#204060]/30 text-[#a0c8e0] border-[#406080]/40">{s.name}</Pill>
          ))}
          <button type="button" onClick={() => setNewSeries(true)} className={btnGold} data-new-series>➕ Multi-part series</button>
        </div>
        {newSeries && <SeriesForm initial={{ kind: "multi_part", questId: quest.id, totalParts: 3, defaultGenerator: "script" }} questId={quest.id} onCancel={() => setNewSeries(false)} onSaved={() => { setNewSeries(false); onChanged(); }} />}
        {multiPart.some((s) => s.outline.length) && (
          <div className="space-y-1">
            {multiPart.filter((s) => s.outline.length).map((s) => (
              <div key={s.id} className="text-xs text-[#a0a0a0]">
                <span className="text-[#c08020] font-fantasy">{s.name}: </span>
                {s.outline.map((line, i) => (
                  <span key={i}>{i ? " · " : ""}{line}</span>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <div className="p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-300 text-sm font-fantasy">{error}</div>}
      {warnings.map((w) => (
        <div key={w} className="p-3 rounded-lg bg-[#c08020]/10 border border-[#c08020]/40 text-[#e8c884] text-sm font-fantasy" data-order-warning>⚠️ {w}</div>
      ))}

      {/* Calendar (Section 6.4) */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-fantasy text-[#c08020]">📅 Calendar</h3>
        <div className="flex gap-2">
          <button type="button" onClick={() => setEditingSlot({ questId: quest.id, date: quest.startDate || today(), platform: quest.platforms[0] ?? "tiktok", generator: "script", status: "idea" })} className={btnGhost} data-add-slot>➕ Add slot</button>
          <button type="button" onClick={runDraft} disabled={drafting} className={btnPrimary} data-draft-plan>{drafting ? "🔮 Drafting..." : "🔮 Draft a plan"}</button>
        </div>
      </div>

      {plan && <PlanReview plan={plan} profile={profile} onAccept={accept} onDiscard={() => setPlan(null)} />}

      {editingSlot && (
        <SlotForm initial={editingSlot} quest={quest} series={[...multiPart, ...showsOn]} profile={profile} onCancel={() => setEditingSlot(null)} onSaved={async () => { setEditingSlot(null); await loadSlots(); onChanged(); }} />
      )}

      {weeks.length === 0 ? (
        <p className="text-[#606080] font-fantasy text-sm py-6 text-center">No slots yet. Draft a plan or add one by hand.</p>
      ) : (
        weeks.map((w) => (
          <div key={w.weekStart} className="space-y-2" data-week={w.label}>
            <p className="text-[#a0a0a0] text-xs font-fantasy uppercase tracking-wider">{w.label} · from {fmtDate(w.weekStart)}</p>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {w.items.map((s) => (
                <SlotCard key={s.id} slot={s} onEdit={() => setEditingSlot({ ...s })} onStatus={(st) => setStatus(s, st)} onDelete={() => removeSlot(s)} onAckFlags={() => ackFlags(s)} />
              ))}
            </div>
          </div>
        ))
      )}
    </section>
  );
}

function SlotCard({ slot, onEdit, onStatus, onDelete, onAckFlags }: { slot: ContentSlot; onEdit: () => void; onStatus: (s: SlotStatus) => void; onDelete: () => void; onAckFlags: () => void }) {
  const g = generatorById(slot.generator);
  const badge = seriesBadge(slot);
  const canOpen = Boolean(g?.available && g.forgeTab) && !slot.madeElsewhere;
  const savedView = g?.forgeTab ? `/generator?tab=${g.forgeTab}&view=saved` : null;
  return (
    <article className={`rounded-lg border p-3 space-y-1.5 ${slot.status === "skipped" ? "border-[#406080]/20 opacity-60" : "border-[#406080]/30"} bg-[#111a28]`} data-slot={slot.id} data-slot-status={slot.status}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[#e0e0e0] text-sm font-fantasy">{weekdayOf(slot.date).slice(0, 3)} {fmtDate(slot.date)}</span>
        <Pill className={STATUS_TONE[slot.status]}>{STATUS_LABEL[slot.status]}</Pill>
      </div>
      <div className="flex flex-wrap gap-1">
        <Pill className={g?.available === false ? "bg-red-900/20 text-red-300 border-red-700/40" : "bg-[#204060]/30 text-[#a0c8e0] border-[#406080]/40"}>
          {g?.label ?? slot.generator}
          {g?.available === false ? " · not built yet" : ""}
        </Pill>
        {badge && <Pill className="bg-[#c08020]/15 text-[#c08020] border-[#c08020]/40">{badge}</Pill>}
        {slot.madeElsewhere && <Pill className="bg-[#0d1520] text-[#a0a0a0] border-[#406080]/40">Made another way</Pill>}
      </div>
      <p className="text-[#e0e0e0] text-sm leading-snug">{slot.topic || <span className="text-[#606080]">No topic yet</span>}</p>
      {slot.painPoint && <p className="text-[#a0a0a0] text-xs">“{slot.painPoint}”</p>}
      {slot.hookAngle && <p className="text-[#e8c884] text-xs font-fantasy">Hook: {slot.hookAngle}</p>}
      {slot.generatorReason && <p className="text-[#606080] text-[11px]">Why {g?.label?.toLowerCase() ?? slot.generator}: {slot.generatorReason}</p>}
      {slot.flags.length > 0 && (
        <div className={`rounded-lg border px-2 py-1.5 text-[11px] font-fantasy ${slot.flagsAcknowledged ? "border-[#406080]/40 text-[#a0a0a0]" : "border-[#c08020]/60 bg-[#c08020]/10 text-[#e8c884]"}`} data-slot-flags={slot.flagsAcknowledged ? "acknowledged" : "open"}>
          ⚠️ Flagged words: {slot.flags.join(", ")}
          {slot.flagsAcknowledged ? " · acknowledged" : (
            <button type="button" onClick={onAckFlags} className="ml-2 underline text-[#c08020]" data-ack-flags>
              I've checked these
            </button>
          )}
        </div>
      )}
      {slot.generatorOutputRef && (
        <p className="text-[11px] font-fantasy text-[#7fd08a]" data-slot-draft>
          📄 Draft attached{savedView ? <> · <a href={savedView} className="underline">view in the forge's saved list</a></> : null}
          {slot.outputHistory.length ? ` · ${slot.outputHistory.length} earlier draft${slot.outputHistory.length === 1 ? "" : "s"} kept` : ""}
        </p>
      )}
      {slot.postUrl && (
        <p className="text-[11px] font-fantasy text-[#a0a0a0] truncate">
          🔗 <a href={slot.postUrl} target="_blank" rel="noopener" className="underline">{slot.postUrl}</a>
          {Object.keys(slot.stats).length ? ` · ${Object.entries(slot.stats).map(([k, v]) => `${v} ${k}`).join(", ")}` : ""}
        </p>
      )}
      <div className="flex items-center gap-2 pt-1 flex-wrap">
        {canOpen ? (
          <a href={`/generator?tab=${g!.forgeTab}&view=forge&slot=${slot.id}`} className={`${btn} border-[#c08020]/40 text-[#c08020] hover:bg-[#c08020]/15`} data-open-generator>
            🧙 Open in generator
          </a>
        ) : slot.madeElsewhere ? null : (
          <span className={`${btn} border-[#406080]/30 text-[#606080] cursor-not-allowed`} title="Switch the generator, or tick Made another way" data-open-generator-disabled>
            🧙 Generator not built yet
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 pt-1">
        <select value={slot.status} onChange={(e) => onStatus(e.target.value as SlotStatus)} className="text-xs font-fantasy px-2 py-1 rounded border border-[#406080]/40 bg-transparent text-[#e0e0e0]" aria-label="Slot status" data-slot-status-select>
          {SLOT_STATUSES.map((st) => (
            <option key={st} value={st} className="bg-gray-900">
              {STATUS_LABEL[st]}
            </option>
          ))}
        </select>
        <button type="button" onClick={onEdit} className={btnGhost}>✏️</button>
        <button type="button" onClick={onDelete} className={`${btn} ml-auto border-transparent text-red-400/70 hover:text-red-400`} aria-label="Delete slot">🗑️</button>
      </div>
    </article>
  );
}

function SlotForm({ initial, quest, series, profile, onCancel, onSaved }: { initial: Partial<SlotInput>; quest: Quest; series: Series[]; profile?: ClientProfile; onCancel: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<SlotInput>({
    id: initial.id,
    questId: quest.id,
    date: initial.date ?? quest.startDate,
    platform: initial.platform ?? quest.platforms[0] ?? "tiktok",
    generator: initial.generator ?? "script",
    generatorReason: initial.generatorReason ?? "",
    seriesId: initial.seriesId ?? null,
    partNumber: initial.partNumber ?? null,
    madeElsewhere: initial.madeElsewhere ?? false,
    topic: initial.topic ?? "",
    painPoint: initial.painPoint ?? "",
    hookAngle: initial.hookAngle ?? "",
    generatorOutputRef: initial.generatorOutputRef ?? "",
    status: initial.status ?? "idea",
    postUrl: initial.postUrl ?? "",
    postSlug: initial.postSlug ?? "",
    stats: initial.stats ?? {},
    flags: initial.flags ?? [],
    notes: initial.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof SlotInput>(k: K, v: SlotInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const chosenSeries = series.find((s) => s.id === form.seriesId);
  const g = generatorById(form.generator);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await saveSlot({ data: form });
      if (!res.ok) {
        setError(res.error || "Could not save.");
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-xl border border-[#c08020]/40 bg-[#111a28] p-4 space-y-3" data-slot-form>
      <h4 className="font-fantasy text-[#c08020] text-sm">{form.id ? "Edit slot" : "New slot"}</h4>
      <div className="grid gap-3 md:grid-cols-4">
        <label className="block">
          <span className={label}>Date</span>
          <input type="date" className={input} value={form.date} onChange={(e) => set("date", e.target.value)} required />
        </label>
        <label className="block">
          <span className={label}>Generator</span>
          <select className={input} value={form.generator} onChange={(e) => set("generator", e.target.value as GeneratorId)} data-slot-generator>
            {QUEST_CONFIG.generators.map((x) => (
              <option key={x.id} value={x.id}>
                {x.label}
                {x.available ? "" : " (not built yet)"}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={label}>Series (optional)</span>
          <select
            className={input}
            value={form.seriesId ?? ""}
            onChange={(e) => {
              const id = Number(e.target.value) || null;
              set("seriesId", id);
              const s = series.find((x) => x.id === id);
              if (s?.kind === "multi_part") set("partNumber", form.partNumber ?? 1);
              else set("partNumber", null);
              if (s) set("generator", s.defaultGenerator);
            }}
          >
            <option value="">None</option>
            {series.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.kind === "multi_part" ? ` (${s.totalParts} parts)` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={label}>Status</span>
          <select className={input} value={form.status} onChange={(e) => set("status", e.target.value as SlotStatus)} data-form-status>
            {SLOT_STATUSES.map((st) => (
              <option key={st} value={st}>
                {STATUS_LABEL[st]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {chosenSeries?.kind === "multi_part" && (
        <label className="block max-w-[160px]">
          <span className={label}>Part number</span>
          <input type="number" min={1} max={chosenSeries.totalParts ?? 4} className={input} value={form.partNumber ?? 1} onChange={(e) => set("partNumber", Number(e.target.value) || 1)} />
        </label>
      )}
      {g && !g.available && (
        <p className="text-red-300 text-xs font-fantasy" data-not-built>
          {g.label} isn't built yet. Switch the generator, or tick "Made another way" to move this slot through the statuses without it.
        </p>
      )}
      <label className="block">
        <span className={label}>Topic</span>
        <input className={input} value={form.topic} onChange={(e) => set("topic", e.target.value)} maxLength={120} placeholder="e.g. Work coverage and what follows you" />
      </label>
      <label className="block">
        <span className={label}>Pain point</span>
        <input className={input} value={form.painPoint} onChange={(e) => set("painPoint", e.target.value)} maxLength={200} list="quest-pain-points" placeholder="Pick one of the profile's, or type your own" />
        {profile && (
          <datalist id="quest-pain-points">
            {profile.painPoints.map((pp) => (
              <option key={pp} value={pp} />
            ))}
          </datalist>
        )}
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className={label}>Hook angle</span>
          <input className={input} value={form.hookAngle} onChange={(e) => set("hookAngle", e.target.value)} maxLength={200} />
        </label>
        <label className="block">
          <span className={label}>Why this generator (one line)</span>
          <input className={input} value={form.generatorReason} onChange={(e) => set("generatorReason", e.target.value)} maxLength={200} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-xs font-fantasy text-[#a0a0a0]">
          <input type="checkbox" checked={form.madeElsewhere} onChange={(e) => set("madeElsewhere", e.target.checked)} data-made-elsewhere />
          Made another way (no generator)
        </label>
        <label className="flex items-center gap-2 text-xs font-fantasy text-[#a0a0a0]">
          Post link <span className="text-[#606080]">{QUEST_CONFIG.siteDomain}/</span>
          <input className={`${input} w-32`} value={form.postSlug} onChange={(e) => set("postSlug", e.target.value)} maxLength={30} placeholder="optional" />
        </label>
      </div>
      <div className="rounded-lg border border-[#406080]/25 bg-[#0d1520]/40 p-3 space-y-2">
        <p className="text-[#a0a0a0] text-[11px] font-fantasy uppercase tracking-wider">After posting</p>
        <label className="block">
          <span className={label}>Post link (the TikTok URL)</span>
          <input className={input} value={form.postUrl} onChange={(e) => set("postUrl", e.target.value)} maxLength={300} placeholder="https://www.tiktok.com/@.../video/..." data-post-url />
        </label>
        <div className="grid grid-cols-5 gap-2">
          {(["views", "likes", "comments", "shares", "saves"] as const).map((k) => (
            <label key={k} className="block">
              <span className={label}>{k}</span>
              <input type="number" min={0} className={input} value={form.stats[k] ?? ""} onChange={(e) => set("stats", { ...form.stats, [k]: e.target.value === "" ? undefined : Number(e.target.value) })} data-stat={k} />
            </label>
          ))}
        </div>
      </div>
      <label className="block">
        <span className={label}>Notes</span>
        <input className={input} value={form.notes} onChange={(e) => set("notes", e.target.value)} maxLength={1000} />
      </label>
      {error && <p className="text-red-300 text-xs font-fantasy">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className={btnGhost}>Cancel</button>
        <button type="submit" disabled={saving} className={btnPrimary} data-save-slot>{saving ? "Saving..." : "💾 Save slot"}</button>
      </div>
    </form>
  );
}

// ── Plan review (Section 6.4): accept, edit, or remove before anything is saved ──

function PlanReview({ plan, profile, onAccept, onDiscard }: { plan: { slots: PlannedSlot[]; changes: string[]; source: "ai" | "fallback" }; profile?: ClientProfile; onAccept: (slots: PlannedSlot[]) => void; onDiscard: () => void }) {
  const [rows, setRows] = useState<PlannedSlot[]>(plan.slots);
  useEffect(() => setRows(plan.slots), [plan]);
  const update = (i: number, patch: Partial<PlannedSlot>) => setRows((r) => r.map((s, k) => (k === i ? { ...s, ...patch } : s)));
  const remove = (i: number) => setRows((r) => r.filter((_, k) => k !== i));
  const memes = rows.filter((s) => s.generator === "meme").length;
  return (
    <div className="rounded-xl border border-[#c08020]/50 bg-[#0d1520]/60 p-4 space-y-3" data-plan-review>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-fantasy text-[#c08020]">🔮 Proposed plan · {rows.length} posts</h3>
          <p className="text-[#a0a0a0] text-xs font-fantasy">
            Nothing is saved until you accept. Edit or remove any row first.{plan.source === "fallback" ? " (The AI didn't answer, so this is a plain plan from the format mix.)" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onDiscard} className={btnGhost}>Discard</button>
          <button type="button" onClick={() => onAccept(rows)} disabled={rows.length === 0} className={btnPrimary} data-accept-plan>✅ Accept {rows.length} slots</button>
        </div>
      </div>
      {plan.changes.length > 0 && (
        <ul className="text-[#e8c884] text-xs font-fantasy space-y-0.5">
          {plan.changes.map((c) => (
            <li key={c}>⚠️ {c}</li>
          ))}
        </ul>
      )}
      <p className="text-[#606080] text-[11px] font-fantasy">
        Memes: {memes} of {rows.length} (limit {Math.round(QUEST_CONFIG.memeMaxShare * 100)}%). Profile: {profile?.name ?? "none"}.
      </p>
      <div className="space-y-2">
        {rows.map((s, i) => {
          const g = generatorById(s.generator);
          return (
            <div key={`${s.date}-${i}`} className="rounded-lg border border-[#406080]/30 bg-[#111a28] p-3 grid gap-2 md:grid-cols-[110px_150px_1fr_auto] items-start" data-plan-row>
              <div className="text-[#e0e0e0] text-sm font-fantasy">
                {weekdayOf(s.date).slice(0, 3)} {fmtDate(s.date)}
                {seriesBadge(s) && <p className="text-[#c08020] text-[11px] mt-1">{seriesBadge(s)}</p>}
              </div>
              <div>
                <select className={input} value={s.generator} onChange={(e) => update(i, { generator: e.target.value as GeneratorId })} aria-label="Generator">
                  {QUEST_CONFIG.generators.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.label}
                      {x.available ? "" : " (not built yet)"}
                    </option>
                  ))}
                </select>
                {g && !g.available && <p className="text-red-300 text-[11px] font-fantasy mt-1">not built yet</p>}
              </div>
              <div className="space-y-1">
                <input className={input} value={s.topic} onChange={(e) => update(i, { topic: e.target.value })} aria-label="Topic" />
                <input className={input} value={s.painPoint} onChange={(e) => update(i, { painPoint: e.target.value })} aria-label="Pain point" />
                <input className={input} value={s.hookAngle} onChange={(e) => update(i, { hookAngle: e.target.value })} aria-label="Hook angle" placeholder="Hook angle" />
                <p className="text-[#606080] text-[11px]">Why: {s.generatorReason}</p>
              </div>
              <button type="button" onClick={() => remove(i)} className={`${btn} border-transparent text-red-400/70 hover:text-red-400`} aria-label="Remove this slot">✕</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
