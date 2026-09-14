"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Btn, ErrorNote, Field, useAction } from "@/components/everybox/ui";

function safeNext(raw: string | null): string {
  if (raw && raw.startsWith("/everybox")) return raw;
  return "/everybox";
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
    <div className="eb-container max-w-md">
      <div className="eb-fade-in mt-8 md:mt-16">
        <p className="text-sm eb-muted">Every Box</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          {flow === "signIn" ? "Welcome back." : "Let's set you up."}
        </h1>
        <p className="mt-2 eb-muted">
          A calm, shared view of how recently each part of life has been tended. No scores, no
          streaks, no nagging.
        </p>
        <form
          className="eb-card mt-8 grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              try {
                await signIn("password", { email, password, flow });
              } catch (err) {
                if (flow === "signIn") {
                  setError(
                    "That didn't match an account. Check the password, or switch to “Create an account”.",
                  );
                } else {
                  setError("Couldn't create that account. Use a password of at least 8 characters.");
                }
                throw err;
              }
            }).catch(() => undefined);
          }}
        >
          <Field label="Email">
            <input
              className="eb-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Field label="Password">
            <input
              className="eb-input"
              type="password"
              autoComplete={flow === "signIn" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </Field>
          <ErrorNote error={error} />
          <Btn type="submit" disabled={busy}>
            {flow === "signIn" ? "Sign in" : "Create account"}
          </Btn>
          <button
            type="button"
            className="text-sm underline eb-muted"
            onClick={() => {
              setFlow(flow === "signIn" ? "signUp" : "signIn");
              setError(null);
            }}
          >
            {flow === "signIn" ? "New here? Create an account" : "Already have an account? Sign in"}
          </button>
        </form>
      </div>
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
