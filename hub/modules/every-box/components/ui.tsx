"use client";

import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

export function Btn({
  variant = "primary",
  small,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; small?: boolean }) {
  return (
    <button
      type="button"
      className={`eb-btn eb-btn-${variant} ${small ? "eb-btn-sm" : ""} ${className ?? ""}`}
      {...props}
    />
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="eb-label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs eb-muted">{hint}</span>}
    </label>
  );
}

export function ErrorNote({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p className="eb-error" role="alert">
      {error}
    </p>
  );
}

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm eb-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm eb-muted" role="status">
      <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      {label}…
    </div>
  );
}

/** Turn a thrown Convex error into a short, human sentence. */
export function errorMessage(err: unknown): string {
  if (err instanceof Error) {
    // Convex wraps thrown errors as "Uncaught Error: <message>" and appends a stack.
    const m = err.message.match(/(?:Uncaught )?Error: (.*?)(?:\n|$)/);
    return (m?.[1] ?? err.message).trim();
  }
  return "Something went wrong.";
}

/** Small helper hook for one-shot async actions with error capture. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      setError(errorMessage(err));
      return undefined;
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, run, setError };
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Btn
      variant="secondary"
      small
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          window.prompt("Copy this:", text);
        }
      }}
    >
      {copied ? "Copied" : label}
    </Btn>
  );
}
