"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { APP_DISPLAY_NAME } from "@/core/config";
import { AREAS, channelsFor } from "@/convex/push/channels";
import { useHub } from "@/core/shell/HubContext";
import { PushSettings } from "@/core/push/PushSettings";
import { Btn, Card, ErrorNote, Field, Note, PageTitle, useAction } from "@/core/ui";

/**
 * Notifications (2026-10-03, Jen and John's ask): each person picks, area by
 * area, how The Shire reaches them: a notification on their devices, an
 * email, a text, or any mix, and where the email and texts go. Every Box
 * reminders have their own page, box by box. Nothing here is shared.
 */
export default function NotificationsPage() {
  const { profile, email, partner } = useHub();
  const status = useQuery(api.push.channelStatus.status);
  const updateReminders = useMutation(api.profiles.updateReminders);
  const { busy, error, run } = useAction();
  const r = profile.reminders;
  const [emailDraft, setEmailDraft] = useState(r.email ?? "");
  const [phoneDraft, setPhoneDraft] = useState(r.phone ?? "");

  return (
    <div className="sh-container sh-narrow sh-stack">
      <PageTitle title="Notifications" subtitle="How The Shire reaches you, area by area. Yours alone; your partner chooses their own." />
      <ErrorNote error={error} />

      <Card>
        <h2 className="sh-h2">Where they go</h2>
        <div className="sh-stack-sm mt-2">
          <div className="sh-card-alt">
            <h3 className="sh-h3">Phone or computer notifications</h3>
            <PushSettings />
          </div>
          <div className="sh-card-alt">
            <h3 className="sh-h3">Email</h3>
            <Field label="Send emails to" hint={`Blank means your sign-in address${email ? `, ${email}` : ""}.`}>
              <input className="sh-input" type="email" value={emailDraft} onChange={(e) => setEmailDraft(e.target.value)} placeholder={email ?? "you@example.com"} />
            </Field>
            <div className="sh-row mt-2">
              <Btn disabled={busy || emailDraft === (r.email ?? "")} onClick={() => void run(() => updateReminders({ email: emailDraft.trim() || null }))}>Save email</Btn>
            </div>
            {status && !status.email && <SetupNote kind="email" />}
          </div>
          <div className="sh-card-alt">
            <h3 className="sh-h3">Text messages</h3>
            <Field label="Send texts to" hint="With the country code, like +1 555 555 0123.">
              <input className="sh-input" type="tel" value={phoneDraft} onChange={(e) => setPhoneDraft(e.target.value)} placeholder="+1 555 555 0123" />
            </Field>
            <div className="sh-row mt-2">
              <Btn disabled={busy || phoneDraft === (r.phone ?? "")} onClick={() => void run(() => updateReminders({ phone: phoneDraft.trim() || null }))}>Save number</Btn>
            </div>
            {status && !status.text && <SetupNote kind="text" />}
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="sh-h2">Which ways, for which places</h2>
        <p className="sh-muted">Tick every way you want for each area. Quiet hours hold all of them back unless it&apos;s urgent.</p>
        <div className="sh-notify-grid mt-3" role="table" aria-label="Ways to be reached, by area">
          <div className="sh-notify-head" role="row">
            <span role="columnheader">Area</span>
            <span role="columnheader">Notification</span>
            <span role="columnheader">Email</span>
            <span role="columnheader">Text</span>
          </div>
          {AREAS.map((a) => {
            const c = channelsFor(r.channels, a.key);
            const save = (patch: Partial<typeof c>) => void run(() => updateReminders({ channel: { area: a.key, ...c, ...patch } }));
            return (
              <div key={a.key} className="sh-notify-row" role="row">
                <span role="cell"><strong>{a.label}</strong><span className="sh-hint" style={{ display: "block" }}>{a.what}</span></span>
                <span role="cell"><input type="checkbox" aria-label={`${a.label}: notification`} checked={c.push} disabled={busy} onChange={(e) => save({ push: e.target.checked })} /></span>
                <span role="cell"><input type="checkbox" aria-label={`${a.label}: email`} checked={c.email} disabled={busy} onChange={(e) => save({ email: e.target.checked })} /></span>
                <span role="cell"><input type="checkbox" aria-label={`${a.label}: text`} checked={c.text} disabled={busy} onChange={(e) => save({ text: e.target.checked })} /></span>
              </div>
            );
          })}
        </div>
        <p className="sh-hint mt-2">A notification also needs &ldquo;Notifications on&rdquo; above. Email and text need the address or number above, and the connection below.</p>
      </Card>

      <Card>
        <h2 className="sh-h2">Every Box reminders</h2>
        <p className="sh-muted">Box by box: remind me when it hasn&apos;t been done in a chosen number of days, at a chosen hour, by the ways I pick, once or every day until it&apos;s done.</p>
        <Link href="/every-box/reminders" className="sh-btn sh-btn-primary mt-2">Choose my box reminders</Link>
      </Card>

      <Note>
        Nothing here reaches {partner?.displayName ?? "your partner"}. A notification says only what you would see in {APP_DISPLAY_NAME} anyway, never anything private.
      </Note>
    </div>
  );
}

function SetupNote({ kind }: { kind: "email" | "text" }) {
  return (
    <details className="sh-menu mt-2">
      <summary>{kind === "email" ? "Email isn't connected yet. How to connect it" : "Texting isn't connected yet. How to connect it"}</summary>
      <div className="sh-stack-sm" style={{ marginTop: "0.5rem" }}>
        {kind === "email" ? (
          <ol className="sh-list" style={{ paddingLeft: "1.2rem" }}>
            <li>Make a free account at brevo.com (300 emails a day on the free plan; no domain needed).</li>
            <li>In Brevo: Senders &amp; IP, add your own email address as a sender, and confirm it from your inbox.</li>
            <li>In Brevo: SMTP &amp; API, API Keys, make a key and copy it.</li>
            <li>In the Convex dashboard (dashboard.convex.dev), open the-shire&apos;s production deployment, Settings, Environment Variables. Add <code className="sh-code">BREVO_API_KEY</code> with the key, and <code className="sh-code">EMAIL_FROM</code> with the sender address you confirmed. Optional: <code className="sh-code">EMAIL_FROM_NAME</code>, like The Shire.</li>
            <li>Come back here. This note goes away once both are set.</li>
          </ol>
        ) : (
          <ol className="sh-list" style={{ paddingLeft: "1.2rem" }}>
            <li>Make an account at twilio.com and get a phone number (a trial can text only numbers you verify there; a paid number is about a dollar a month plus a cent or so per text).</li>
            <li>From the Twilio console, copy the Account SID, the Auth Token, and your Twilio number.</li>
            <li>In the Convex dashboard (dashboard.convex.dev), open the-shire&apos;s production deployment, Settings, Environment Variables. Add <code className="sh-code">TWILIO_ACCOUNT_SID</code>, <code className="sh-code">TWILIO_AUTH_TOKEN</code>, and <code className="sh-code">TWILIO_FROM</code> (the number, like +15555550123).</li>
            <li>Come back here. This note goes away once all three are set.</li>
          </ol>
        )}
      </div>
    </details>
  );
}
