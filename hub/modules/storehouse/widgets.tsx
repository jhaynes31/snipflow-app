"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { monthKeyOf } from "@/convex/storehouse/pure";

/** The Storehouse's Today line: a bill due within three days, or a Sit-Down not yet agreed early in the month. */
export function StorehouseToday() {
  const [key] = useState(() => monthKeyOf(new Date()));
  const [dayOfMonth] = useState(() => new Date().getDate());
  const debts = useQuery(api.storehouse.money.debts);
  const month = useQuery(api.storehouse.money.month, { month: key });
  const soon = (debts ?? []).filter((d) => d.status === "open" && d.dueDay && d.dueDay >= dayOfMonth && d.dueDay <= dayOfMonth + 3);
  if (soon.length > 0) {
    return (
      <Link href="/storehouse/debts" className="sh-card block no-underline">
        <strong>The Storehouse:</strong> {soon.map((d) => `${d.name} is due the ${d.dueDay}th`).join("; ")}.
      </Link>
    );
  }
  if (month && dayOfMonth <= 7 && (month.sitDown?.agreedBy.length ?? 0) < 2) {
    return (
      <Link href="/storehouse" className="sh-card block no-underline">
        <strong>The Storehouse:</strong> this month&apos;s Sit-Down is open.
      </Link>
    );
  }
  return null;
}
