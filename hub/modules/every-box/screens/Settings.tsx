"use client";

import Link from "next/link";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { THEME_IDS, THEMES, type ThemeId } from "@/convex/everyBox/themes";
import { useHub } from "@/core/shell/HubContext";
import { useEveryBox } from "@/modules/every-box/components/context";
import { StageVisual } from "@/modules/every-box/components/StageVisual";
import { ErrorNote, PageTitle, useAction } from "@/modules/every-box/components/ui";
import { readEveryBoxSettings } from "../settings";

/**
 * Every Box's own settings: the theme, and whether the weekly review goes on
 * this person's Shire calendar feed. Names, reminders, and everything else
 * live in The Shire's Settings.
 */
export function Settings() {
  const { household, availableThemes } = useEveryBox();
  const { profile } = useHub();
  const setTheme = useMutation(api.everyBox.households.setTheme);
  const setModuleSettings = useMutation(api.profiles.setModuleSettings);
  const { busy, error, run } = useAction();
  const mine = readEveryBoxSettings(profile.moduleSettings);

  return (
    <div className="eb-container max-w-2xl">
      <PageTitle title="Every Box settings" subtitle="Just the things that belong to Every Box." />
      <ErrorNote error={error} />

      <Section id="theme" title="Theme" blurb="Purely a skin. Switching never changes anything underneath, and it changes for both of you.">
        <div className="grid gap-2 sm:grid-cols-2">
          {THEME_IDS.map((id) => (
            <ThemeOption
              key={id}
              id={id}
              active={household.activeTheme === id}
              unlocked={availableThemes.includes(id)}
              busy={busy}
              onPick={() => void run(() => setTheme({ theme: id }))}
            />
          ))}
        </div>
      </Section>

      <Section
        id="calendar"
        title="Weekly review on my calendar"
        blurb="Adds a short weekly event to your Shire calendar feed that links to the review. Your feed link is in Shire Settings."
      >
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={mine.weeklyReviewOnCalendar}
            disabled={busy}
            onChange={(e) =>
              void run(() => setModuleSettings({ moduleId: "every-box", settings: { ...mine, weeklyReviewOnCalendar: e.target.checked } }))
            }
          />
          Put &ldquo;Every Box weekly review&rdquo; on my calendar (Sundays, at my daily check-in time)
        </label>
      </Section>

      <p className="mt-6 text-sm eb-muted">
        Your name, time zone, calendar link, and how things look are in{" "}
        <Link href="/settings" className="underline">
          Shire Settings
        </Link>
        .
      </p>
    </div>
  );
}

function Section({ id, title, blurb, children }: { id: string; title: string; blurb?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="eb-card mb-5 scroll-mt-20">
      <h2 className="text-lg font-semibold">{title}</h2>
      {blurb && <p className="mb-3 text-sm eb-muted">{blurb}</p>}
      {children}
    </section>
  );
}

function ThemeOption({ id, active, unlocked, busy, onPick }: { id: ThemeId; active: boolean; unlocked: boolean; busy: boolean; onPick: () => void }) {
  const t = THEMES[id];
  return (
    <button
      type="button"
      className="eb-card-alt flex items-center gap-3 text-left"
      style={active ? { outline: "2px solid var(--eb-accent)" } : undefined}
      disabled={busy || !unlocked}
      onClick={onPick}
      aria-pressed={active}
    >
      <div className="flex -space-x-2">
        <StageVisual theme={t} stage={2} size={2.2} />
        <StageVisual theme={t} stage={5} size={2.2} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold">{t.name}</div>
        <div className="text-xs eb-muted">{t.tagline}</div>
      </div>
    </button>
  );
}
