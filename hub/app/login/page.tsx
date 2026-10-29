"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
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
  const [flow, setFlow] = useState<"signIn" | "signUp" | "forgot">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { busy, error, run, setError } = useAction();

  useEffect(() => {
    if (isAuthenticated) router.replace(next);
  }, [isAuthenticated, next, router]);

  if (flow === "forgot") {
    return <Forgot email={email} onEmail={setEmail} onBack={() => { setFlow("signIn"); setError(null); }} />;
  }

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
          {flow === "signIn" && (
            <button type="button" className="sh-link" onClick={() => { setFlow("forgot"); setError(null); }}>
              Forgot your password?
            </button>
          )}
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

/**
 * Forgot your password (2026-10-29): ask for a six-digit code, then type it
 * with a new password. The code goes by email when email is connected;
 * until then the other one of you can read it out from their Settings.
 */
function Forgot({ email, onEmail, onBack }: { email: string; onEmail: (e: string) => void; onBack: () => void }) {
  const { signIn } = useAuthActions();
  const how = useQuery(api.passwordReset.how);
  const [step, setStep] = useState<"ask" | "code">("ask");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const { busy, error, run, setError } = useAction();

  return (
    <div className="sh-container sh-narrow">
      <p className="sh-eyebrow">{APP_DISPLAY_NAME}</p>
      <h1 className="sh-h1">Let&apos;s get you back in.</h1>
      <p className="sh-muted">
        {how === undefined
          ? "One moment."
          : how.email
            ? "A six-digit code goes to your email. Type it here with a new password."
            : "A six-digit code is made for you. Until email is connected to The Shire, the other one of you can read it out from their Settings page (under “Help your partner back in”). Type it here with a new password."}
      </p>
      <Card className="mt-6">
        {step === "ask" ? (
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                try {
                  await signIn("password", { email: email.trim().toLowerCase(), flow: "reset" });
                  setStep("code");
                } catch (err) {
                  setError("Couldn't start a reset for that email. Check it's the address you sign in with.");
                  throw err;
                }
              }).catch(() => undefined);
            }}
          >
            <Field label="Email">
              <input className="sh-input" type="email" autoComplete="email" value={email} onChange={(e) => onEmail(e.target.value)} required />
            </Field>
            <ErrorNote error={error} />
            <Btn type="submit" big disabled={busy || !email.trim()}>
              Send me a code
            </Btn>
            <button type="button" className="sh-link" onClick={onBack}>Back to sign in</button>
          </form>
        ) : (
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                try {
                  await signIn("password", { email: email.trim().toLowerCase(), code: code.trim(), newPassword, flow: "reset-verification" });
                } catch (err) {
                  setError("That code didn't work. Codes last fifteen minutes and work once; ask for a new one if it's been a while.");
                  throw err;
                }
              }).catch(() => undefined);
            }}
          >
            <p className="sh-hint">A code is on its way for <strong>{email}</strong>.</p>
            <Field label="The six-digit code">
              <input className="sh-input" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} required />
            </Field>
            <Field label="New password" hint="At least 8 characters.">
              <input className="sh-input" type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
            </Field>
            <ErrorNote error={error} />
            <Btn type="submit" big disabled={busy || code.length !== 6 || newPassword.length < 8}>
              Set my new password and sign in
            </Btn>
            <div className="sh-row sh-wrap">
              <button type="button" className="sh-link" onClick={() => { setStep("ask"); setError(null); }}>Send another code</button>
              <button type="button" className="sh-link" onClick={onBack}>Back to sign in</button>
            </div>
          </form>
        )}
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
