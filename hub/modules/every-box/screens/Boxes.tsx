"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { describeCadence } from "@/convex/everyBox/freshness";
import { applyBoxFilters, BoxFilterBar, useBoxFilters } from "@/modules/every-box/components/BoxFilters";
import { CategoryForm } from "@/modules/every-box/components/CategoryForm";
import { partnerNames, useEveryBox } from "@/modules/every-box/components/context";
import { tenderIdsOf } from "@/convex/everyBox/tenders";
import { Btn, PageTitle, Spinner, useAction } from "@/modules/every-box/components/ui";

export function Boxes() {
  const { theme, partners, partner, other } = useEveryBox();
  const [filters] = useBoxFilters();
  const categories = useQuery(api.everyBox.categories.list);
  const archived = useQuery(api.everyBox.categories.listArchived);
  const create = useMutation(api.everyBox.categories.create);
  const update = useMutation(api.everyBox.categories.update);
  const archive = useMutation(api.everyBox.categories.archive);
  const restore = useMutation(api.everyBox.categories.restore);
  const reorder = useMutation(api.everyBox.categories.reorder);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Id<"ebCategories"> | null>(null);
  const { busy, error, run, setError } = useAction();

  if (!categories) return <Spinner />;
  const shown = applyBoxFilters(categories, filters, partner._id, other?._id ?? null);
  const filtering = shown.length !== categories.length;
  // Reordering works on the full list, so keep each row's true position.
  const rows = shown.map((c) => [c, categories.indexOf(c)] as const);

  function move(list: Doc<"ebCategories">[], index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    const ids = list.map((c) => c._id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    void run(() => reorder({ orderedIds: ids }));
  }

  return (
    <div className="eb-container max-w-3xl">
      <PageTitle
        title={`Your ${theme.nounPlural}`}
        subtitle="The parts of life you want to keep an eye on together. Fully yours to define."
        action={
          !adding && (
            <Btn onClick={() => { setAdding(true); setEditing(null); setError(null); }}>
              Add a {theme.noun}
            </Btn>
          )
        }
      />

      {adding && (
        <div className="eb-card mb-5">
          <h2 className="mb-3 font-semibold">New {theme.noun}</h2>
          <CategoryForm
            partners={partners}
            submitLabel="Add"
            busy={busy}
            error={error}
            onCancel={() => setAdding(false)}
            onSubmit={(values) =>
              void run(async () => {
                await create(values);
                setAdding(false);
              })
            }
          />
        </div>
      )}

      {categories.length === 0 && !adding && (
        <div className="eb-card-alt text-sm eb-muted">
          Some couples start with things like <em>Date night</em> (weekly), <em>Deep talk</em> (weekly),{" "}
          <em>Kitchen</em> (every few days), <em>Family calls</em> (monthly) and <em>Finances</em> (monthly).
        </div>
      )}

      {categories.length > 0 && <BoxFilterBar items={categories} />}
      {filtering && shown.length === 0 && (
        <p className="eb-card-alt mb-3 text-sm eb-muted">Nothing matches those filters.</p>
      )}
      <ul className="grid gap-3">
        {rows.map(([c, i]) => (
          <li key={c._id} className="eb-card">
            {editing === c._id ? (
              <CategoryForm
                partners={partners}
                initial={{ ...c, tenderIds: tenderIdsOf(c), area: c.area ?? "" }}
                submitLabel="Save"
                busy={busy}
                error={error}
                onCancel={() => setEditing(null)}
                onSubmit={(values) =>
                  void run(async () => {
                    await update({ categoryId: c._id, ...values });
                    setEditing(null);
                  })
                }
              />
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-2xl" aria-hidden>
                  {c.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <Link href={`/every-box/box/${c._id}`} className="font-semibold">
                    {c.name}
                  </Link>
                  <div className="text-xs eb-muted">
                    {c.area ? `${c.area} · ` : ""}
                    {describeCadence(c.idealCadenceDays)} · tended by {partnerNames(partners, tenderIdsOf(c), partner._id)}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Btn small variant="ghost" aria-label="Move up" disabled={busy || filtering || i === 0} onClick={() => move(categories, i, -1)}>
                    ↑
                  </Btn>
                  <Btn small variant="ghost" aria-label="Move down" disabled={busy || filtering || i === categories.length - 1} onClick={() => move(categories, i, 1)}>
                    ↓
                  </Btn>
                  <Btn small variant="secondary" onClick={() => { setEditing(c._id); setAdding(false); setError(null); }}>
                    Edit
                  </Btn>
                  <Btn
                    small
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm(`Put “${c.name}” to rest? Its history is kept and you can bring it back any time.`)) {
                        void run(() => archive({ categoryId: c._id }));
                      }
                    }}
                  >
                    Rest
                  </Btn>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {archived && archived.length > 0 && (
        <details className="eb-archive mt-8">
          <summary>Resting {theme.nounPlural} ({archived.length})</summary>
          <ul className="mt-3 grid gap-2">
            {archived.map((c) => (
              <li key={c._id} className="eb-card-alt flex items-center gap-3 text-sm">
                <span aria-hidden>{c.icon}</span>
                <span className="flex-1">{c.name}</span>
                <Btn small variant="secondary" disabled={busy} onClick={() => void run(() => restore({ categoryId: c._id }))}>
                  Bring back
                </Btn>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
