"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { APP_DESCRIPTION, APP_DISPLAY_NAME } from "@/core/config";
import { COPY } from "@/core/copy/strings";
import { Btn, Card, ErrorNote, Field, useAction } from "@/core/ui";

function safeNext(raw: string | null): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/";
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const { isAuthenticated } = useConvexAuth();
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { busy, error, run, setError } = useAction();

  useEffect(() => {
    if (isAuthenticated) router.replace(next);
  }, [isAuthenticated, next, router]);

  return (
    <div className="sh-container sh-narrow">
      <p className="sh-eyebrow">{APP_DISPLAY_NAME}</p>
      <h1 className="sh-h1">{flow === "signIn" ? COPY.welcomeBack : "Let's make your account."}</h1>
      <p className="sh-muted">{APP_DESCRIPTION}</p>
      <Card className="mt-6">
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              try {
                await signIn("password", { email, password, flow });
              } catch (err) {
                setError(
                  flow === "signIn"
                    ? "That email and password didn't match. Check them, or switch to “Make my account” if this is your first time."
                    : "Couldn't make that account. This home has room for exactly two people, and the password needs at least 8 characters.",
                );
                throw err;
              }
            }).catch(() => undefined);
          }}
        >
          <Field label="Email">
            <input className="sh-input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Password">
            <input
              className="sh-input"
              type="password"
              autoComplete={flow === "signIn" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </Field>
          <ErrorNote error={error} />
          <Btn type="submit" big disabled={busy}>
            {flow === "signIn" ? "Sign in" : "Make my account"}
          </Btn>
          <button
            type="button"
            className="sh-link"
            onClick={() => {
              setFlow(flow === "signIn" ? "signUp" : "signIn");
              setError(null);
            }}
          >
            {flow === "signIn" ? "First time here? Make my account" : "Already have an account? Sign in"}
          </button>
        </form>
      </Card>
      <p className="mt-6 text-center">
        <Link href="/help-now" className="sh-link">
          {COPY.needHelpNow}
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
