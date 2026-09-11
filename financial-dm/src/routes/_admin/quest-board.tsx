import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import QuestsSection from "~/components/quest/QuestsSection";
import { useCallback, useEffect, useState } from "react";
import { QUEST_CONFIG } from "~/lib/questConfig";
import { deleteProfile, getProfiles, saveProfile, setProfileArchived, suggestPainPoints, type ClientProfile, type ProfileInput } from "~/server/questBoard";

type Section = "profiles" | "quests" | "scoreboard";

/**
 * The Quest Board: John's campaign manager (spec, Section 1). Phase 1 ships
 * the frame and the Profiles section; Quests and the Scoreboard land in
 * later phases.
 */
export const Route = createFileRoute("/_admin/quest-board")({
  validateSearch: (s: Record<string, unknown>): { section?: Section; quest?: number } => ({
    section: s.section === "quests" || s.section === "scoreboard" ? s.section : s.section === "profiles" ? "profiles" : undefined,
    quest: Number.isFinite(Number(s.quest)) && Number(s.quest) > 0 ? Number(s.quest) : undefined,
  }),
  component: QuestBoardPage,
});

const SECTIONS: Array<{ id: Section; label: string; blurb: string }> = [
  { id: "profiles", label: "🧑‍🤝‍🧑 Profiles", blurb: "Who John most wants to help: their life moments and money worries." },
  { id: "quests", label: "🗺️ Quests", blurb: "Campaigns aimed at one profile, each testing one idea." },
  { id: "scoreboard", label: "🏆 Scoreboard", blurb: "Which quests book calls. Bookings first, views second." },
];

