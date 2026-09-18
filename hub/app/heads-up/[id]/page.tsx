"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { COPY } from "@/core/copy/strings";
import { HeadsUpCard, SuggestionList } from "@/core/shell/HeadsUpCard";
import { useHub } from "@/core/shell/HubContext";
import { Btn, Card, ErrorNote, LinkBtn, PageTitle, Spinner, timeAgo, useAction } from "@/core/ui";

export default function HeadsUpPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { profile, partner } = useHub();
  const card = useQuery(api.headsUps.get, { id: id as Id<"headsUps"> });
  const close = useMutation(api.headsUps.close);
  const remove = useMutation(api.headsUps.remove);
  const { busy, error, run } = useAction();

  if (card === undefined) return <Spinner />;
  if (card === null) {
    return (
      <div className="sh-container sh-narrow">
        <PageTitle title="That card isn't here." />
        <p className="sh-muted">It may have been deleted by the person who sent it.</p>
        <LinkBtn href="/" variant="secondary">
          Back home
        </LinkBtn>
      </div>
    );
  }

  const partnerName = partner?.displayName ?? "your partner";
  if (card.receiverId === profile._id) {
    return (
      <div className="sh-container sh-narrow">
        <PageTitle title={COPY.headsUp} />
        <HeadsUpCard card={card} senderName={partnerName} />
      </div>
    );
  }

  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Your heads-up" subtitle={`Sent ${timeAgo(card.createdAt)}.`} />
      <Card>
        <p className="sh-headsup-status">&ldquo;{card.statusLine}&rdquo;</p>
        <p>
          <strong>What would help:</strong> {COPY.help[card.help]}.
        </p>
        <SuggestionList card={card} />
        <p className="sh-muted">
          {card.status === "open" && `${partnerName} hasn't responded yet.`}
          {card.status === "responded" && card.response && `${partnerName} ${COPY.responseSeen[card.response]}`}
          {card.status === "closed" && "Closed."}
        </p>
        <ErrorNote error={error} />
        <div className="sh-choices">
          {card.status !== "closed" && (
            <Btn variant="secondary" disabled={busy} onClick={() => void run(() => close({ id: card._id }))}>
              Close it
            </Btn>
          )}
          <Btn
            variant="ghost"
            disabled={busy}
            onClick={() => {
              if (!window.confirm("Delete this heads-up for both of you? This can't be undone.")) return;
              void run(async () => {
                await remove({ id: card._id });
                router.push("/");
              });
            }}
          >
            Delete for both of us
          </Btn>
        </div>
      </Card>
    </div>
  );
}
