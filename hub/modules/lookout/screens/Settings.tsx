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
        <Toggle checked={!s.allowDegree} onChange={(on) => void run(async () => { await set({ allowDegree: !on }); done(); })} label="Leave out jobs that require a bachelor's degree or higher" hint="On: jobs that make a bachelor's, master's, or other four year degree a must are left out of searches, and ones already found are set aside with the reason. A degree that's only preferred, or that equivalent experience can replace, doesn't count." />
        <Toggle checked={s.allowSenior} onChange={(allowSenior) => void run(async () => { await set({ allowSenior }); done(); })} label="Include Senior and Lead titles" hint="Off: titles with Senior, Sr., Lead, or level III and up are left out, and so are jobs the site or the listing marks as senior level (and federal grade GS-11 and up). Found ones already listed move to Earlier finds. On: those are included (like the Senior Specialist, Customer Care role at Wesco). Manager, supervisor, director, and jobs that manage people are always left out." />
        <Toggle checked={s.requirePay} onChange={(requirePay) => void run(async () => { await set({ requirePay }); done(); })} label="Only bring in jobs that state their pay" hint="Found jobs that don't say what they pay are left out of searches, and ones already found move to Earlier finds. Jobs you add by hand are always kept." />
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
        <p className="sh-hint">Paste a link to a company&apos;s careers page, or to any one of its job listings, and the Lookout will read that company&apos;s own job board every search. Works for companies using Greenhouse, Lever, Ashby, Workday, Workable, SmartRecruiters, BambooHR, Breezy, or Recruitee (most job links show one of those names in the address).</p>
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

      <UsajobsCard email={s.usajobsEmail} />
      <AdzunaCard appId={s.adzunaAppId} />
      <JoobleCard connected={s.joobleConnected} />

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

/**
 * USAJOBS: federal jobs, read with the free API key from
 * developer.usajobs.gov. The key is saved on the server and never shown
 * again; only the email it was sent to is shown.
 */
function UsajobsCard({ email }: { email: string | null }) {
  const save = useMutation(api.lookout.data.setUsajobs);
  const { busy, error, run } = useAction();
  const [f, setF] = useState({ email: email ?? "", key: "" });
  const [changing, setChanging] = useState(!email);
  const [note, setNote] = useState<string | null>(null);
  return (
    <Card>
      <h2 className="sh-h2">USAJOBS (federal jobs)</h2>
      {email && !changing ? (
        <>
          <p className="lo-verified">Connected with {email}.</p>
          <p className="sh-hint">Remote federal jobs are searched for claims, customer service (often called Contact Representative), administrative, records, and benefits work. Most federal jobs are full time, so the hours check still applies.</p>
          <div className="sh-row sh-wrap">
            <Btn variant="secondary" onClick={() => setChanging(true)}>Change the key</Btn>
            <Btn variant="ghost" disabled={busy} onClick={() => { if (window.confirm("Disconnect USAJOBS?")) void run(async () => { await save({ email: "", key: "" }); setF({ email: "", key: "" }); setChanging(true); }); }}>Disconnect</Btn>
          </div>
        </>
      ) : (
        <>
          <p className="sh-hint">Ask USAJOBS for a free key at <a className="sh-link" href="https://developer.usajobs.gov/apirequest/" target="_blank" rel="noopener noreferrer">developer.usajobs.gov/apirequest</a>. They email it to you. Then enter it here, with the email address it was sent to. It&apos;s kept on the server and never shown again.</p>
          <div className="sh-stack-sm">
            <Field label="Email the key was sent to"><input className="sh-input" type="email" value={f.email} maxLength={200} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="off" /></Field>
            <Field label="USAJOBS API key"><input className="sh-input" type="password" value={f.key} maxLength={200} onChange={(e) => setF({ ...f, key: e.target.value })} autoComplete="off" placeholder="Paste the key from the email" /></Field>
          </div>
          <ErrorNote error={error} />
          <div className="sh-row sh-wrap">
            <Btn disabled={busy || !f.email.trim() || !f.key.trim()} onClick={() => void run(async () => { await save({ email: f.email, key: f.key }); setF({ ...f, key: "" }); setChanging(false); setNote("Saved. USAJOBS is searched from the next search on; the search log will show what it returned."); })}>Save and connect</Btn>
            {email && <Btn variant="ghost" onClick={() => setChanging(false)}>Cancel</Btn>}
          </div>
        </>
      )}
      {note && <Note>{note}</Note>}
    </Card>
  );
}

/**
 * Adzuna: one search across many job sites and company pages, read with
 * the free app ID and key from developer.adzuna.com. The key is saved on
 * the server and never shown again.
 */
