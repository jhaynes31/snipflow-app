"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { APP_DISPLAY_NAME } from "@/core/config";
import { Btn, Card, ErrorNote, Field, useAction } from "@/core/ui";

function guessTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** First sign-in: one screen, two fields. Everything else can wait. */
export function Setup({ email }: { email: string | null }) {
  const create = useMutation(api.profiles.create);
  const [displayName, setDisplayName] = useState("");
  const [timeZone, setTimeZone] = useState(guessTimeZone);
  const { busy, error, run } = useAction();

  return (
    <div className="sh-container sh-narrow">
      <p className="sh-eyebrow">{APP_DISPLAY_NAME}</p>
      <h1 className="sh-h1">Welcome home.</h1>
      <p className="sh-muted">Signed in as {email ?? "you"}. Two quick things and you&apos;re in.</p>
      <Card className="mt-6">
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => create({ displayName, timeZone }));
          }}
        >
          <Field label="What should we call you?">
            <input className="sh-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40} required autoFocus />
          </Field>
          <Field label="Your time zone" hint="Used for your daily check-in time.">
            <input className="sh-input" value={timeZone} onChange={(e) => setTimeZone(e.target.value)} maxLength={64} required />
          </Field>
          <ErrorNote error={error} />
          <Btn type="submit" big disabled={busy || !displayName.trim()}>
            Come in
          </Btn>
        </form>
      </Card>
    </div>
  );
}
