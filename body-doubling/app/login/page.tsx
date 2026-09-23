"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useConvexAuth, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/convex/_generated/api";
import { Card, ErrorNote, useRun } from "@/components/ui";

function safeNext(raw: string | null): string {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/portal";
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const { isAuthenticated } = useConvexAuth();
  const { signIn } = useAuthActions();
  const ensure = useMutation(api.members.ensure);
  const [flow, setFlow] = useState<"signIn" | "signUp">(params.get("flow") === "signUp" ? "signUp" : "signIn");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { busy, error, setError, run } = useRun();

  useEffect(() => {
    if (!isAuthenticated) return;
    void (async () => {
      if (flow === "signUp") await ensure({ name });
      router.replace(next);
    })();
  }, [isAuthenticated, flow, name, ensure, next, router]);

  return (
    <div className="mx-auto max-w-md space-y-4 pt-6">
      <h1 className="text-3xl font-bold">{flow === "signIn" ? "Welcome back" : "Join the community"}</h1>
      <p className="muted">
        {flow === "signIn" ? "Sign in to book with your hours." : "Make your account, then start your membership from your portal."}
      </p>
      <Card>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              try {
                await signIn("password", { email, password, flow, ...(flow === "signUp" ? { name } : {}) });
              } catch (err) {
                setError(
                  flow === "signIn"
                    ? "That email and password didn't match. First time here? Switch to “Make my account”."
                    : "Couldn't make that account. Maybe it already exists? Passwords need at least 8 characters.",
                );
                console.warn(err);
              }
            });
          }}
        >
          {flow === "signUp" && (
            <div>
              <label className="label" htmlFor="n">What should we call you?</label>
              <input id="n" className="input" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
            </div>
          )}
          <div>
            <label className="label" htmlFor="e">Email</label>
            <input id="e" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div>
            <label className="label" htmlFor="p">Password</label>
            <input
              id="p"
              className="input"
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={flow === "signIn" ? "current-password" : "new-password"}
            />
          </div>
          <ErrorNote error={error} />
          <button className="btn w-full" disabled={busy}>
            {flow === "signIn" ? "Sign in" : "Make my account"}
          </button>
          <button
            type="button"
            className="link block w-full text-center text-sm"
            onClick={() => {
              setFlow(flow === "signIn" ? "signUp" : "signIn");
              setError(null);
            }}
          >
            {flow === "signIn" ? "First time here? Make my account" : "Already have an account? Sign in"}
          </button>
        </form>
      </Card>
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