function AdzunaCard({ appId }: { appId: string | null }) {
  const save = useMutation(api.lookout.data.setAdzuna);
  const { busy, error, run } = useAction();
  const [f, setF] = useState({ appId: appId ?? "", key: "" });
  const [changing, setChanging] = useState(!appId);
  const [note, setNote] = useState<string | null>(null);
  return (
    <Card>
      <h2 className="sh-h2">Adzuna (jobs from many sites)</h2>
      {appId && !changing ? (
        <>
          <p className="lo-verified">Connected (app ID {appId}).</p>
          <p className="sh-hint">Searched for remote customer service, claims, data entry, administrative, billing, and order processing jobs posted in the last 30 days. When Adzuna only estimates the pay, the job counts as not stating it.</p>
          <div className="sh-row sh-wrap">
            <Btn variant="secondary" onClick={() => setChanging(true)}>Change the key</Btn>
            <Btn variant="ghost" disabled={busy} onClick={() => { if (window.confirm("Disconnect Adzuna?")) void run(async () => { await save({ appId: "", key: "" }); setF({ appId: "", key: "" }); setChanging(true); }); }}>Disconnect</Btn>
          </div>
        </>
      ) : (
        <>
          <p className="sh-hint">Sign in at <a className="sh-link" href="https://developer.adzuna.com/" target="_blank" rel="noopener noreferrer">developer.adzuna.com</a> and open the page that lists your application (often called Dashboard or API Access Details). Copy the Application ID and the Application Key into the boxes below. The key is kept on the server and never shown again.</p>
          <div className="sh-stack-sm">
            <Field label="Application ID"><input className="sh-input" value={f.appId} maxLength={40} onChange={(e) => setF({ ...f, appId: e.target.value })} autoComplete="off" /></Field>
            <Field label="Application Key"><input className="sh-input" type="password" value={f.key} maxLength={80} onChange={(e) => setF({ ...f, key: e.target.value })} autoComplete="off" placeholder="Paste the key" /></Field>
          </div>
          <ErrorNote error={error} />
          <div className="sh-row sh-wrap">
            <Btn disabled={busy || !f.appId.trim() || !f.key.trim()} onClick={() => void run(async () => { await save({ appId: f.appId, key: f.key }); setF({ ...f, key: "" }); setChanging(false); setNote("Saved. Adzuna is searched from the next search on; the search log will show what it returned."); })}>Save and connect</Btn>
            {appId && <Btn variant="ghost" onClick={() => setChanging(false)}>Cancel</Btn>}
          </div>
        </>
      )}
      {note && <Note>{note}</Note>}
    </Card>
  );
}

/**
 * Jooble: one search across many job sites, read with the free API key
 * from jooble.org/api/about. The key is saved on the server and never shown again.
 */
function JoobleCard({ connected }: { connected: boolean }) {
  const save = useMutation(api.lookout.data.setJooble);
  const { busy, error, run } = useAction();
  const [key, setKey] = useState("");
  const [changing, setChanging] = useState(!connected);
  const [note, setNote] = useState<string | null>(null);
  return (
    <Card>
      <h2 className="sh-h2">Jooble (jobs from many sites)</h2>
      {connected && !changing ? (
        <>
          <p className="lo-verified">Connected.</p>
          <p className="sh-hint">Searched for remote customer service, customer support, claims, data entry, billing, administrative, order processing, insurance verification, and email and chat support jobs in the United States.</p>
          <div className="sh-row sh-wrap">
            <Btn variant="secondary" onClick={() => setChanging(true)}>Change the key</Btn>
            <Btn variant="ghost" disabled={busy} onClick={() => { if (window.confirm("Disconnect Jooble?")) void run(async () => { await save({ key: "" }); setChanging(true); }); }}>Disconnect</Btn>
          </div>
        </>
      ) : (
        <>
          <p className="sh-hint">Ask Jooble for a free key at <a className="sh-link" href="https://jooble.org/api/about" target="_blank" rel="noopener noreferrer">jooble.org/api/about</a> (fill in the short form; the key is shown or emailed to you). Paste it below. It&apos;s kept on the server and never shown again.</p>
          <Field label="Jooble API key"><input className="sh-input" type="password" value={key} maxLength={80} onChange={(e) => setKey(e.target.value)} autoComplete="off" placeholder="Paste the key" /></Field>
          <ErrorNote error={error} />
          <div className="sh-row sh-wrap">
            <Btn disabled={busy || !key.trim()} onClick={() => void run(async () => { await save({ key }); setKey(""); setChanging(false); setNote("Saved. Jooble is searched from the next search on; the search log will show what it returned."); })}>Save and connect</Btn>
            {connected && <Btn variant="ghost" onClick={() => setChanging(false)}>Cancel</Btn>}
          </div>
        </>
      )}
      {note && <Note>{note}</Note>}
    </Card>
  );
}
