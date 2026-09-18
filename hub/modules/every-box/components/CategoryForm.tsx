"use client";

import { useState } from "react";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { CADENCE_PRESETS } from "@/convex/everyBox/freshness";
import { AREA_MAX_LENGTH, AREA_PRESETS } from "@/convex/everyBox/areas";
import { useEveryBox } from "./context";
import { Btn, ErrorNote, Field } from "./ui";

/** Icon picker, grouped by the kinds of boxes couples tend to make. */
export const ICON_GROUPS: ReadonlyArray<{ label: string; icons: readonly string[] }> = [
  { label: "Us", icons: ["❤️", "💬", "🥂", "🌹", "💑", "🫶", "💌", "🎟️", "🕯️", "🛁", "🎶", "🌅"] },
  { label: "Home", icons: ["🏡", "🧹", "🧺", "🍽️", "🧽", "🛏️", "🪴", "🧑‍🍳", "🛠️", "🔧", "🧰", "🗑️", "🪣", "🧻", "🛒", "📦"] },
  { label: "Family & people", icons: ["👨‍👩‍👧", "👶", "🧒", "👵", "👴", "📞", "🎁", "🎂", "✉️", "🧑‍🤝‍🧑", "🫂", "🏫"] },
  { label: "Health", icons: ["🩺", "💊", "🦷", "🏃", "🧘", "🏋️", "🚴", "🥗", "💧", "😴", "🧠", "🩹"] },
  { label: "Money & admin", icons: ["💸", "💳", "🏦", "📄", "📋", "🧾", "📅", "🗓️", "⏰", "🔑", "🛡️", "📬"] },
  { label: "Fun", icons: ["🎮", "🎬", "📚", "🎨", "🎵", "🎲", "🧩", "🍿", "🎤", "📸", "🎳", "🎯"] },
  { label: "Out & about", icons: ["✈️", "🚗", "🏕️", "🥾", "🏖️", "🗺️", "🚲", "🍻", "🍕", "☕", "🌆", "🎡"] },
  { label: "Pets & nature", icons: ["🐾", "🐶", "🐱", "🐟", "🐦", "🌿", "🌻", "🌳", "🐝", "🍃", "🌧️", "🐴"] },
  { label: "Growth & rest", icons: ["📖", "✍️", "🎓", "💼", "🧑‍💻", "🙏", "⛪", "🕊️", "🧭", "🌙", "☀️", "🪷"] },
];

/** Flat list, kept for anything that just needs "a valid choice". */
export const ICON_CHOICES: readonly string[] = ICON_GROUPS.flatMap((g) => g.icons);

export interface CategoryFormValues {
  name: string;
  icon: string;
  idealCadenceDays: number;
  tenderIds: Id<"ebPartners">[];
  /** Empty string clears it. */
  area: string;
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
  const [tenderIds, setTenderIds] = useState<Id<"ebPartners">[]>(
    initial?.tenderIds && initial.tenderIds.length > 0 ? initial.tenderIds : [partner._id],
  );
  const [area, setArea] = useState(initial?.area ?? "");
  const [customArea, setCustomArea] = useState(
    initial?.area && !AREA_PRESETS.includes(initial.area) ? initial.area : "",
  );
  const usingCustom = area !== "" && !AREA_PRESETS.includes(area);
  function toggleTender(id: Id<"ebPartners">) {
    setTenderIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  const idealCadenceDays = cadenceChoice === "custom" ? Number(customDays) : Number(cadenceChoice);

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ name, icon, idealCadenceDays, tenderIds, area });
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
      <Field label="Icon" hint="Tap one, or type any emoji from your keyboard into the box.">
        <div className="mb-2 flex items-center gap-2">
          <span className="eb-chip text-2xl" aria-hidden>
            {icon || "·"}
          </span>
          <input
            className="eb-input w-24 text-center text-lg"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            maxLength={8}
            aria-label="Custom icon"
            placeholder="🙂"
          />
        </div>
        <div className="grid gap-2">
          {ICON_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="mb-1 text-[0.7rem] font-semibold uppercase tracking-wide eb-muted">{group.label}</div>
              <div className="flex flex-wrap gap-1">
                {group.icons.map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    className="eb-chip text-lg"
                    style={icon === choice ? { outline: "2px solid var(--eb-accent)" } : undefined}
                    onClick={() => setIcon(choice)}
                    aria-pressed={icon === choice}
                    aria-label={`Use ${choice}`}
                  >
                    {choice}
                  </button>
                ))}
              </div>
            </div>
          ))}
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
      <Field label="Category" hint="Optional. Lets you filter the home screen by the part of life a box belongs to.">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            className="eb-chip"
            style={area === "" ? { outline: "2px solid var(--eb-accent)", color: "var(--eb-accent)" } : undefined}
            onClick={() => setArea("")}
            aria-pressed={area === ""}
          >
            None
          </button>
          {AREA_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              className="eb-chip"
              style={area === preset ? { outline: "2px solid var(--eb-accent)", color: "var(--eb-accent)" } : undefined}
              onClick={() => setArea(preset)}
              aria-pressed={area === preset}
            >
              {preset}
            </button>
          ))}
          <input
            className="eb-input w-36"
            value={customArea}
            placeholder="Or your own…"
            maxLength={AREA_MAX_LENGTH}
            aria-label="Custom category"
            style={usingCustom ? { borderColor: "var(--eb-accent)" } : undefined}
            onChange={(e) => {
              setCustomArea(e.target.value);
              setArea(e.target.value.trim());
            }}
            onFocus={() => {
              if (customArea.trim()) setArea(customArea.trim());
            }}
          />
        </div>
      </Field>
      <Field
        label="Who tends this?"
        hint={`Pick one or both. Only a tender can mark it ${theme.tendPast}; anyone can leave notes.`}
      >
        <div className="flex flex-wrap gap-2">
          {partners.map((p) => (
            <button
              key={p._id}
              type="button"
              className="eb-chip"
              style={tenderIds.includes(p._id) ? { outline: "2px solid var(--eb-accent)", color: "var(--eb-accent)" } : undefined}
              onClick={() => toggleTender(p._id)}
              aria-pressed={tenderIds.includes(p._id)}
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
        <Btn type="submit" disabled={busy || !name.trim() || !(idealCadenceDays >= 1) || tenderIds.length === 0}>
          {submitLabel}
        </Btn>
      </div>
    </form>
  );
}
