"use client";

import Link from "next/link";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { COPY, type ResponseKind } from "@/core/copy/strings";
import { Btn, ErrorNote, timeAgo, useAction } from "@/core/ui";

const RESPONSES: ResponseKind[] = ["onIt", "hug", "talkLater"];

/**
 * A heads-up as the receiver sees it. Stays on the home screen until they
 * respond; after responding it stays until they clear it, so the sender's
 * message is never lost by accident.
 */
export function HeadsUpCard({ card, senderName }: { card: Doc<"headsUps">; senderName: string }) {
  const respond = useMutation(api.headsUps.respond);
  const dismiss = useMutation(api.headsUps.dismiss);
  const { busy, error, run } = useAction();

  return (
    <article className={`sh-card sh-headsup ${card.urgent ? "sh-headsup-urgent" : ""}`} aria-label={`Heads-up from ${senderName}`}>
      <header className="sh-headsup-head">
        <span className="sh-eyebrow">
          {senderName} · {timeAgo(card.createdAt)}
          {card.urgent && " · urgent"}
        </span>
        <Link href={`/heads-up/${card._id}`} className="sh-link">
          Open
        </Link>
      </header>
      <p className="sh-headsup-status">&ldquo;{card.statusLine}&rdquo;</p>
      <p>
        <strong>What would help:</strong> {COPY.help[card.help]}. {COPY.helpDescription[card.help]}
      </p>
      <SuggestionList card={card} />
      {card.kinds && card.kinds.length > 0 && (
        <p>
          <Link href="/tend/for-you" className="sh-link">
            How to love {senderName} right now
          </Link>
        </p>
      )}
      <ErrorNote error={error} />
      {card.status === "open" ? (
        <div className="sh-choices">
          {RESPONSES.map((r) => (
            <Btn key={r} variant={r === "onIt" ? "primary" : "secondary"} disabled={busy} onClick={() => void run(() => respond({ id: card._id, response: r }))}>
              {COPY.response[r]}
            </Btn>
          ))}
        </div>
      ) : (
        <div className="sh-row">
          <span className="sh-muted">You {COPY.responseSeen[card.response ?? "hug"]}</span>
          <Btn variant="ghost" disabled={busy} onClick={() => void run(() => dismiss({ id: card._id }))}>
            Clear from home
          </Btn>
        </div>
      )}
    </article>
  );
}

export function SuggestionList({ card }: { card: Doc<"headsUps"> }) {
  const groups: [string, string[]][] = [
    ["Do", card.suggestions.do],
    ["Say", card.suggestions.say],
    ["Skip", card.suggestions.skip],
  ];
  const any = groups.some(([, lines]) => lines.length > 0);
  if (!any) return null;
  return (
    <dl className="sh-suggestions">
      {groups.map(([label, lines]) =>
        lines.length ? (
          <div key={label}>
            <dt>{label}</dt>
            {lines.map((l, i) => (
              <dd key={i}>{l}</dd>
            ))}
          </div>
        ) : null,
      )}
    </dl>
  );
}
