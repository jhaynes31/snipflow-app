"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { DEFAULT_KINDS, readTendSettings } from "@/convex/tend/pure";
import { useHub } from "@/core/shell/HubContext";
import { Btn, Card, ErrorNote, Field, Note, PageTitle, Spinner, Toggle, useAction } from "@/core/ui";

/**
 * Tend's part of "my manual": my guidance entries (how to love me in each
 * kind of hard), my Love Menu, my check-in tiles, and faith features. The
 * eight manual sections themselves live in Shire Settings.
 */
export function MyManual() {
  const { profile, partner } = useHub();
  const guidance = useQuery(api.tend.guidance.mine);
  const menu = useQuery(api.tend.loveMenu.mine);
  const setModuleSettings = useMutation(api.profiles.setModuleSettings);
  const seed = useMutation(api.tend.guidance.seedStarter);
  const { busy, error, run } = useAction();
  const settings = readTendSettings(profile.moduleSettings);
  const saveSettings = (patch: Partial<typeof settings>) => run(() => setModuleSettings({ moduleId: "tend", settings: { ...settings, ...patch } }));

  if (!guidance || !menu) return <Spinner />;
  const partnerName = partner?.displayName ?? "your partner";

  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="My manual, for Tend" subtitle={`What ${partnerName} sees on a heads-up from you. Yours to edit any time.`} />
      <ErrorNote error={error} />

      <Card>
        <h2 className="sh-h2">How to love me when I&apos;m…</h2>
        {guidance.length === 0 && !settings.starterChosen ? (
          <div className="sh-stack-sm">
            <p>Start with the guidance written for one of you, or start empty. Either way it&apos;s yours to change.</p>
            <div className="sh-choices">
              <Btn disabled={busy} onClick={() => void run(async () => { await seed({ set: "john" }); await setModuleSettings({ moduleId: "tend", settings: { ...settings, starterChosen: true } }); })}>
                Use the starter set for John
              </Btn>
              <Btn disabled={busy} onClick={() => void run(async () => { await seed({ set: "jen" }); await setModuleSettings({ moduleId: "tend", settings: { ...settings, starterChosen: true } }); })}>
                Use the starter set for Jen
              </Btn>
              <Btn variant="ghost" disabled={busy} onClick={() => void saveSettings({ starterChosen: true })}>
                Start empty
              </Btn>
            </div>
          </div>
        ) : (
          <div className="sh-stack">
            {guidance.map((g) => (
              <GuidanceEditor key={g._id} entry={g} faith={settings.faith} />
            ))}
            <GuidanceEditor faith={settings.faith} />
          </div>
        )}
      </Card>

      <Card>
        <h2 className="sh-h2">My Love Menu</h2>
        <p className="sh-muted">Small ways you like to be loved. {partnerName} can pick one straight from your heads-up.</p>
        <div className="tend-menu-columns">
          {(
            [
              ["practical", "Practical", "refill my water"],
              ["emotional", "Emotional", "sit on the porch with me"],
              ["spiritual", "Spiritual", "pray over me"],
            ] as const
          )
            .filter(([key]) => key !== "spiritual" || settings.faith)
            .map(([key, label, example]) => (
              <MenuColumn key={key} column={key} label={label} example={example} items={menu.filter((m) => m.column === key)} />
            ))}
        </div>
      </Card>

      <Card>
        <h2 className="sh-h2">My check-in tiles</h2>
        <p className="sh-muted">Rename or hide any &ldquo;what kind of hard&rdquo; tile, or add your own.</p>
        <TilesEditor settings={settings} onSave={(tiles) => void saveSettings({ tiles })} busy={busy} />
      </Card>

      <Card>
        <h2 className="sh-h2">Faith features</h2>
        <Toggle
          checked={settings.faith}
          onChange={(v) => void saveSettings({ faith: v })}
          label="Anchor and the Pray line"
          hint="On for both of you by default. Turning it off here hides them for you only."
        />
      </Card>

      <p className="sh-muted">
        Your eight user-manual sections (what helps, what makes it worse, and so on) are in your{" "}
        <Link href="/profile" className="sh-link">
          Shire profile
        </Link>
        .
      </p>
    </div>
  );
}

