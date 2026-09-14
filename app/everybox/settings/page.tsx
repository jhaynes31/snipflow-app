"use client";

import { useState, useSyncExternalStore } from "react";
import { useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/convex/_generated/api";
import { THEME_IDS, THEMES, type ThemeId } from "@/convex/everybox/themes";
import { setBadgeEnabled, useAttentionCount, useBadgePref, useBadgeSupported } from "@/components/everybox/BadgeSync";
import { useEveryBox } from "@/components/everybox/context";
import { StageVisual } from "@/components/everybox/StageVisual";
import { Btn, CopyButton, ErrorNote, Field, PageTitle, useAction } from "@/components/everybox/ui";

export default function SettingsPage() {
  const { household, partner, other, availableThemes, email } = useEveryBox();
  const setTheme = useMutation(api.everybox.households.setTheme);
  const regenerate = useMutation(api.everybox.households.regenerateInviteCode);
  const updateProfile = useMutation(api.everybox.households.updateProfile);
  const { signOut } = useAuthActions();
  const { busy, error, run } = useAction();
  const [displayName, setDisplayName] = useState(partner.displayName);
  const [householdName, setHouseholdName] = useState(household.name);
  const origin = useSyncExternalStore(noopSubscribe, () => window.location.origin, () => "");

  const inviteLink = `${origin}/everybox/join/${household.inviteCode}`;
  const homeLink = `${origin}/everybox`;
  const widgetLink = `${origin}/everybox/widget`;

  return (
    <div className="eb-container max-w-2xl">
      <PageTitle title="Settings" subtitle={`${household.name} · signed in as ${email ?? partner.displayName}`} />

      <ErrorNote error={error} />

      <Section id="theme" title="Theme" blurb="Purely a skin. Switching never changes anything underneath.">
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
        <p className="mt-2 text-xs eb-muted">
          Garden, Aquarium, Character sheet and House restoration are always free, as is everything Every Box does. Premium
          themes are the only paid layer.
        </p>
      </Section>

      <Section id="invite" title="Your partner" blurb={other ? `${other.displayName} is here.` : "Share this link. Once they open it and sign in, they land in your household."}>
        {!other && (
          <div className="grid gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <code className="eb-input flex-1 overflow-x-auto text-xs">{inviteLink}</code>
              <CopyButton text={inviteLink} label="Copy link" />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm eb-muted">
              Or the code: <code className="font-mono tracking-widest">{household.inviteCode}</code>
              <Btn small variant="ghost" disabled={busy} onClick={() => void run(() => regenerate())}>
                New code
              </Btn>
            </div>
          </div>
        )}
      </Section>

      <Section
        id="reminders"
        title="Staying in the habit"
        blurb="Every Box never sends push banners. These three are ambient or anchored to things you already do."
      >
        <div className="grid gap-4">
          <div className="eb-card-alt">
            <h3 className="font-semibold">1. Make it your browser homepage or new-tab page</h3>
            <p className="mt-1 text-sm eb-muted">
              Opening the browser is already a habit. Set it to open this page and there&apos;s no new habit to build. The glanceable
              view is the quiet option.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="eb-input flex-1 overflow-x-auto text-xs">{widgetLink}</code>
              <CopyButton text={widgetLink} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="eb-input flex-1 overflow-x-auto text-xs">{homeLink}</code>
              <CopyButton text={homeLink} />
            </div>
            <p className="mt-2 text-xs eb-muted">
              Chrome: Settings → On startup → Open a specific page. Safari: Settings → General → Homepage. Firefox: Settings → Home.
            </p>
          </div>

          <InstallCard />

          <BadgeCard />

          <CalendarCard />
        </div>
      </Section>

      <Section id="profile" title="Names">
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => updateProfile({ displayName, householdName }));
          }}
        >
          <Field label="Your name here">
            <input className="eb-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40} required />
          </Field>
          <Field label="Household name">
            <input className="eb-input" value={householdName} onChange={(e) => setHouseholdName(e.target.value)} maxLength={60} required />
          </Field>
          <div>
            <Btn type="submit" disabled={busy}>
              Save
            </Btn>
          </div>
        </form>
      </Section>

      <div className="mt-8 text-center">
        <Btn variant="ghost" onClick={() => void signOut()}>
          Sign out
        </Btn>
      </div>
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

