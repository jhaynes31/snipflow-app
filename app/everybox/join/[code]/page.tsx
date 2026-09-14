"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Btn, ErrorNote, Field, Spinner, useAction } from "@/components/everybox/ui";

export default function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const info = useQuery(api.everybox.households.inviteInfo, { code });
  const me = useQuery(api.everybox.households.me, isAuthenticated ? {} : "skip");
  const join = useMutation(api.everybox.households.join);
  const [displayName, setDisplayName] = useState("");
  const { busy, error, run } = useAction();

  if (info === undefined || isLoading) return <Spinner label="Checking that invite" />;

  const loginHref = `/everybox/login?next=${encodeURIComponent(`/everybox/join/${code}`)}`;

  return (
    <div className="eb-container max-w-md">
      <div className="eb-fade-in mt-8 md:mt-16">
        <p className="text-sm eb-muted">Every Box invite</p>
        {info === null ? (
          <>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">That link has expired.</h1>
            <p className="mt-2 eb-muted">Ask your partner for a fresh invite from their settings page.</p>
            <Link href="/everybox" className="eb-btn eb-btn-secondary mt-6">
              Go to Every Box
            </Link>
          </>
        ) : (
          <>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              {info.partnerNames[0] ?? "Your partner"} invited you to {info.householdName}.
            </h1>
            {info.full ? (
              <p className="mt-2 eb-muted">This household already has two partners.</p>
            ) : !isAuthenticated ? (
              <>
                <p className="mt-2 eb-muted">Sign in or create an account first, then you&apos;ll land right back here.</p>
                <Link href={loginHref} className="eb-btn eb-btn-primary mt-6">
                  Sign in to accept
                </Link>
              </>
            ) : me?.onboarded ? (
              <>
                <p className="mt-2 eb-muted">You&apos;re already part of {me.household.name}.</p>
                <Link href="/everybox" className="eb-btn eb-btn-secondary mt-6">
                  Open Every Box
                </Link>
              </>
            ) : (
              <form
                className="eb-card mt-8 grid gap-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(async () => {
                    await join({ code, displayName });
                    router.replace("/everybox");
                  });
                }}
              >
                <Field label="What should your partner call you here?">
                  <input
                    className="eb-input"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your first name"
                    required
                    maxLength={40}
                    autoFocus
                  />
                </Field>
                <ErrorNote error={error} />
                <Btn type="submit" disabled={busy}>
                  Join {info.householdName}
                </Btn>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
