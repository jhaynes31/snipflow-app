"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { APP_DISPLAY_NAME } from "@/core/config";
import { COPY } from "@/core/copy/strings";
import { HOME_SCREEN_MODULES } from "@/core/modules/brand";
import { MODULES } from "@/core/modules/registry";
import { useHub } from "@/core/shell/HubContext";
import { PushSettings } from "@/core/push/PushSettings";
import { BackgroundPicker } from "@/core/theme/BackgroundPicker";
import { Btn, Card, CopyButton, ErrorNote, Field, PageTitle, Toggle, useAction } from "@/core/ui";

const noopSubscribe = () => () => {};

export default function SettingsPage() {
  const { profile, email } = useHub();
  const { signOut } = useAuthActions();
  const updateReminders = useMutation(api.profiles.updateReminders);
  const updateAccessibility = useMutation(api.profiles.updateAccessibility);
  const updateModules = useMutation(api.profiles.updateModules);
  const regenerate = useMutation(api.profiles.regenerateCalendarToken);
  const exportData = useQuery(api.profiles.exportMine);
  const { busy, error, run } = useAction();
  const origin = useSyncExternalStore(noopSubscribe, () => window.location.origin, () => "");
  const [hour, setHour] = useState(profile.reminders.dailyCheckInHour);
  const [minute, setMinute] = useState(profile.reminders.dailyCheckInMinute);

  const feedUrl = `${origin}/calendar/${profile.calendarToken}`;
  const webcal = feedUrl.replace(/^https?:/, "webcal:");
  const a = profile.accessibility;
  const order = MODULES.map((m) => m.id).sort((x, y) => rank(x) - rank(y));
  function rank(id: string) {
    const i = profile.modules.order.indexOf(id);
    return i === -1 ? profile.modules.order.length + MODULES.findIndex((m) => m.id === id) : i;
  }
  function move(id: string, dir: -1 | 1) {
    const i = order.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    void run(() => updateModules({ order: next }));
  }

  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Settings" subtitle={`Signed in as ${email ?? profile.displayName}.`} />
      <ErrorNote error={error} />

      <Card>
        <h2 className="sh-h2">Reaching you</h2>
        <p className="sh-muted">
          {APP_DISPLAY_NAME} reaches you four ways: the home screen, the installed app&apos;s icon badge, your calendar, and, only
          if you turn it on, a notification when the other one of you does something that involves you.
        </p>
        <div className="sh-stack-sm mt-4">
          <div className="sh-card-alt">
            <h3 className="sh-h3">1. Make this your browser homepage</h3>
            <p className="sh-hint">Open cards sit at the top of the home screen. Chrome: Settings, On startup. Safari: Settings, General, Homepage.</p>
            <div className="sh-row mt-2">
              <code className="sh-code">{origin}/</code>
              <CopyButton text={`${origin}/`} />
            </div>
          </div>
          <div className="sh-card-alt">
            <h3 className="sh-h3">2. Install it on your phone</h3>
            <InstallHint />
            <Toggle
              checked={profile.reminders.badgeEnabled}
              onChange={(v) => void run(() => updateReminders({ badgeEnabled: v }))}
              label="Show open heads-ups on the app icon"
              hint="The badge counts open heads-ups only. Never anything else."
            />
          </div>
          <div className="sh-card-alt">
            <h3 className="sh-h3">3. Notifications on this device</h3>
            <PushSettings />
          </div>
          <div className="sh-card-alt">
            <h3 className="sh-h3">Which ways, for which places</h3>
            <p className="sh-hint">Notification, email, or text, chosen area by area, plus the email address and phone number they go to.</p>
            <Link href="/notifications" className="sh-btn sh-btn-secondary mt-2">Open Notifications</Link>
          </div>
          <div className="sh-card-alt">
            <h3 className="sh-h3">4. Calendar</h3>
            <p className="sh-hint">
              Subscribe to this feed in any calendar app. It holds one daily &ldquo;how are you, really?&rdquo; event and a
              one-off event for any heads-up your partner asks to put there. The link is a secret; anyone with it can read the feed.
            </p>
            <div className="sh-row mt-2">
              <code className="sh-code">{webcal}</code>
              <CopyButton text={webcal} label="Copy link" />
            </div>
            <div className="sh-row mt-2 sh-wrap">
              <a className="sh-link" href={feedUrl} download="the-shire.ics">
                Download the invite once instead
              </a>
              <Btn variant="ghost" disabled={busy} onClick={() => void run(() => regenerate())}>
                New secret link
              </Btn>
            </div>
            <form
              className="sh-row mt-3 sh-wrap"
              onSubmit={(e) => {
                e.preventDefault();
                void run(() => updateReminders({ dailyCheckInHour: hour, dailyCheckInMinute: minute }));
              }}
            >
              <Field label="Daily check-in time">
                <span className="sh-row">
                  <input className="sh-input sh-input-sm" type="number" min={0} max={23} value={hour} onChange={(e) => setHour(Number(e.target.value))} aria-label="Hour" />
                  :
                  <input className="sh-input sh-input-sm" type="number" min={0} max={59} value={minute} onChange={(e) => setMinute(Number(e.target.value))} aria-label="Minute" />
                </span>
              </Field>
              <Btn type="submit" variant="secondary" disabled={busy}>
                Save time
              </Btn>
            </form>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="sh-h2">How things look</h2>
        <div className="sh-stack-sm">
          <Field label="Text size">
            <select className="sh-input" value={a.textSize} onChange={(e) => void run(() => updateAccessibility({ textSize: e.target.value as typeof a.textSize }))}>
              <option value="normal">Normal</option>
              <option value="large">Large</option>
              <option value="larger">Larger</option>
            </select>
          </Field>
          <Field label="Light or dark">
            <select className="sh-input" value={a.theme} onChange={(e) => void run(() => updateAccessibility({ theme: e.target.value as typeof a.theme }))}>
              <option value="system">Match my device</option>
              <option value="light">Light (parchment)</option>
              <option value="dark">Dark (lantern-lit evening)</option>
            </select>
          </Field>
          <Field label="Background color" hint="Yours alone; it never changes the other person's screen.">
            <BackgroundPicker />
          </Field>
          <Toggle checked={a.highContrast} onChange={(v) => void run(() => updateAccessibility({ highContrast: v }))} label="Higher contrast" hint="Darker text and stronger borders." />
          <Toggle
            checked={a.quietVisuals}
            onChange={(v) => void run(() => updateAccessibility({ quietVisuals: v }))}
            label="Quiet visuals"
            hint="Mutes colors and removes every texture and animation."
          />
        </div>
      </Card>

      <Card>
        <h2 className="sh-h2">On your phone&apos;s home screen</h2>
        <p className="sh-muted">
          {APP_DISPLAY_NAME} as a whole can sit on your phone as an app, and any one place can sit there as its own icon that opens straight into it. Pick whichever you want, in any mix.
        </p>
        <div className="sh-stack-sm mt-3">
          <div className="sh-card-alt">
            <h3 className="sh-h3">{APP_DISPLAY_NAME}, whole</h3>
            <p className="sh-hint">iPhone: open the home page in Safari, tap Share, then &ldquo;Add to Home Screen&rdquo;. Android: open it in Chrome, tap the three dots, then &ldquo;Add to Home screen&rdquo; or &ldquo;Install app&rdquo;. A long press on the icon lists every place.</p>
          </div>
          <div className="sh-card-alt">
            <h3 className="sh-h3">One place on its own</h3>
            <p className="sh-hint">Open that place first, then do the same &ldquo;Add to Home Screen&rdquo;. The icon takes that place&apos;s color and name and opens right into it. Any of these:</p>
            <div className="sh-chips">
              {HOME_SCREEN_MODULES.map((m) => (
                <Link key={m.id} href={`/${m.id}`} className="sh-chip" style={{ borderColor: m.accent }}>
                  <span aria-hidden style={{ display: "inline-block", width: "0.8em", height: "0.8em", borderRadius: "50%", background: m.accent, marginRight: "0.4em", verticalAlign: "-0.05em" }} />
                  {m.name}
                </Link>
              ))}
            </div>
            <p className="sh-hint mt-2">A phone can&apos;t show a live widget from a website, so the icon is the closest thing; the badge on {APP_DISPLAY_NAME}&apos;s icon still counts open heads-ups.</p>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="sh-h2">Places</h2>
        <p className="sh-muted">
          Every place is always open. Put the tabs in whatever order suits you, and pin the places you use most to your
          home screen. Pins are yours alone; your partner chooses their own.
        </p>
        <ul className="sh-list mt-3">
          {order.map((id, i) => {
            const m = MODULES.find((x) => x.id === id)!;
            const pinned = profile.modules.pinned ?? [];
            const isPinned = pinned.includes(id);
            return (
              <li key={id} className="sh-row">
                <Toggle
                  checked={isPinned}
                  onChange={(v) =>
                    void run(() => updateModules({ pinned: v ? [...pinned, id] : pinned.filter((p) => p !== id) }))
                  }
                  label={m.name}
                  hint={isPinned ? "On your home screen." : "Show on my home screen."}
                />
                <span className="sh-row">
                  <button type="button" className="sh-iconbtn" aria-label={`Move ${m.name} up`} disabled={busy || i === 0} onClick={() => move(id, -1)}>
                    <ArrowUp size={16} aria-hidden />
                  </button>
                  <button type="button" className="sh-iconbtn" aria-label={`Move ${m.name} down`} disabled={busy || i === order.length - 1} onClick={() => move(id, 1)}>
                    <ArrowDown size={16} aria-hidden />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <h2 className="sh-h2">Your data</h2>
        <p className="sh-muted">Everything you wrote, as one readable file. Nothing of your partner&apos;s is in it.</p>
        <Btn
          variant="secondary"
          disabled={!exportData}
          onClick={() => {
            if (!exportData) return;
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${profile.displayName.toLowerCase().replace(/\s+/g, "-")}-shire-export.json`;
            link.click();
            URL.revokeObjectURL(url);
          }}
        >
          Download my data
        </Btn>
      </Card>

      <div className="mt-8 text-center">
        <Btn variant="ghost" onClick={() => void signOut()}>
          {COPY.signOut}
        </Btn>
      </div>
    </div>
  );
}

function InstallHint() {
  const standalone = useSyncExternalStore(noopSubscribe, () => window.matchMedia("(display-mode: standalone)").matches, () => false);
  const isIOS = useSyncExternalStore(noopSubscribe, () => /iPad|iPhone|iPod/.test(navigator.userAgent), () => false);
  if (standalone) return <p className="sh-hint">You&apos;re using the installed app.</p>;
  return (
    <p className="sh-hint">
      {isIOS
        ? "In Safari, tap Share, then “Add to Home Screen”."
        : "In Chrome or Edge, open the browser menu and choose “Install app” or “Add to Home screen”."}
    </p>
  );
}
