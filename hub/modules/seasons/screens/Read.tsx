"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, LinkBtn, PageTitle, Spinner } from "@/core/ui";

export function Read({ id }: { id: string }) {
  const report = useQuery(api.seasons.reports.get, { id: id as Id<"seasonReports"> });
  if (report === undefined) return <Spinner />;
  if (report === null) {
    return (
      <div className="sh-container sh-narrow">
        <Card>
          <p>That season isn&apos;t here any more.</p>
          <LinkBtn href="/seasons" variant="ghost">Back to Seasons</LinkBtn>
        </Card>
      </div>
    );
  }
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title={report.title} subtitle={`${report.periodStart} to ${report.periodEnd}`} action={<LinkBtn href={report.kind === "ours" ? "/seasons/ours" : "/seasons"} variant="ghost">All seasons</LinkBtn>} />
      <Card>
        <div className="se-body">{report.body}</div>
      </Card>
      <p className="sh-hint">Written by the coach from plain counts. {report.kind === "ours" ? "Both of you see exactly this page." : "Only you see this."}</p>
    </div>
  );
}
