"use client";

import { useState } from "react";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { CADENCE_PRESETS } from "@/convex/everybox/freshness";
import { useEveryBox } from "./context";
import { Btn, ErrorNote, Field } from "./ui";

export const ICON_CHOICES = [
  "💬", "❤️", "🍽️", "🧹", "🛒", "💸", "🧑‍🤝‍🧑", "👨‍👩‍👧", "🐾", "🌿",
  "🏃", "🧘", "🎮", "🎬", "📚", "🛠️", "🚗", "🧺", "🛏️", "🎁",
  "☕", "🎉", "🧠", "🩺", "✈️", "🎨", "🎵", "🏡", "📅", "📞",
];

export interface CategoryFormValues {
  name: string;
  icon: string;
  idealCadenceDays: number;
  tenderId: Id<"ebPartners">;
}

interface Props {
  initial?: Partial<CategoryFormValues>;
  submitLabel: string;
  busy?: boolean;
  error: string | null;
  onSubmit: (values: CategoryFormValues) => void;
  onCancel?: () => void;
  partners: Doc<"ebPartners">[];
}

export function CategoryForm({ initial, submitLabel, busy, error, onSubmit, onCancel, partners }: Props) {
  const { partner, theme } = useEveryBox();
  const [name, setName] = useState(initial?.name ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "🌿");
  const presetMatch = CADENCE_PRESETS.some((p) => p.days === (initial?.idealCadenceDays ?? 7));
  const [cadenceChoice, setCadenceChoice] = useState<string>(
    presetMatch ? String(initial?.idealCadenceDays ?? 7) : "custom",
  );
  const [customDays, setCustomDays] = useState(String(initial?.idealCadenceDays ?? 10));
  const [tenderId, setTenderId] = useState<Id<"ebPartners">>(initial?.tenderId ?? partner._id);

  const idealCadenceDays = cadenceChoice === "custom" ? Number(customDays) : Number(cadenceChoice);

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ name, icon, idealCadenceDays, tenderId });
      }}
    >
      <Field label="Name">
        <input
          className="eb-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Date night, Deep talk, Kitchen, Grandma…"
          required
          maxLength={50}
          autoFocus
        />
      </Field>
      <Field label="Icon">
        <div className="flex flex-wrap gap-1.5">
          {ICON_CHOICES.map((choice) => (
            <button
              key={choice}
              type="button"
              className="eb-chip text-lg"
              style={icon === choice ? { outline: "2px solid var(--eb-accent)" } : undefined}
              onClick={() => setIcon(choice)}
              aria-pressed={icon === choice}
            >
              {choice}
            </button>
          ))}
          <input
            className="eb-input w-20 text-center text-lg"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            maxLength={8}
            aria-label="Custom icon"
          />
        </div>
      </Field>
      <Field
        label="Ideal rhythm"
        hint="How often this wants attention when things are good. Different things need different rhythms; each is judged only against its own."
      >
        <div className="flex flex-wrap gap-2">
          <select className="eb-select w-auto" value={cadenceChoice} onChange={(e) => setCadenceChoice(e.target.value)}>
            {CADENCE_PRESETS.map((p) => (
              <option key={p.days} value={p.days}>
                {p.label}
              </option>
            ))}
            <option value="custom">Custom…</option>
          </select>
          {cadenceChoice === "custom" && (
            <label className="flex items-center gap-2 text-sm">
              every
              <input
                type="number"
                className="eb-input w-20"
                min={1}
                max={365}
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
                required
              />
              days
            </label>
          )}
        </div>
      </Field>
      <Field label="Who tends this?" hint={`Only the tender can mark it ${theme.tendPast}. The other partner can always leave notes.`}>
        <div className="flex flex-wrap gap-2">
          {partners.map((p) => (
            <button
              key={p._id}
              type="button"
              className="eb-chip"
              style={tenderId === p._id ? { outline: "2px solid var(--eb-accent)", color: "var(--eb-accent)" } : undefined}
              onClick={() => setTenderId(p._id)}
              aria-pressed={tenderId === p._id}
            >
              {p._id === partner._id ? `${p.displayName} (you)` : p.displayName}
            </button>
          ))}
        </div>
      </Field>
      <ErrorNote error={error} />
      <div className="flex gap-2">
        {onCancel && (
          <Btn variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Btn>
        )}
        <Btn type="submit" disabled={busy || !name.trim() || !(idealCadenceDays >= 1)}>
          {submitLabel}
        </Btn>
      </div>
    </form>
  );
}
