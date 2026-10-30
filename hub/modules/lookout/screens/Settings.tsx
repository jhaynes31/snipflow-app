"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useConvex, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { DEFAULT_WEIGHTS, WEIGHT_LABEL, type Weights } from "@/convex/lookout/pure";
import { EMPLOYER_KINDS, SOURCE_KIND_LABEL, type SourceKind } from "@/convex/lookout/sources";
import { Btn, Card, ErrorNote, Field, Note, PageTitle, Spinner, Toggle, useAction } from "@/core/ui";
import { download } from "../docx";

/** Requirements, ranking, sources, helping, and his data. */
export function LookoutSettings() {
  const s = useQuery(api.lookout.data.settings);
  const status = useQuery(api.lookout.data.status);
  const set = useMutation(api.lookout.data.setSettings);
  const deleteSearch = useMutation(api.lookout.data.deleteMySearch);
  const give = useMutation(api.lookout.data.giveToPartner);
  const convex = useConvex();
  const router = useRouter();
  const { busy, error, run } = useAction();
  const [weights, setWeights] = useState<Weights | null>(null);
  const [src, setSrc] = useState({ kind: "greenhouse" as SourceKind, token: "", name: "" });
  const [saved, setSaved] = useState(false);
  const [follow, setFollow] = useState("");
  const [followNote, setFollowNote] = useState<string | null>(null);
  const addBoard = useMutation(api.lookout.data.addBoard);
  if (!s || !status) return <Spinner />;
  const owner = s.role === "owner";
  const w = weights ?? s.weights;
  const total = Object.values(w).reduce((a, b) => a + b, 0);
  const done = () => { setSaved(true); setTimeout(() => setSaved(false), 1800); };

  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Lookout settings" />
      {saved && <Note>Saved.</Note>}
      <ErrorNote error={error} />

      <Card>
        <h2 className="sh-h2">Hard requirements</h2>
        <p className="sh-hint">A job that fails one of these is set aside, whatever else it offers. No cold calling, no commission only pay, and no office or relocation are always on.</p>
        <div className="sh-row sh-wrap">
          <Field label="Lowest guaranteed pay, per hour"><input className="sh-input sh-input-sm" type="number" min={7.25} step={0.5} defaultValue={s.minHourly} onBlur={(e) => { const n = Number(e.target.value); if (n !== s.minHourly) void run(async () => { await set({ minHourly: n }); done(); }); }} /></Field>
          <Field label="Most hours a week"><input className="sh-input sh-input-sm" type="number" min={5} max={60} defaultValue={s.maxHours} onBlur={(e) => { const n = Number(e.target.value); if (n !== s.maxHours) void run(async () => { await set({ maxHours: n }); done(); }); }} /></Field>
          <Field label="Home state"><input className="sh-input" defaultValue={s.homeState} maxLength={40} onBlur={(e) => { if (e.target.value.trim() && e.target.value !== s.homeState) void run(async () => { await set({ homeState: e.target.value }); done(); }); }} /></Field>
        </div>
      </Card>

      <Card>
        <h2 className="sh-h2">What matters most, for ranking</h2>
        <p className="sh-hint">Only jobs that pass every requirement are ranked. These are relative; they don&apos;t need to add to 100 (now {total}).</p>
        {(Object.keys(WEIGHT_LABEL) as (keyof Weights)[]).map((k) => (
          <Field key={k} label={`${WEIGHT_LABEL[k]}: ${w[k]}`}>
            <input type="range" min={0} max={40} step={5} value={w[k]} onChange={(e) => setWeights({ ...w, [k]: Number(e.target.value) })} className="tend-range" aria-label={WEIGHT_LABEL[k]} />
          </Field>
        ))}
        <div className="sh-row sh-wrap">
          {weights && <Btn disabled={busy} onClick={() => void run(async () => { await set({ weights }); setWeights(null); done(); })}>Keep these weights</Btn>}
          <Btn variant="ghost" disabled={busy} onClick={() => void run(async () => { await set({ weights: DEFAULT_WEIGHTS }); setWeights(null); done(); })}>Back to the plan&apos;s weights</Btn>
        </div>
      </Card>

      <Card>
        <h2 className="sh-h2">Searching</h2>
        <Field label="Search on a schedule" hint="Off until the matching has proven itself. When on, it searches, rechecks the jobs you're keeping, and sends one quiet note only when a new job looks strong.">
          <select className="sh-input" value={s.frequency} onChange={(e) => void run(async () => { await set({ frequency: e.target.value as typeof s.frequency }); done(); })}>
            <option value="off">Off: I&apos;ll search when I want</option>
            <option value="daily">Once a day</option>
            <option value="weekly">Once a week</option>
          </select>
        </Field>
        <Field label="Extra title words to look for" hint="Comma separated. Added to the built in list (documentation, operations, order processing, quality, claims, records, and more).">
          <input className="sh-input" defaultValue={s.keywords.join(", ")} onBlur={(e) => { const k = e.target.value.split(",").map((x) => x.trim()).filter(Boolean); if (k.join(",") !== s.keywords.join(",")) void run(async () => { await set({ keywords: k }); done(); }); }} />
        </Field>
        <h3 className="sh-h3">Follow a company</h3>
        <p className="sh-hint">Paste a link to a company&apos;s careers page, or to any one of its job listings, and the Lookout will read that company&apos;s own job board every search. Works for companies using Greenhouse, Lever, Ashby, Workable, SmartRecruiters, or Recruitee (most job links show one of those names in the address).</p>
        <div className="sh-row sh-wrap">
          <input className="sh-input" value={follow} maxLength={500} onChange={(e) => setFollow(e.target.value)} placeholder="https://jobs.lever.co/companyname" aria-label="Careers page link" />
          <Btn disabled={busy || !follow.trim()} onClick={() => void run(async () => { const r = await addBoard({ url: follow }); setFollow(""); setFollowNote(r.added ? `Following it now (${r.label}). It's read at the next search.` : "Already following that one; it's switched on."); })}>Follow</Btn>
        </div>
        {followNote && <Note>{followNote}</Note>}

        {(["boards", "employers"] as const).map((group) => {
          const list = s.sources.map((x, i) => ({ x, i })).filter(({ x }) => (EMPLOYER_KINDS.includes(x.kind as SourceKind) ? "employers" : "boards") === group);
          return (
            <div key={group}>
              <h3 className="sh-h3">{group === "boards" ? `Job sites (${list.filter(({ x }) => x.enabled).length} on)` : `Companies followed (${list.filter(({ x }) => x.enabled).length} on)`}</h3>
              {group === "boards" && <p className="sh-hint">Remote job sites with open listing feeds. Indeed, LinkedIn, Glassdoor, and ZipRecruiter don&apos;t allow automated reading; paste jobs from there with Add a job.</p>}
              {list.length === 0 && <p className="sh-muted">None yet.</p>}
              {list.map(({ x, i }) => (
                <div key={`${x.kind}:${x.token}`} className="sh-row sh-wrap lo-entry">
                  <Toggle checked={x.enabled} onChange={(enabled) => void run(async () => { await set({ sources: s.sources.map((y, j) => (j === i ? { ...y, enabled } : y)) }); })} label={x.name} hint={`${SOURCE_KIND_LABEL[x.kind as SourceKind] ?? x.kind} · ${x.token}`} />
                  <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => set({ sources: s.sources.filter((_, j) => j !== i) }))}>Remove</button>
                </div>
              ))}
            </div>
          );
        })}
        <details className="mt-3">
          <summary className="sh-link">Add a source by hand</summary>
          <div className="sh-row sh-wrap mt-3">
            <select className="sh-input" value={src.kind} onChange={(e) => setSrc({ ...src, kind: e.target.value as SourceKind })} aria-label="Kind of source">
              {(Object.keys(SOURCE_KIND_LABEL) as SourceKind[]).map((k) => <option key={k} value={k}>{SOURCE_KIND_LABEL[k]}</option>)}
            </select>
            <input className="sh-input" value={src.token} maxLength={80} onChange={(e) => setSrc({ ...src, token: e.target.value })} placeholder={EMPLOYER_KINDS.includes(src.kind) ? "board name" : "category or search words"} aria-label="Board name or search" />
            <input className="sh-input" value={src.name} maxLength={80} onChange={(e) => setSrc({ ...src, name: e.target.value })} placeholder="What to call it" aria-label="Name" />
            <Btn disabled={busy || !src.token.trim() || !src.name.trim()} onClick={() => void run(async () => { await set({ sources: [...s.sources, { ...src, enabled: true }] }); setSrc({ kind: src.kind, token: "", name: "" }); done(); })}>Add source</Btn>
          </div>
        </details>
      </Card>

      <Card>
        <h2 className="sh-h2">Privacy</h2>
        {owner ? (
          <>
            <Toggle checked={s.partnerAccess} onChange={(partnerAccess) => void run(async () => { await set({ partnerAccess }); done(); })} label={`${status.partnerName ?? "Your partner"} can see and help with this search`} hint="On unless you turn it off. They can add jobs, check facts, upload a resume, and edit drafts. Answers and history they write wait for your confirmation. Approving, privacy, and deleting stay yours." />
            <Toggle checked={s.allowHealthDisclosure} onChange={(allowHealthDisclosure) => void run(async () => { await set({ allowHealthDisclosure }); done(); })} label="Allow health or accommodation details in applications" hint="Off means they never appear in a resume, letter, or answer, and the checker blocks any document that mentions them." />
          </>
        ) : (
          <p className="sh-muted">Privacy settings belong to the person looking for work.</p>
        )}
      </Card>

      {owner && (
        <Card>
          <h2 className="sh-h2">This search&apos;s data</h2>
          <p className="sh-hint">Everything here is stored in The Shire&apos;s private database, reachable only through signed in functions that check it&apos;s yours. Job listings are fetched from public posting pages; your profile is sent to the writing model only to draft your documents.</p>
          <div className="sh-row sh-wrap">
            <Btn variant="secondary" disabled={busy} onClick={() => void run(async () => { const all = await convex.query(api.lookout.data.exportAll, {}); download(new Blob([JSON.stringify(all, null, 2)], { type: "application/json" }), `lookout_${new Date().toISOString().slice(0, 10)}.json`); })}>Download everything</Btn>
            <Btn variant="ghost" disabled={busy} onClick={() => { if (window.confirm("Delete everything in this search: the interview, work history, every job, document, and application record? This can't be undone.")) void run(async () => { await deleteSearch({ confirm: "delete" }); router.push("/"); }); }}>Delete this search and everything in it</Btn>
          </div>
          {status.partnerName && !status.partnerHas && (
            <div className="lo-entry">
              <p className="sh-hint">Started this search on the wrong account? It can become {status.partnerName}&apos;s, with everything in it. {status.partnerName} will then confirm the history and answers.</p>
              <Btn variant="ghost" disabled={busy} onClick={() => { if (window.confirm(`Give this whole search to ${status.partnerName}? You'll still be able to see and help with it.`)) void run(async () => { await give({ confirm: "give" }); done(); }); }}>Give this search to {status.partnerName}</Btn>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
