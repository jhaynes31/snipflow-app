"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { COPY, type HelpKind } from "@/core/copy/strings";
import { MANUAL_SECTIONS, suggestionLines } from "@/core/manual/sections";
import { useHub } from "@/core/shell/HubContext";
import { Btn, Card, ErrorNote, Field, LinkBtn, PageTitle, Toggle, useAction } from "@/core/ui";

const HELP: HelpKind[] = ["space", "quietPresence", "practicalHelp", "words", "dontFixIt"];
const PRESETS = ["Rough day", "Running on empty", "Anxious and tight", "A bit off today", "Not okay"];

/**
 * Compose a heads-up. The preview at the bottom is exactly the card the
 * partner will see; sending it is the explicit share.
 */
function ComposeForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { partner } = useHub();
  const manual = useQuery(api.manual.mine);
  const send = useMutation(api.headsUps.send);
  const { busy, error, run } = useAction();

  const [statusLine, setStatusLine] = useState(params.get("preset") === "low" ? "Not okay" : "");
  const [help, setHelp] = useState<HelpKind>("quietPresence");
  const [include, setInclude] = useState({ do: true, say: true, skip: true });
  const [urgent, setUrgent] = useState(false);
  const [addToCalendar, setAddToCalendar] = useState(false);

  const drawn = useMemo(() => {
    const out = { do: [] as string[], say: [] as string[], skip: [] as string[] };
    if (!manual) return out;
    for (const meta of MANUAL_SECTIONS) {
      if (!meta.headsUpGroup) continue;
      const section = manual.find((s) => s.key === meta.key);
      if (!section?.body) continue;
      out[meta.headsUpGroup].push(...suggestionLines(section.body, 2));
    }
    return out;
  }, [manual]);

  const chosen = {
    do: include.do ? drawn.do : [],
    say: include.say ? drawn.say : [],
    skip: include.skip ? drawn.skip : [],
  };

  if (!partner) {
    return (
      <div className="sh-container sh-narrow">
        <PageTitle title={COPY.sendHeadsUp} />
        <p>Your partner hasn&apos;t signed in yet, so there&apos;s no one to send this to. Once they have, this screen works.</p>
        <LinkBtn href="/" variant="secondary">
          Back home
        </LinkBtn>
      </div>
    );
  }

  return (
    <div className="sh-container sh-narrow">
      <PageTitle title={COPY.sendHeadsUp} subtitle={`To ${partner.displayName}. They see exactly the card previewed below.`} />
      <form
        className="sh-stack"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            await send({ statusLine, help, suggestions: chosen, urgent, addToCalendar });
            router.push("/");
          });
        }}
      >
        <Card>
          <Field label="How today is, in your words">
            <input className="sh-input" value={statusLine} onChange={(e) => setStatusLine(e.target.value)} maxLength={140} required />
          </Field>
          <div className="sh-chips" aria-label="Quick phrases">
            {PRESETS.map((p) => (
              <button key={p} type="button" className="sh-chip" onClick={() => setStatusLine(p)}>
                {p}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <fieldset>
            <legend className="sh-label">What would help</legend>
            <div className="sh-radio-list">
              {HELP.map((h) => (
                <label key={h} className={`sh-radio ${help === h ? "is-on" : ""}`}>
                  <input type="radio" name="help" value={h} checked={help === h} onChange={() => setHelp(h)} />
                  <span>
                    <strong>{COPY.help[h]}</strong>
                    <span className="sh-hint">{COPY.helpDescription[h]}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </Card>

        <Card>
          <h2 className="sh-h2">Do / Say / Skip</h2>
          {drawn.do.length + drawn.say.length + drawn.skip.length === 0 ? (
            <p className="sh-muted">
              These lines come from your user manual (&ldquo;What helps,&rdquo; &ldquo;How to love me when I&apos;m low,&rdquo;
              &ldquo;Communication needs,&rdquo; and &ldquo;What makes it worse&rdquo;). Yours is empty for now, so the card goes without them.
            </p>
          ) : (
            <div className="sh-stack-sm">
              {(["do", "say", "skip"] as const).map((g) =>
                drawn[g].length ? (
                  <Toggle
                    key={g}
                    checked={include[g]}
                    onChange={(v) => setInclude({ ...include, [g]: v })}
                    label={`Include "${g === "do" ? "Do" : g === "say" ? "Say" : "Skip"}": ${drawn[g].join(" · ")}`}
                  />
                ) : null,
              )}
            </div>
          )}
        </Card>

        <Card>
          <div className="sh-stack-sm">
            <Toggle checked={urgent} onChange={setUrgent} label="Urgent" hint="Marks the card as urgent. It's the only thing that may break quiet hours." />
            <Toggle
              checked={addToCalendar}
              onChange={setAddToCalendar}
              label={`Add a one-off event to ${partner.displayName}'s calendar`}
              hint="Appears in their calendar feed while the card is open."
            />
          </div>
        </Card>

        <Card tone="alt" className="sh-preview">
          <p className="sh-eyebrow">Preview. This is what {partner.displayName} will see.</p>
          <p className="sh-headsup-status">&ldquo;{statusLine || "…"}&rdquo;</p>
          <p>
            <strong>What would help:</strong> {COPY.help[help]}. {COPY.helpDescription[help]}
          </p>
          {(["do", "say", "skip"] as const).map((g) =>
            chosen[g].length ? (
              <p key={g}>
                <strong>{g === "do" ? "Do" : g === "say" ? "Say" : "Skip"}:</strong> {chosen[g].join(" · ")}
              </p>
            ) : null,
          )}
          {urgent && <p className="sh-muted">Marked urgent.</p>}
        </Card>

        <ErrorNote error={error} />
        <div className="sh-choices">
          <Btn type="submit" big disabled={busy || !statusLine.trim()}>
            Send to {partner.displayName}
          </Btn>
          <LinkBtn href="/" variant="ghost">
            Cancel
          </LinkBtn>
        </div>
      </form>
    </div>
  );
}

export default function NewHeadsUpPage() {
  return (
    <Suspense fallback={null}>
      <ComposeForm />
    </Suspense>
  );
}
