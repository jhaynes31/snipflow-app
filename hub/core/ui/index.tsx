"use client";

import Link from "next/link";
import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Lock, Users } from "lucide-react";
import type { Visibility } from "@/convex/privacy";

type Variant = "primary" | "secondary" | "ghost" | "accent";

export function Btn({
  variant = "primary",
  big,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; big?: boolean }) {
  return (
    <button
      type="button"
      className={`sh-btn sh-btn-${variant} ${big ? "sh-btn-big" : ""} ${className ?? ""}`}
      {...props}
    />
  );
}

export function LinkBtn({
  href,
  variant = "primary",
  big,
  children,
  className,
}: {
  href: string;
  variant?: Variant;
  big?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={`sh-btn sh-btn-${variant} ${big ? "sh-btn-big" : ""} ${className ?? ""}`}>
      {children}
    </Link>
  );
}

export function Card({ children, className, tone }: { children: ReactNode; className?: string; tone?: "alt" }) {
  return <section className={`sh-card ${tone === "alt" ? "sh-card-alt" : ""} ${className ?? ""}`}>{children}</section>;
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="sh-label">{label}</span>
      {children}
      {hint && <span className="sh-hint">{hint}</span>}
    </label>
  );
}

export function ErrorNote({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p className="sh-error" role="alert">
      {error}
    </p>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <p className="sh-note" role="status">
      {children}
    </p>
  );
}

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="sh-page-title">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="sh-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="sh-spinner" role="status">
      <span className="sh-spinner-dot" aria-hidden />
      {label}
    </div>
  );
}

/** The lock (private) or two-person (shared) mark every owned item carries. */
export function VisibilityMark({ visibility }: { visibility: Visibility }) {
  if (visibility === "private") {
    return (
      <span className="sh-vis" title="Private. Only you can see this.">
        <Lock size={14} aria-hidden /> Private
      </span>
    );
  }
  return (
    <span className="sh-vis sh-vis-shared" title={visibility === "shared" ? "Shared with your partner." : "Your partner sees a summary."}>
      <Users size={14} aria-hidden /> {visibility === "shared" ? "Shared" : "Summary shared"}
    </span>
  );
}

/** Turn a thrown Convex error into a short, human sentence. */
export function errorMessage(err: unknown): string {
  if (err instanceof Error) {
    const m = err.message.match(/(?:Uncaught )?Error: (.*?)(?:\n|$)/);
    return (m?.[1] ?? err.message).trim();
  }
  return "Something went wrong. Nothing was lost.";
}

/** One-shot async actions with error capture and a busy flag. */
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

export function Toggle({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <label className="sh-toggle">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="sh-toggle-label">{label}</span>
        {hint && <span className="sh-hint">{hint}</span>}
      </span>
    </label>
  );
}

export function timeAgo(ms: number, now = Date.now()): string {
  const mins = Math.max(0, Math.round((now - ms) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}
