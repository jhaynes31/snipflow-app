"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/convex/_generated/api";
import { Btn, ErrorNote, Field, useAction } from "./ui";

/**
 * Shown once, right after sign-in, when the user isn't in a household yet.
 * Two doors: start a household, or join a partner's with their invite code.
 */
export function Onboarding({ email }: { email: string | null }) {
  const [mode, setMode] = useState<"pick" | "create" | "join">("pick");
  const [displayName, setDisplayName] = useState("");
  const [householdName, setHouseholdName] = useState("");
  const [code, setCode] = useState("");
  const create = useMutation(api.everybox.households.create);
  const join = useMutation(api.everybox.households.join);
  const { signOut } = useAuthActions();
  const { busy, error, run } = useAction();

  return (
    <div className="eb-container max-w-lg">
      <div className="eb-fade-in mt-6 md:mt-14">
        <p className="text-sm eb-muted">Every Box</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Welcome in.</h1>
        <p className="mt-2 eb-muted">
          Every Box is a shared dashboard for the two of you. Nothing here keeps score. It just
          shows which parts of life have been tended lately, so nobody has to be the one who
          notices.
        </p>

        {mode === "pick" && (
          <div className="mt-8 grid gap-3">
            <button className="eb-card text-left hover:brightness-[0.99]" onClick={() => setMode("create")}>
              <div className="text-lg font-semibold">Start a household</div>
              <div className="text-sm eb-muted">You&apos;ll get an invite link for your partner.</div>
            </button>
            <button className="eb-card text-left hover:brightness-[0.99]" onClick={() => setMode("join")}>
              <div className="text-lg font-semibold">Join with an invite code</div>
              <div className="text-sm eb-muted">Your partner already set things up.</div>
            </button>
            <p className="mt-2 text-xs eb-muted">
              Signed in as {email ?? "you"}.{" "}
              <button className="underline" onClick={() => void signOut()}>
                Not you?
              </button>
            </p>
          </div>
        )}

        {mode !== "pick" && (
          <form
            className="eb-card mt-8 grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                if (mode === "create") await create({ householdName, displayName });
                else await join({ code, displayName });
              });
            }}
          >
            <Field label="What should your partner call you here?">
              <input
                className="eb-input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your first name"
                autoFocus
                required
                maxLength={40}
              />
            </Field>
            {mode === "create" ? (
              <Field label="Household name" hint="Anything you like. “The Haynes house”, “Us”, “HQ”.">
                <input
                  className="eb-input"
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  placeholder="Us"
                  required
                  maxLength={60}
                />
              </Field>
            ) : (
              <Field label="Invite code" hint="Eight letters, from your partner's settings page or invite link.">
                <input
                  className="eb-input font-mono uppercase tracking-widest"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ABCD2345"
                  required
                  maxLength={12}
                />
              </Field>
            )}
            <ErrorNote error={error} />
            <div className="flex gap-2">
              <Btn variant="ghost" onClick={() => setMode("pick")} disabled={busy}>
                Back
              </Btn>
              <Btn type="submit" disabled={busy} className="flex-1">
                {mode === "create" ? "Create household" : "Join household"}
              </Btn>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
