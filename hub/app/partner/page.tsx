"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { sectionMeta } from "@/core/manual/sections";
import { useHub } from "@/core/shell/HubContext";
import { Card, PageTitle, Spinner } from "@/core/ui";

/** The partner's manual, only the parts they chose to share. */
export default function PartnerPage() {
  const { partner } = useHub();
  const sections = useQuery(api.manual.partners);
  if (!partner) {
    return (
      <div className="sh-container sh-narrow">
        <PageTitle title="Your partner" />
        <p className="sh-muted">They haven&apos;t signed in yet. Once they do, whatever they choose to share shows here.</p>
      </div>
    );
  }
  if (!sections) return <Spinner />;
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title={`${partner.displayName}'s manual`} subtitle="Only the sections they chose to share. Their private sections don't exist here." />
      {sections.length === 0 ? (
        <Card>
          <p className="sh-muted">{partner.displayName} hasn&apos;t shared any sections yet, and that&apos;s fine.</p>
        </Card>
      ) : (
        <div className="sh-stack">
          {sections.map((s) => {
            const meta = sectionMeta(s.key);
            return (
              <Card key={s.key}>
                <h2 className="sh-h3">{meta?.title ?? s.key}</h2>
                {s.summaryOnly && <p className="sh-hint">Summary only.</p>}
                <p className="sh-quote">{s.body}</p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
