"use client";

import Link from "next/link";
import { useState } from "react";
import { useAction as useConvexAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { readSeasonsSettings, type SeasonsSettings } from "@/convex/seasons/pure";
import { useHub } from "@/core/shell/HubContext";
import { Btn, Card, ErrorNote, PageTitle, Spinner, timeAgo, Toggle, useAction } from "@/core/ui";

/**
 * My season (private) or Our season (shared, identical for both). Reports
 * arrive on their own on the chosen days; "write it now" covers the last
 * 30 days for anyone who doesn't want to wait.
 */
export function ReportList({ kind }: { kind: "mine" | "ours" }) {
  const { profile, partner } = useHub();
  const mine = useQuery(api.seasons.reports.mine, kind === "mine" ? {} : "skip");
  const ours = useQuery(api.seasons.reports.ours, kind === "ours" ? {} : "skip");
  const writeMine = useConvexAction(api.seasons.generate.writeMineNow);
  const writeOurs = useConvexAction(api.seasons.generate.writeOursNow);
  const remove = useMutation(api.seasons.reports.remove);
  const setModuleSettings = useMutation(api.profiles.setModuleSettings);
  const { busy, error, run } = useAction();
  const [justWrote, setJustWrote] = useState<Id<"seasonReports"> | null>(null);
  const settings = readSeasonsSettings(profile.moduleSettings);
  const list = kind === "mine" ? mine : ours;

  async function save(next: Partial<SeasonsSettings>) {
    await setModuleSettings({ moduleId: "seasons", settings: { ...settings, ...next } });
  }

  return (
    <div className="sh-container sh-narrow">
      <PageTitle
        title={kind === "mine" ? "My season" : "Our season"}
        subtitle={
          kind === "mine"
            ? "About you, for you, written by the coach from your own counts across every place in The Shire. Private. It names growth with specifics, because brains minimize it."
            : `About the two of you, the same page for both. Built only from what is shared by nature. Nothing private, no comparisons between you${partner ? ` and ${partner.displayName}` : ""}.`
        }
      />
      <Card>
        <ErrorNote error={error} />
        <div className="sh-row sh-wrap">
          <Btn
            big
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const id = kind === "mine" ? await writeMine({}) : await writeOurs({});
                setJustWrote(id);
              })
            }
          >
            {busy ? "Writing…" : kind === "mine" ? "Write my season now" : "Write our season now"}
          </Btn>
          <span className="sh-hint">The last 30 days. Takes about half a minute.</span>
        </div>
        {justWrote && (
          <p className="mt-3">
            <Link href={`/seasons/read/${justWrote}`} className="sh-link">Read it</Link>
          </p>
        )}
      </Card>
      <Card tone="alt">
        <h2 className="sh-h2">When seasons arrive</h2>
        {kind === "mine" ? (
          <div className="sh-stack-sm">
            <Toggle checked={settings.weekly} onChange={(on) => void run(() => save({ weekly: on }))} label="Weekly, on Mondays" />
            <Toggle checked={settings.biweekly} onChange={(on) => void run(() => save({ biweekly: on }))} label="Every two weeks, on a Monday" />
            <Toggle checked={settings.monthly} onChange={(on) => void run(() => save({ monthly: on }))} label="Monthly, on the 1st" />
          </div>
        ) : (
          <div className="sh-stack-sm">
            <Toggle checked={settings.ours} onChange={(on) => void run(() => save({ ours: on }))} label="Take part in Our season" hint="Monthly, on the 1st, and only when you both have this on." />
          </div>
        )}
      </Card>
      {!list ? (
        <Spinner />
      ) : list.length === 0 ? (
        <Card>
          <p className="sh-muted">No seasons yet. The first arrives on the schedule above, or sooner with the button.</p>
        </Card>
      ) : (
        <Card>
          {list.map((r) => (
            <div key={r._id} className="se-row">
              <p>
                <Link href={`/seasons/read/${r._id}`} className="sh-link">
                  <strong>{r.title}</strong>
                </Link>
              </p>
              <p className="sh-hint">
                Written {timeAgo(r.createdAt)} ·{" "}
                <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => remove({ id: r._id }))}>
                  Delete{kind === "ours" ? " for both of us" : ""}
                </button>
              </p>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