function ThemeOption({
  id,
  active,
  unlocked,
  busy,
  onPick,
}: {
  id: ThemeId;
  active: boolean;
  unlocked: boolean;
  busy: boolean;
  onPick: () => void;
}) {
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
        <div className="font-semibold">
          {t.name}
          {t.premium && <span className="eb-chip ml-2">{unlocked ? "Premium" : "Premium · coming soon"}</span>}
        </div>
        <div className="text-xs eb-muted">{t.tagline}</div>
      </div>
    </button>
  );
}

const noopSubscribe = () => () => {};

function InstallCard() {
  const standalone = useSyncExternalStore(
    noopSubscribe,
    () => window.matchMedia("(display-mode: standalone)").matches,
    () => false,
  );
  const isIOS = useSyncExternalStore(noopSubscribe, () => /iPad|iPhone|iPod/.test(navigator.userAgent), () => false);
  return (
    <div className="eb-card-alt">
      <h3 className="font-semibold">2. Put it on your phone&apos;s home screen</h3>
      {standalone ? (
        <p className="mt-1 text-sm eb-muted">You&apos;re using the installed app. Nice.</p>
      ) : (
        <p className="mt-1 text-sm eb-muted">
          {isIOS
            ? "In Safari, tap Share, then “Add to Home Screen”. It gets a real icon and opens like an app."
            : "In Chrome or Edge, open the browser menu and choose “Install app” or “Add to Home screen”. It gets a real icon and opens like an app."}
        </p>
      )}
    </div>
  );
}

function BadgeCard() {
  const count = useAttentionCount();
  const enabled = useBadgePref();
  const supported = useBadgeSupported();
  return (
    <div className="eb-card-alt">
      <h3 className="font-semibold">3. A quiet number on the app icon</h3>
      <p className="mt-1 text-sm eb-muted">
        Instead of a banner that demands a decision, the installed app shows a small badge with how many of <em>your</em> boxes
        or commitments could use attention. It sits there until you look. It never buzzes.
      </p>
      <label className="mt-2 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={enabled} onChange={(e) => setBadgeEnabled(e.target.checked)} />
        Show the badge {count !== null && count > 0 ? `(right now it would say ${count})` : "(right now it would be clear)"}
      </label>
      {!supported && (
        <p className="mt-1 text-xs eb-muted">This browser can&apos;t show badges. Installed Chrome, Edge and iOS 16.4+ home-screen apps can.</p>
      )}
    </div>
  );
}

function CalendarCard() {
  const [freq, setFreq] = useState<"daily" | "weekdays" | "mwf" | "weekly">("daily");
  const [time, setTime] = useState("08:00");
  const [day, setDay] = useState("SU");
  const [hour, minute] = time.split(":").map(Number);
  const href = `/everybox/checkin.ics?freq=${freq}&hour=${hour}&minute=${minute}&day=${day}`;
  return (
    <div className="eb-card-alt">
      <h3 className="font-semibold">4. A recurring calendar invite</h3>
      <p className="mt-1 text-sm eb-muted">
        Calendar events get treated differently from app noise. Add a short “Every Box check-in” to your calendar; it links straight
        back here.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <select className="eb-select w-auto" value={freq} onChange={(e) => setFreq(e.target.value as typeof freq)}>
          <option value="daily">Every day</option>
          <option value="weekdays">Weekdays</option>
          <option value="mwf">Mon, Wed, Fri</option>
          <option value="weekly">Once a week</option>
        </select>
        {freq === "weekly" && (
          <select className="eb-select w-auto" value={day} onChange={(e) => setDay(e.target.value)}>
            {[["MO", "Monday"], ["TU", "Tuesday"], ["WE", "Wednesday"], ["TH", "Thursday"], ["FR", "Friday"], ["SA", "Saturday"], ["SU", "Sunday"]].map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        )}
        <input type="time" className="eb-input w-auto" value={time} onChange={(e) => setTime(e.target.value)} />
        <a className="eb-btn eb-btn-secondary eb-btn-sm" href={href} download="every-box-check-in.ics">
          Download invite (.ics)
        </a>
      </div>
      <p className="mt-2 text-xs eb-muted">
        Open the file to add it to Apple Calendar, Google Calendar or Outlook. The weekly one is a good anchor for the review; the
        daily one for a glance.
      </p>
    </div>
  );
}
