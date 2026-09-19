"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useHub } from "@/core/shell/HubContext";

/** Kept Word's Today line: a word of mine due today or tomorrow, something waiting for my answer, or nothing. */
export function KeptWordToday() {
  const { profile } = useHub();
  const open = useQuery(api.keptWord.words.open);
  const asks = useQuery(api.keptWord.asks.list);
  if (!open) return null;
  if (open.heardForMe.length > 0) {
    return (
      <Link href="/kept-word" className="sh-card block no-underline">
        <strong>Kept Word:</strong> something you said is waiting for you to confirm.
      </Link>
    );
  }
  const waitingAsk = asks?.toMe.find((a) => !a.answer);
  if (waitingAsk) {
    return (
      <Link href="/kept-word/asks" className="sh-card block no-underline">
        <strong>Kept Word:</strong> an ask is waiting for your answer.
      </Link>
    );
  }
  const soon = open.words.find((w) => w.ownerId === profile._id && w.dueDay && w.dueDay <= open.today);
  if (soon) {
    return (
      <Link href="/kept-word" className="sh-card block no-underline">
        <strong>Kept Word:</strong> your word &ldquo;{soon.text}&rdquo; is due{soon.dueDay === open.today ? " today" : ""}.
      </Link>
    );
  }
  return null;
}
