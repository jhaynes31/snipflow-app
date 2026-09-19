"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { readTendSettings } from "@/convex/tend/pure";
import { useHub } from "@/core/shell/HubContext";
import { Card, PageTitle, Spinner } from "@/core/ui";
import { orderTools } from "../tools/registry";

/** The tool library, with the tools that have helped this person first. */
export function MyTools() {
  const { profile } = useHub();
  const stats = useQuery(api.tend.tools.stats);
  if (!stats) return <Spinner />;
  const settings = readTendSettings(profile.moduleSettings);
  const tools = orderTools(stats, settings.faith);
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="My tools" subtitle="Every one has a two-minute version. The ones that have helped you sit first." />
      <div className="sh-tiles">
        {tools.map((t) => (
          <Link key={t.key} href={`/tend/tools/${t.key}`} className="sh-tile">
            <span className="sh-tile-name">{t.name}</span>
            <span className="sh-tile-tagline">{t.forWhen}</span>
            <span className="sh-hint">{t.twoMinute}</span>
          </Link>
        ))}
      </div>
      <Card tone="alt">
        <p className="sh-muted">
          Your log and chart are under <Link href="/tend/log" className="sh-link">My log</Link>. Talk It Out, the private chat with the coach, and your safety plan arrive with the AI coach in the next build phase.
        </p>
      </Card>
    </div>
  );
}
