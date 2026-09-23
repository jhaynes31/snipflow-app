"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { GROUP_LABEL, RESOURCES, type Resource } from "@/core/apothecary/resources";
import { Btn, Card, ErrorNote, Field, Note, PageTitle, Spinner, useAction } from "@/core/ui";

const ORDER: Resource["group"][] = ["urgent", "care", "medicine", "mental", "money", "dental"];

/** Where to go: low-cost and free care, with a zip to point the finders at your town. */
export function Where() {
  const settings = useQuery(api.apothecary.entries.settings);
  const set = useMutation(api.apothecary.entries.setSettings);
  const { busy, error, run } = useAction();
  const [zip, setZip] = useState<string | null>(null);
  if (!settings) return <Spinner />;
  const saved = settings.zip;
  const shown = zip ?? saved ?? "";
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Where to go" subtitle="Low-cost and free care. Real places, and the bill help that comes after." />
      <Card>
        <Field label="Your zip code" hint="Saved for you only; it points the finders below at your town.">
          <div className="sh-row" style={{ gap: "0.5rem" }}>
            <input className="sh-input sh-input-sm" value={shown} onChange={(e) => setZip(e.target.value)} maxLength={10} inputMode="numeric" style={{ width: "8rem" }} />
            <Btn disabled={busy || zip === null || zip === saved} onClick={() => void run(async () => { await set({ zip: zip || null }); setZip(null); })}>Save</Btn>
          </div>
        </Field>
        <ErrorNote error={error} />
      </Card>
      {ORDER.map((g) => (
        <Card key={g} tone={g === "urgent" ? undefined : "alt"}>
          <h2 className="sh-h2">{GROUP_LABEL[g]}</h2>
          {RESOURCES.filter((r) => r.group === g).map((r) => (
            <div key={r.name} className="ap-entry">
              <p><a href={r.url(saved)} target="_blank" rel="noopener noreferrer" className="sh-link"><strong>{r.name}</strong></a></p>
              <p>{r.what}</p>
              <p className="sh-muted"><strong>Cost:</strong> {r.cost}</p>
              <p className="sh-muted"><strong>How:</strong> {r.how}</p>
            </div>
          ))}
        </Card>
      ))}
      <Note>
        Two habits that save the most money: ask the self-pay price before you&apos;re seen, and apply for financial assistance on every hospital bill, even after it arrives. The Storehouse&apos;s Lifeboat has the rest of the hardship programs.
      </Note>
    </div>
  );
}
