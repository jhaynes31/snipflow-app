"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { describe, GROUP_LABEL, GROUP_ORDER, money, monthKeyOf, monthLabel, STRATEGY_LABEL, type Group } from "@/convex/storehouse/pure";
import { CrisisNotice } from "@/core/safety/CrisisNotice";
import { Btn, Card, ErrorNote, Field, LinkBtn, Note, PageTitle, Spinner, useAction } from "@/core/ui";

function shiftMonth(key: string, n: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** This month: the Sit-Down and the plan. Every dollar a job. No red. */
export function ThisMonth() {
  const [key, setKey] = useState(() => monthKeyOf(new Date()));
  const data = useQuery(api.storehouse.money.month, { month: key });
  const cmp = useQuery(api.storehouse.money.comparison, {});
  const start = useMutation(api.storehouse.money.startMonth);
  const addIncome = useMutation(api.storehouse.money.addIncome);
  const removeIncome = useMutation(api.storehouse.money.removeIncome);
  const setLine = useMutation(api.storehouse.money.setLine);
  const addLine = useMutation(api.storehouse.money.addLine);
  const removeLine = useMutation(api.storehouse.money.removeLine);
  const sitDown = useMutation(api.storehouse.money.sitDown);
  const { busy, error, run } = useAction();
  const [label, setLabel] = useState("");
  const [amt, setAmt] = useState("");
  const [day, setDay] = useState("");
  const [lastLine, setLastLine] = useState("");
  const [newCat, setNewCat] = useState<{ group: Group; category: string } | null>(null);
  if (!data) return <Spinner />;
  const iAgreed = data.sitDown?.agreedBy.includes(data.me) ?? false;
  const bothAgreed = (data.sitDown?.agreedBy.length ?? 0) >= 2;
  const chosen = cmp?.schedules.find((s) => s.strategy === cmp.chosen);

  return (
    <div className="sh-container sh-narrow">
      <PageTitle
        title={monthLabel(key, 0)}
        subtitle="The Sit-Down, on one page. What's coming in, where it goes, and whether every dollar has a job. No red, no scorekeeping."
        action={
          <span className="sh-choices">
            <Btn variant="ghost" onClick={() => setKey(shiftMonth(key, -1))}>Earlier</Btn>
            <Btn variant="ghost" onClick={() => setKey(shiftMonth(key, 1))}>Later</Btn>
          </span>
        }
      />
      <Card className="st-truth">
        <p className="st-total">{money(data.allocation.income)} coming in · {money(data.allocation.planned)} planned</p>
        <p>{data.allocation.sentence}</p>
      </Card>

      <Card>
        <h2 className="sh-h2">Coming in</h2>
        {data.income.map((i) => (
          <div key={i._id} className="st-line">
            <span>{i.label}{i.expectedDay ? <span className="sh-muted"> · around the {i.expectedDay}th</span> : null}</span>
            <span>{money(i.amount)}</span>
            <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => removeIncome({ id: i._id }))}>Remove</button>
          </div>
        ))}
        <div className="sh-row sh-wrap mt-3">
          <input className="sh-input" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} placeholder="Paycheck, side income, gift" aria-label="Label" />
          <input className="sh-input sh-input-sm" type="number" min={0} step={1} value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="Amount" aria-label="Amount" />
          <input className="sh-input sh-input-sm" type="number" min={1} max={31} value={day} onChange={(e) => setDay(e.target.value)} placeholder="Day" aria-label="Expected day" />
          <Btn disabled={busy || !label.trim() || !amt} onClick={() => void run(async () => { await addIncome({ month: key, label, amount: Number(amt), expectedDay: day ? Number(day) : undefined }); setLabel(""); setAmt(""); setDay(""); })}>Add</Btn>
        </div>
      </Card>

      {data.lines.length === 0 ? (
        <Card>
          <h2 className="sh-h2">Where it goes</h2>
          <p className="sh-muted">No plan for this month yet. Start one and every debt, barn, and starter category comes in ready to fill.</p>
          <ErrorNote error={error} />
          <div className="sh-choices">
            <Btn big disabled={busy} onClick={() => void run(() => start({ month: key, copyFrom: shiftMonth(key, -1) }))}>Start from last month</Btn>
            <Btn variant="secondary" disabled={busy} onClick={() => void run(() => start({ month: key }))}>Start fresh</Btn>
          </div>
        </Card>
      ) : (
        <Card>
          <h2 className="sh-h2">Where it goes</h2>
          {GROUP_ORDER.map((g) => {
            const lines = data.lines.filter((l) => l.group === g);
            if (lines.length === 0 && g !== "needs" && g !== "fun") return null;
            return (
              <div key={g} className="st-group">
                <div className="sh-row sh-wrap">
                  <span className="sh-eyebrow">{GROUP_LABEL[g]}</span>
                  <span className="sh-muted">{money(lines.reduce((t, l) => t + l.planned, 0))}</span>
                  <button type="button" className="sh-link" onClick={() => setNewCat({ group: g, category: "" })}>Add a line</button>
                </div>
                {lines.map((l) => (
                  <LineRow key={l._id} l={l} busy={busy} onSet={(planned) => void run(() => setLine({ id: l._id, planned }))} onRemove={() => void run(() => removeLine({ id: l._id }))} />
                ))}
                {newCat?.group === g && (
                  <div className="sh-row sh-wrap mt-3">
                    <input className="sh-input" value={newCat.category} onChange={(e) => setNewCat({ group: g, category: e.target.value })} maxLength={60} placeholder="Category" aria-label="Category" />
                    <Btn disabled={busy || !newCat.category.trim()} onClick={() => void run(async () => { await addLine({ month: key, group: g, category: newCat.category, planned: 0 }); setNewCat(null); })}>Add</Btn>
                    <Btn variant="ghost" onClick={() => setNewCat(null)}>Cancel</Btn>
                  </div>
                )}
              </div>
            );
          })}
          <ErrorNote error={error} />
          <p className="sh-hint mt-3">Debt lines follow the strategy in <Link href="/storehouse/debts" className="sh-link">Debts</Link> ({STRATEGY_LABEL[data.settings.strategy]}, {money(data.settings.extraMonthly)} extra). Barn lines come from <Link href="/storehouse/barns" className="sh-link">The Barns</Link>.</p>
        </Card>
      )}

      {chosen && cmp && cmp.schedules.length > 0 && (
        <Card tone="alt">
          <p className="sh-eyebrow">Freedom Day</p>
          <p className="st-total">{chosen.stuck ? "Not yet on the map" : monthLabel(cmp.month, chosen.months)}</p>
          <p className="sh-muted">{describe(chosen, cmp.month)}</p>
        </Card>
      )}

      <Card>
        <h2 className="sh-h2">The Sit-Down</h2>
        <Field label="Last month, in one honest line" hint="What actually happened. No blame, no grade. 'Groceries ran high and we covered it from the buffer.'">
          <input className="sh-input" value={lastLine || data.sitDown?.lastMonthLine || ""} onChange={(e) => setLastLine(e.target.value)} maxLength={400} onBlur={() => { if (lastLine.trim()) void run(() => sitDown({ month: key, lastMonthLine: lastLine })); }} />
        </Field>
        <CrisisNotice texts={[lastLine]} />
        <p className="sh-muted">When the plan reads true to both of you, each of you taps agree. Anything either of you said you&apos;d do goes in <Link href="/kept-word" className="sh-link">Kept Word</Link>.</p>
        <div className="sh-choices">
          <Btn big variant={iAgreed ? "secondary" : "primary"} disabled={busy} onClick={() => void run(() => sitDown({ month: key, agree: !iAgreed }))}>{iAgreed ? "I agreed (tap to undo)" : "I agree with this plan"}</Btn>
          {bothAgreed && <Note>You both agreed. The month is set.</Note>}
          {!bothAgreed && iAgreed && data.partnerName && <span className="sh-hint">Waiting for {data.partnerName}.</span>}
        </div>
      </Card>
      <p className="sh-hint">Big purchases over {money(data.settings.pauseAmount)} get a day&apos;s pause; that rule lives in <Link href="/tend/tools/pauseBigMoves" className="sh-link">Pause Before Big Moves</Link>. <LinkBtn href="/storehouse/debts" variant="ghost">Debts</LinkBtn></p>
    </div>
  );
}

function LineRow({ l, busy, onSet, onRemove }: { l: Doc<"shLines">; busy: boolean; onSet: (planned: number) => void; onRemove: () => void }) {
  const [val, setVal] = useState(String(l.planned));
  return (
    <div className="st-line">
      <span>{l.category}</span>
      <input className="sh-input" type="number" min={0} step={1} value={val} onChange={(e) => setVal(e.target.value)} onBlur={() => { const n = Number(val); if (Number.isFinite(n) && n !== l.planned) onSet(n); }} aria-label={`${l.category} planned`} />
      {l.debtId ? <span className="sh-hint">debt</span> : <button type="button" className="sh-link" disabled={busy} onClick={onRemove}>Remove</button>}
    </div>
  );
}