function GuidanceEditor({ entry, faith }: { entry?: Doc<"tendGuidance">; faith: boolean }) {
  const save = useMutation(api.tend.guidance.save);
  const remove = useMutation(api.tend.guidance.remove);
  const { busy, error, run } = useAction();
  const [open, setOpen] = useState(!entry);
  const [title, setTitle] = useState(entry?.title ?? "");
  const [kinds, setKinds] = useState<string[]>(entry?.kinds ?? []);
  const [doText, setDo] = useState(entry?.do ?? "");
  const [say, setSay] = useState(entry?.say ?? "");
  const [skip, setSkip] = useState(entry?.skip ?? "");
  const [pray, setPray] = useState(entry?.pray ?? "");
  const [saved, setSaved] = useState(false);

  if (entry && !open) {
    return (
      <div className="sh-card-alt sh-row">
        <span>
          <strong>When I&apos;m {entry.title.toLowerCase()}</strong>
          <span className="sh-hint">{entry.do}</span>
        </span>
        <Btn variant="ghost" onClick={() => setOpen(true)}>
          Edit
        </Btn>
      </div>
    );
  }

  return (
    <form
      className="sh-card-alt sh-stack-sm"
      onSubmit={(e) => {
        e.preventDefault();
        void run(async () => {
          await save({ id: entry?._id, title, kinds, do: doText, say, skip, pray: faith ? pray : undefined });
          setSaved(true);
          setTimeout(() => setSaved(false), 1800);
          if (entry) setOpen(false);
          else {
            setTitle(""); setKinds([]); setDo(""); setSay(""); setSkip(""); setPray("");
          }
        });
      }}
    >
      <Field label="When I'm…" hint="In your words, for example: stuck in a logic loop">
        <input className="sh-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} required />
      </Field>
      <div>
        <span className="sh-label">Which check-in tiles this fits</span>
        <div className="sh-chips">
          {DEFAULT_KINDS.map((k) => {
            const on = kinds.includes(k.key);
            return (
              <button key={k.key} type="button" className={`sh-chip ${on ? "is-on" : ""}`} aria-pressed={on} onClick={() => setKinds(on ? kinds.filter((x) => x !== k.key) : [...kinds, k.key])}>
                {k.label}
              </button>
            );
          })}
        </div>
        <span className="sh-hint">Pick none and this shows on every heads-up.</span>
      </div>
      <Field label="Do">
        <input className="sh-input" value={doText} onChange={(e) => setDo(e.target.value)} maxLength={400} />
      </Field>
      <Field label="Say">
        <input className="sh-input" value={say} onChange={(e) => setSay(e.target.value)} maxLength={400} />
      </Field>
      <Field label="Skip">
        <input className="sh-input" value={skip} onChange={(e) => setSkip(e.target.value)} maxLength={400} />
      </Field>
      {faith && (
        <Field label="Pray" hint="Optional.">
          <input className="sh-input" value={pray} onChange={(e) => setPray(e.target.value)} maxLength={400} />
        </Field>
      )}
      <ErrorNote error={error} />
      <div className="sh-row sh-wrap">
        <Btn type="submit" disabled={busy || !title.trim()}>
          {entry ? "Save" : "Add"}
        </Btn>
        {saved && <Note>Saved.</Note>}
        {entry && (
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Btn>
            <Btn
              variant="ghost"
              disabled={busy}
              onClick={() => {
                if (window.confirm("Delete this entry? It's gone for good.")) void run(() => remove({ id: entry._id }));
              }}
            >
              Delete
            </Btn>
          </>
        )}
      </div>
    </form>
  );
}

function MenuColumn({ column, label, example, items }: { column: "practical" | "emotional" | "spiritual"; label: string; example: string; items: Doc<"tendLoveMenu">[] }) {
  const add = useMutation(api.tend.loveMenu.add);
  const remove = useMutation(api.tend.loveMenu.remove);
  const { busy, error, run } = useAction();
  const [text, setText] = useState("");
  return (
    <div>
      <h3 className="sh-h3">{label}</h3>
      <ul className="sh-list">
        {items.map((m) => (
          <li key={m._id} className="sh-row">
            <span>{m.text}</span>
            <button type="button" className="sh-iconbtn" aria-label={`Remove ${m.text}`} disabled={busy} onClick={() => void run(() => remove({ id: m._id }))}>
              ×
            </button>
          </li>
        ))}
      </ul>
      <form
        className="sh-row mt-2"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            await add({ column, text });
            setText("");
          });
        }}
      >
        <input className="sh-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={120} placeholder={`For example: ${example}`} aria-label={`Add a ${label.toLowerCase()} item`} />
        <Btn type="submit" variant="secondary" disabled={busy || !text.trim()}>
          Add
        </Btn>
      </form>
      <ErrorNote error={error} />
    </div>
  );
}

function TilesEditor({ settings, onSave, busy }: { settings: ReturnType<typeof readTendSettings>; onSave: (tiles: typeof settings.tiles) => void; busy: boolean }) {
  const [newLabel, setNewLabel] = useState("");
  const tiles = settings.tiles;
  const overrideFor = (key: string) => tiles.find((t) => t.key === key);
  const update = (key: string, patch: { label?: string; hidden?: boolean }) => {
    const rest = tiles.filter((t) => t.key !== key);
    onSave([...rest, { ...(overrideFor(key) ?? { key }), ...patch }]);
  };
  const custom = tiles.filter((t) => !DEFAULT_KINDS.some((d) => d.key === t.key));
  return (
    <div className="sh-stack-sm">
      {DEFAULT_KINDS.map((d) => {
        const o = overrideFor(d.key);
        return (
          <div key={d.key} className="sh-row sh-wrap">
            <input className="sh-input sh-input-tile" defaultValue={o?.label ?? d.label} maxLength={40} aria-label={`Label for ${d.label}`} onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== (o?.label ?? d.label)) update(d.key, { label: v }); }} />
            <Toggle checked={!o?.hidden} onChange={(v) => update(d.key, { hidden: !v })} label="Show" disabled={busy} />
          </div>
        );
      })}
      {custom.map((t) => (
        <div key={t.key} className="sh-row sh-wrap">
          <span className="sh-input sh-input-tile">{t.label}</span>
          <Btn variant="ghost" disabled={busy} onClick={() => onSave(tiles.filter((x) => x.key !== t.key))}>
            Remove
          </Btn>
        </div>
      ))}
      <form
        className="sh-row"
        onSubmit={(e) => {
          e.preventDefault();
          const label = newLabel.trim();
          if (!label) return;
          onSave([...tiles, { key: `custom-${Date.now().toString(36)}`, label }]);
          setNewLabel("");
        }}
      >
        <input className="sh-input" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} maxLength={40} placeholder="Add a tile of your own" aria-label="New tile" />
        <Btn type="submit" variant="secondary" disabled={busy || !newLabel.trim()}>
          Add
        </Btn>
      </form>
    </div>
  );
}


