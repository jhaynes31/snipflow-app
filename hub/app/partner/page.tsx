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
  const fromTable = useQuery(api.hearth.entries.sharedWithMe);
  const fromMantel = useQuery(api.mantel.sharedWithMe);
  const fromFelt = useQuery(api.felt.sharedWithMe);
  if (!partner) {
    return (
      <div className="sh-container sh-narrow">
        <PageTitle title="Your partner" />
        <p className="sh-muted">They haven&apos;t signed in yet. Once they do, whatever they choose to share shows here.</p>
      </div>
    );
  }
  if (!sections || !fromTable || !fromMantel || !fromFelt) return <Spinner />;
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
      {fromFelt.length > 0 && (
        <div className="sh-stack" style={{ marginTop: "1.5rem" }}>
          <h2 className="sh-h2">What {partner.displayName} felt</h2>
          <p className="sh-muted">Entries from the feelings wheel that {partner.displayName} chose to show you.</p>
          {fromFelt.map((f) => (
            <Card key={f._id}>
              <p className="sh-eyebrow">{new Date(f.createdAt).toLocaleDateString()}</p>
              {f.feelings.length > 0 && <p><strong>{f.feelings.join(", ")}</strong></p>}
              {f.body.map((b, i) => <p key={i} className="sh-muted">{b.area}{b.words.length ? `: ${b.words.join(", ")}` : ""}{b.note ? ` — ${b.note}` : ""}</p>)}
              {f.note && <p className="sh-quote">{f.note}</p>}
            </Card>
          ))}
        </div>
      )}
      {fromMantel.length > 0 && (
        <div className="sh-stack" style={{ marginTop: "1.5rem" }}>
          <h2 className="sh-h2">From {partner.displayName}&apos;s mantel</h2>
          <p className="sh-muted">Lines {partner.displayName} kept and chose to show you.</p>
          {fromMantel.map((m) => (
            <Card key={m._id}>
              <p className="sh-eyebrow">{m.speaker === "me" ? partner.displayName : m.speaker === "dad" ? "Dad" : m.speaker === "mom" ? "Mom" : "The coach"}{m.source ? `, ${m.source}` : ""}</p>
              <p className="sh-quote" style={{ whiteSpace: "pre-wrap" }}>{m.text}</p>
            </Card>
          ))}
        </div>
      )}
      {fromTable.length > 0 && (
        <div className="sh-stack" style={{ marginTop: "1.5rem" }}>
          <h2 className="sh-h2">From {partner.displayName}&apos;s table</h2>
          <p className="sh-muted">Things {partner.displayName} knows from living them, and chose to hand you.</p>
          {fromTable.map((k) => (
            <Card key={k._id}>
              <p className="sh-eyebrow">{k.topic}</p>
              <h3 className="sh-h3">{k.title}</h3>
              <p className="sh-quote" style={{ whiteSpace: "pre-wrap" }}>{k.text}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