function QuestBoardPage() {
  const { section = "profiles", quest } = Route.useSearch();
  const navigate = useNavigate();
  return (
    <main className="min-h-dvh py-6 px-4" style={{ background: "linear-gradient(180deg, #0d1520 0%, #111a28 50%, #0d1520 100%)" }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-4">
          <img src="/logo.png" alt="The Financial DM" className="h-20 sm:h-24 mx-auto drop-shadow-lg" />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-fantasy text-[#c08020]" style={{ textShadow: "0 0 20px rgba(192, 128, 32, 0.3)" }}>
              🗺️ Quest Board 🗺️
            </h1>
            <p className="text-[#a0a0a0] text-xs font-fantasy mt-1">Plan campaigns, feed the forge, and see which quests book calls.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link to="/generator" search={{ tab: "script", view: "forge" }} className="px-4 py-2 rounded-lg border border-[#c08020]/40 text-[#c08020] hover:bg-[#c08020]/10 transition-all font-fantasy text-sm">
              🧙 Content Forge
            </Link>
            <Link to="/dashboard" className="px-4 py-2 rounded-lg border border-[#406080]/40 text-[#e0e0e0] hover:bg-[#204060]/20 transition-all font-fantasy text-sm">
              ⚔️ Lead Dashboard
            </Link>
          </div>
        </div>

        <nav className="flex gap-2 flex-wrap mb-6" aria-label="Quest Board sections">
          {SECTIONS.map((s) => (
            <Link
              key={s.id}
              to="/quest-board"
              search={{ section: s.id }}
              aria-current={section === s.id ? "page" : undefined}
              className={`px-4 py-2 rounded-lg border font-fantasy text-sm transition-all ${
                section === s.id ? "bg-[#c08020] border-[#c08020] text-[#0d1520] font-bold" : "border-[#406080]/40 text-[#a0a0a0] hover:text-[#e0e0e0] hover:border-[#c08020]/50"
              }`}
            >
              {s.label}
            </Link>
          ))}
        </nav>

        {section === "profiles" && <ProfilesSection />}
        {section === "quests" && <QuestsSection questId={quest ?? null} onSelectQuest={(id) => navigate({ to: "/quest-board", search: { section: "quests", quest: id ?? undefined } })} />}
        {section === "scoreboard" && <ComingSoon title="Scoreboard" phase="Phase 5" blurb={SECTIONS[2].blurb} />}
      </div>
    </main>
  );
}

function ComingSoon({ title, phase, blurb }: { title: string; phase: string; blurb: string }) {
  return (
    <section className="rounded-xl border border-[#406080]/30 bg-[#111a28] p-8 text-center">
      <h2 className="font-fantasy text-[#c08020] text-xl">{title}</h2>
      <p className="text-[#a0a0a0] text-sm font-fantasy mt-2 max-w-md mx-auto">{blurb}</p>
      <p className="text-[#606080] text-xs font-fantasy mt-4">Arrives in {phase}.</p>
    </section>
  );
}

// ── Profiles ────────────────────────────────────────────────────────

const EMPTY: ProfileInput = {
  name: "",
  lifeStage: "",
  triggers: [],
  painPoints: [],
  worries: "",
  whereTheyAre: QUEST_CONFIG.platforms.map((p) => p.id),
  recommendedQuiz: "life_insurance",
  notes: "",
  archived: false,
};

function ProfilesSection() {
  const [profiles, setProfiles] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<ProfileInput | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setProfiles(await getProfiles());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = profiles.filter((p) => showArchived || !p.archived);
  const archivedCount = profiles.filter((p) => p.archived).length;

  const onSaved = async () => {
    setEditing(null);
    await load();
  };

  const toggleArchive = async (p: ClientProfile) => {
    const res = await setProfileArchived({ data: { id: p.id, archived: !p.archived } });
    if (!res.ok) setError(res.error || "Could not update the profile.");
    await load();
  };

  const remove = async (p: ClientProfile) => {
    if (!confirm(`Delete the "${p.name}" profile? Quests that used it keep their own copy of the details.`)) return;
    const res = await deleteProfile({ data: { id: p.id } });
    if (!res.ok) setError(res.error || "Could not delete the profile.");
    await load();
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[#a0a0a0] text-sm font-fantasy max-w-xl">
          Profiles describe <span className="text-[#e0e0e0]">life moments and money worries</span>, never who someone is. Each quest aims at one profile.
        </p>
        <div className="flex gap-2 items-center">
          {archivedCount > 0 && (
            <button type="button" onClick={() => setShowArchived((v) => !v)} className="px-3 py-2 rounded-lg border border-[#406080]/40 text-[#a0a0a0] hover:text-[#e0e0e0] text-xs font-fantasy">
              {showArchived ? "Hide archived" : `Show archived (${archivedCount})`}
            </button>
          )}
          <button type="button" onClick={() => setEditing({ ...EMPTY })} className="px-4 py-2 rounded-lg bg-[#c08020] hover:bg-[#a06a18] text-[#0d1520] font-bold font-fantasy text-sm" data-new-profile>
            ➕ New profile
          </button>
        </div>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-900/20 border border-red-700/30 text-red-300 text-sm font-fantasy">{error}</div>}

      {editing && <ProfileForm initial={editing} onCancel={() => setEditing(null)} onSaved={onSaved} />}

      {loading && profiles.length === 0 ? (
        <p className="text-[#a0a0a0] font-fantasy text-sm py-8 text-center">Scrying for profiles...</p>
      ) : visible.length === 0 ? (
        <p className="text-[#606080] font-fantasy text-sm py-8 text-center">No profiles yet. Add the first one.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((p) => (
            <ProfileCard key={p.id} profile={p} onEdit={() => setEditing({ ...p })} onArchive={() => toggleArchive(p)} onDelete={() => remove(p)} />
          ))}
        </div>
      )}
    </section>
  );
}

function Chip({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "gold" }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-fantasy border ${tone === "gold" ? "bg-[#c08020]/15 text-[#c08020] border-[#c08020]/40" : "bg-[#204060]/30 text-[#a0c8e0] border-[#406080]/40"}`}>
      {children}
    </span>
  );
}

function ProfileCard({ profile: p, onEdit, onArchive, onDelete }: { profile: ClientProfile; onEdit: () => void; onArchive: () => void; onDelete: () => void }) {
  return (
    <article className={`rounded-xl border bg-[#111a28] p-4 space-y-3 ${p.archived ? "border-[#406080]/20 opacity-60" : "border-[#406080]/30"}`} data-profile={p.name}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-fantasy text-[#e0e0e0] text-lg leading-tight">{p.name}</h3>
          <p className="text-[#a0a0a0] text-xs font-fantasy mt-0.5">{p.lifeStage}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {p.example && <Chip tone="gold">Example: edit or delete</Chip>}
          {p.archived && <Chip>Archived</Chip>}
        </div>
      </div>
      {p.triggers.length > 0 && (
        <div>
          <p className="text-[#606080] text-[10px] font-fantasy uppercase tracking-wider mb-1">Moments that create the need</p>
          <div className="flex flex-wrap gap-1">
            {p.triggers.map((t) => (
              <Chip key={t}>{t}</Chip>
            ))}
          </div>
        </div>
      )}
      {p.painPoints.length > 0 && (
        <div>
          <p className="text-[#606080] text-[10px] font-fantasy uppercase tracking-wider mb-1">Pain points</p>
          <ul className="space-y-1">
            {p.painPoints.map((pp) => (
              <li key={pp} className="text-[#e0e0e0] text-sm flex gap-2">
                <span className="text-[#c08020] shrink-0">◆</span>
                <span>{pp}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {p.worries && (
        <p className="text-[#a0a0a0] text-sm italic font-fantasy">
          <span className="not-italic text-[#606080] text-[10px] uppercase tracking-wider mr-2">Keeps them up at night</span>“{p.worries}”
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-fantasy text-[#a0a0a0]">
        <span>Quiz: {QUEST_CONFIG.quizzes[p.recommendedQuiz].label}</span>
        <span>·</span>
        <span>Where: {p.whereTheyAre.map((id) => QUEST_CONFIG.platforms.find((x) => x.id === id)?.label ?? id).join(", ") || "not set"}</span>
      </div>
      {p.notes && <p className="text-[#a0a0a0] text-xs whitespace-pre-wrap">{p.notes}</p>}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onEdit} className="px-3 py-1.5 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#c08020]/20 hover:border-[#c08020]/50 text-xs font-fantasy">
          ✏️ Edit
        </button>
        <button type="button" onClick={onArchive} className="px-3 py-1.5 rounded-lg border border-[#406080]/30 text-[#a0a0a0] hover:text-[#e0e0e0] text-xs font-fantasy">
          {p.archived ? "📂 Restore" : "📦 Archive"}
        </button>
        <button type="button" onClick={onDelete} className="ml-auto px-3 py-1.5 rounded-lg text-red-400/70 hover:text-red-400 text-xs font-fantasy" title="Delete this profile">
          🗑️ Delete
        </button>
      </div>
    </article>
  );
}

/** Comma or newline separated text → list. */
const toList = (s: string) => s.split(/[\n,]/).map((x) => x.trim()).filter(Boolean);

function ProfileForm({ initial, onCancel, onSaved }: { initial: ProfileInput; onCancel: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<ProfileInput>(initial);
  const [triggersText, setTriggersText] = useState(initial.triggers.join(", "));
  const [newPain, setNewPain] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestNote, setSuggestNote] = useState("");

  useEffect(() => {
    setForm(initial);
    setTriggersText(initial.triggers.join(", "));
    setSuggestions([]);
  }, [initial]);

  const set = <K extends keyof ProfileInput>(k: K, v: ProfileInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const triggers = toList(triggersText);

  const addPain = (text: string) => {
    const t = text.trim();
    if (!t || form.painPoints.some((p) => p.toLowerCase() === t.toLowerCase())) return;
    set("painPoints", [...form.painPoints, t]);
  };

  const suggest = async () => {
    setSuggesting(true);
    setSuggestNote("");
    try {
      const res = await suggestPainPoints({ data: { lifeStage: form.lifeStage, triggers, existing: form.painPoints } });
      if (!res.ok) setSuggestNote(res.error || "No suggestions this time.");
      setSuggestions(res.suggestions);
    } catch (e) {
      setSuggestNote(String(e));
    } finally {
      setSuggesting(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await saveProfile({ data: { ...form, triggers } });
      if (!res.ok) {
        setError(res.error || "Could not save.");
        return;
      }
      onSaved();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const input = "w-full px-3 py-2 rounded-lg bg-[#0d1520]/60 border border-[#406080]/40 text-[#e0e0e0] text-sm font-fantasy focus:outline-none focus:border-[#c08020]/50 placeholder:text-[#606080]";
  const label = "block text-[#a0a0a0] text-xs font-fantasy mb-1";

  return (
    <form onSubmit={submit} className="rounded-xl border border-[#c08020]/40 bg-[#111a28] p-5 space-y-4" data-profile-form>
      <h2 className="font-fantasy text-[#c08020] text-lg">{form.id ? `Edit: ${initial.name}` : "New profile"}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className={label}>Name *</span>
          <input className={input} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. New Parents" maxLength={80} required />
        </label>
        <label className="block">
          <span className={label}>Life stage</span>
          <input className={input} value={form.lifeStage} onChange={(e) => set("lifeStage", e.target.value)} placeholder="e.g. Just had, or expecting, a baby" maxLength={160} />
        </label>
      </div>
      <label className="block">
        <span className={label}>Moments that create the need (separate with commas)</span>
        <input className={input} value={triggersText} onChange={(e) => setTriggersText(e.target.value)} placeholder="new baby, going from two incomes to one, naming a guardian" />
      </label>

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className={label}>Pain points, in their own words</span>
          <button type="button" onClick={suggest} disabled={suggesting || (!form.lifeStage && triggers.length === 0)} className="px-3 py-1.5 rounded-lg border border-[#c08020]/40 text-[#c08020] hover:bg-[#c08020]/15 text-xs font-fantasy disabled:opacity-40" data-suggest>
            {suggesting ? "🔮 Thinking..." : "🔮 Suggest pain points"}
          </button>
        </div>
        <ul className="space-y-1 mb-2">
          {form.painPoints.map((pp) => (
            <li key={pp} className="flex items-start gap-2 text-sm text-[#e0e0e0] bg-[#0d1520]/50 rounded-lg px-3 py-1.5" data-pain-point>
              <span className="text-[#c08020] shrink-0">◆</span>
              <span className="flex-1">{pp}</span>
              <button type="button" onClick={() => set("painPoints", form.painPoints.filter((x) => x !== pp))} className="text-red-400/70 hover:text-red-400 text-xs font-fantasy shrink-0" aria-label={`Remove: ${pp}`}>
                ✕
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input
            className={input}
            value={newPain}
            onChange={(e) => setNewPain(e.target.value)}
            placeholder="Type a pain point and press Add"
            maxLength={200}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addPain(newPain);
                setNewPain("");
              }
            }}
          />
          <button
            type="button"
            onClick={() => {
              addPain(newPain);
              setNewPain("");
            }}
            className="px-3 py-2 rounded-lg border border-[#406080]/40 text-[#e0e0e0] hover:border-[#c08020]/50 text-xs font-fantasy shrink-0"
          >
            Add
          </button>
        </div>
        {suggestNote && <p className="text-[#a0a0a0] text-xs font-fantasy mt-2">{suggestNote}</p>}
        {suggestions.length > 0 && (
          <div className="mt-3 rounded-lg border border-[#c08020]/30 bg-[#0d1520]/40 p-3" data-suggestions>
            <p className="text-[#c08020] text-xs font-fantasy mb-2">Suggestions. Nothing is added until you accept it.</p>
            <ul className="space-y-1.5">
              {suggestions.map((s) => (
                <li key={s} className="flex items-start gap-2 text-sm text-[#e0e0e0]">
                  <span className="flex-1">{s}</span>
                  <button
                    type="button"
                    onClick={() => {
                      addPain(s);
                      setSuggestions((list) => list.filter((x) => x !== s));
                    }}
                    className="px-2 py-1 rounded border border-[#3f8f4a]/60 text-[#7fd08a] hover:bg-[#3f8f4a]/20 text-xs font-fantasy shrink-0"
                  >
                    ✓ Accept
                  </button>
                  <button type="button" onClick={() => setSuggestions((list) => list.filter((x) => x !== s))} className="px-2 py-1 rounded border border-[#406080]/40 text-[#a0a0a0] hover:text-[#e0e0e0] text-xs font-fantasy shrink-0">
                    Discard
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <label className="block">
        <span className={label}>What keeps them up at night (one line, in their words)</span>
        <input className={input} value={form.worries} onChange={(e) => set("worries", e.target.value)} placeholder="If something happened to one of us, could the other keep the house?" maxLength={600} />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <span className={label}>Where they are</span>
          <div className="flex flex-wrap gap-2">
            {QUEST_CONFIG.platforms.map((pl) => {
              const on = form.whereTheyAre.includes(pl.id);
              return (
                <button
                  key={pl.id}
                  type="button"
                  onClick={() => set("whereTheyAre", on ? form.whereTheyAre.filter((x) => x !== pl.id) : [...form.whereTheyAre, pl.id])}
                  aria-pressed={on}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-fantasy ${on ? "bg-[#c08020]/20 border-[#c08020] text-[#c08020]" : "border-[#406080]/40 text-[#a0a0a0]"}`}
                >
                  {pl.label}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <span className={label}>Recommended quiz</span>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(QUEST_CONFIG.quizzes) as Array<keyof typeof QUEST_CONFIG.quizzes>).map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => set("recommendedQuiz", q)}
                aria-pressed={form.recommendedQuiz === q}
                className={`px-3 py-1.5 rounded-lg border text-xs font-fantasy ${form.recommendedQuiz === q ? "bg-[#c08020]/20 border-[#c08020] text-[#c08020]" : "border-[#406080]/40 text-[#a0a0a0]"}`}
              >
                {QUEST_CONFIG.quizzes[q].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <label className="block">
        <span className={label}>Notes (optional)</span>
        <textarea className={`${input} resize-none`} rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} maxLength={1000} />
      </label>

      {error && <p className="text-red-300 text-sm font-fantasy">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg border border-[#406080]/40 text-[#a0a0a0] hover:text-[#e0e0e0] text-sm font-fantasy">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="px-5 py-2 rounded-lg bg-[#c08020] hover:bg-[#a06a18] text-[#0d1520] font-bold text-sm font-fantasy disabled:opacity-50" data-save-profile>
          {saving ? "Saving..." : "💾 Save profile"}
        </button>
      </div>
    </form>
  );
}
