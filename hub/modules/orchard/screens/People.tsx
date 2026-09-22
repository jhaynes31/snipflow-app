"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { LAYERS, PEARLS_DEFAULT, TRUTH } from "@/convex/orchard/pure";
import { CrisisNotice } from "@/core/safety/CrisisNotice";
import { Btn, Card, ErrorNote, Field, Note, PageTitle, Spinner, useAction } from "@/core/ui";

/**
 * People, by layer. Adding someone is the moment the old pattern likes to
 * run, so it asks for the story you're telling yourself and the pearls
 * you're holding, and books a date to re-read the story.
 */
export function People() {
  const data = useQuery(api.orchard.entries.people);
  const add = useMutation(api.orchard.entries.addPerson);
  const { busy, error, run } = useAction();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [howMet, setHowMet] = useState("");
  const [metDay, setMetDay] = useState("");
  const [story, setStory] = useState("");
  const [pearls, setPearls] = useState<string[]>(PEARLS_DEFAULT);
  if (!data) return <Spinner />;
  const growing = data.people.filter((p) => p.state === "growing");
  const resting = data.people.filter((p) => p.state !== "growing");
  const due = growing.filter((p) => p.storyReadDay && p.storyReadDay <= data.today);

  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="The Orchard" subtitle="Friendships that grow slowly. You don't eat the fruit the day you plant the tree." />
      <p className="or-truth">{TRUTH}</p>

      {due.length > 0 && (
        <Card tone="alt">
          <p className="sh-eyebrow">Time to re-read a story</p>
          {due.map((p) => (
            <p key={p._id}>
              You wrote a story about <Link href={`/orchard/person/${p._id}`} className="sh-link">{p.name}</Link> a month ago. Read it beside what they&apos;ve actually shown.
            </p>
          ))}
        </Card>
      )}

      <Card>
        {!open ? (
          <Btn onClick={() => setOpen(true)}>I met someone</Btn>
        ) : (
          <>
            <h2 className="sh-h2">Someone new</h2>
            <p className="sh-muted">Good. And this is exactly the moment the old pattern likes to run: they get a halo, and you share deep things early because it feels so safe. Keep the excitement, and keep you.</p>
            <Field label="Their name"><input className="sh-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></Field>
            <Field label="How you met (optional)"><input className="sh-input" value={howMet} onChange={(e) => setHowMet(e.target.value)} maxLength={200} /></Field>
            <Field label="When you met" hint="Today if you leave it blank. Days and weeks, not how it feels.">
              <input className="sh-input" type="date" value={metDay} onChange={(e) => setMetDay(e.target.value)} />
            </Field>
            <Field label="The story I'm already telling myself" hint="Write it down so it stops running in the dark. &ldquo;We&apos;re going to be best friends. She gets me.&rdquo; You&apos;ll re-read it in a month beside the facts.">
              <textarea className="sh-input sh-textarea" rows={3} value={story} onChange={(e) => setStory(e.target.value)} maxLength={1500} />
            </Field>
            <p className="sh-eyebrow">Pearls I'm holding until it's earned</p>
            <div className="sh-chips">
              {PEARLS_DEFAULT.map((p) => (
                <button key={p} type="button" className="sh-chip" aria-pressed={pearls.includes(p)} onClick={() => setPearls((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]))}>{p}</button>
              ))}
            </div>
            <CrisisNotice texts={[story]} />
            <ErrorNote error={error} />
            <div className="sh-choices mt-3">
              <Btn disabled={busy || !name.trim()} onClick={() => void run(async () => { await add({ name, howMet: howMet || undefined, metDay: metDay || undefined, story: story || undefined, pearls }); setName(""); setHowMet(""); setMetDay(""); setStory(""); setPearls(PEARLS_DEFAULT); setOpen(false); })}>Plant it</Btn>
              <Btn variant="ghost" onClick={() => setOpen(false)}>Not now</Btn>
            </div>
          </>
        )}
      </Card>

      {[...LAYERS].reverse().map((layer) => {
        const here = growing.filter((p) => p.layer === layer.index);
        if (here.length === 0) return null;
        return (
          <Card key={layer.index}>
            <h2 className="sh-h2">{layer.name}</h2>
            <p className="sh-muted">{layer.meaning}</p>
            {here.map((p) => (
              <Link key={p._id} href={`/orchard/person/${p._id}`} className="or-person">
                <span><strong>{p.name}</strong>{p.visibility === "shared" ? <span className="sh-muted"> · shared</span> : null}</span>
                <span className="sh-muted">{p.daysKnown} days</span>
              </Link>
            ))}
          </Card>
        );
      })}
      {growing.length === 0 && (
        <Card>
          <p className="sh-muted">No one planted yet. Old friends belong here too; add them at the layer they&apos;ve earned.</p>
        </Card>
      )}
      {resting.length > 0 && (
        <Card tone="alt">
          <h2 className="sh-h2">Resting, or released</h2>
          {resting.map((p) => (
            <Link key={p._id} href={`/orchard/person/${p._id}`} className="or-person">
              <span>{p.name}</span>
              <span className="sh-muted">{p.state}</span>
            </Link>
          ))}
        </Card>
      )}
      <Note>
        Everything here is yours alone unless you share a person with your partner on purpose. Then they see the name, the layer, and only the notes you mark shared, so the two of you can compare what each has seen of a mutual friend.
      </Note>
    </div>
  );
}
