"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { DEFAULT_KINDS } from "@/convex/tend/pure";
import { COPY } from "@/core/copy/strings";
import { Btn, ErrorNote, Note, useAction } from "@/core/ui";

/**
 * How to love this person right now: their own guidance for the kinds of
 * hard they picked (Do / Say / Skip / Pray) and their Love Menu to pick
 * from. Everything here was written and shared by the sender.
 */
export function GuidanceCard({ headsUpId, senderName }: { headsUpId: Id<"headsUps">; senderName: string }) {
  const data = useQuery(api.tend.guidance.forHeadsUp, { headsUpId });
  const did = useMutation(api.tend.loveMenu.did);
  const { busy, error, run } = useAction();
  const [done, setDone] = useState<string | null>(null);
  if (!data) return null;

  const kinds = data.kinds.map((k) => DEFAULT_KINDS.find((d) => d.key === k)?.label ?? k);

  return (
    <section className="sh-card tend-guidance" aria-label={`How to love ${senderName} right now`}>
      <h2 className="sh-h2">How to love {senderName} right now</h2>
      {kinds.length > 0 && <p className="sh-muted">{senderName} said: {kinds.join(", ").toLowerCase()}. What would help: {COPY.help[data.help].toLowerCase()}.</p>}
      {data.entries.length === 0 ? (
        <p className="sh-muted">{senderName} hasn&apos;t written guidance for this kind of day yet. Their manual and the card above are the best guide.</p>
      ) : (
        data.entries.map((g) => (
          <article key={g._id} className="tend-guidance-entry">
            <h3 className="sh-h3">When {senderName} is {g.title.toLowerCase()}</h3>
            <dl className="sh-suggestions">
              {g.do && (
                <div>
                  <dt>Do</dt>
                  <dd>{g.do}</dd>
                </div>
              )}
              {g.say && (
                <div>
                  <dt>Say</dt>
                  <dd>&ldquo;{g.say}&rdquo;</dd>
                </div>
              )}
              {g.skip && (
                <div>
                  <dt>Skip</dt>
                  <dd>{g.skip}</dd>
                </div>
              )}
              {data.showPray && g.pray && (
                <div>
                  <dt>Pray</dt>
                  <dd>{g.pray}</dd>
                </div>
              )}
            </dl>
          </article>
        ))
      )}

      {data.loveMenu.length > 0 && (
        <div className="tend-menu">
          <h3 className="sh-h3">{senderName}&apos;s Love Menu</h3>
          <p className="sh-hint">Pick one and do it. {senderName} sees that you did.</p>
          <ErrorNote error={error} />
          {done && <Note>Done: {done}. {senderName} will see it.</Note>}
          <div className="sh-chips">
            {data.loveMenu.map((m) => (
              <Btn
                key={m._id}
                variant="secondary"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await did({ itemId: m._id, headsUpId });
                    setDone(m.text);
                  })
                }
              >
                {m.text}
              </Btn>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
