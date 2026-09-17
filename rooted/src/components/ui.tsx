import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'start';
type Size = 'sm' | 'md' | 'lg';

export function Button({ variant = 'primary', size = 'md', className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  const v = variant === 'start' ? 'btn-start' : `btn-${variant}`;
  const s = size === 'md' ? '' : `btn-${size}`;
  return <button type="button" className={`btn ${v} ${s} ${className}`} {...rest} />;
}

export function LinkButton({ to, variant = 'ghost', size = 'md', className = '', children }: { to: string; variant?: Variant; size?: Size; className?: string; children: ReactNode }) {
  const v = variant === 'start' ? 'btn-start' : `btn-${variant}`;
  const s = size === 'md' ? '' : `btn-${size}`;
  return <Link to={to} className={`btn ${v} ${s} ${className}`}>{children}</Link>;
}

export function Card({ children, className = '', soft = false, ...rest }: HTMLAttributes<HTMLElement> & { children: ReactNode; className?: string; soft?: boolean }) {
  return <section className={`${soft ? 'card-soft' : 'card'} ${className}`} {...rest}>{children}</section>;
}

export function Callout({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`callout ${className}`}>{children}</div>;
}

export function Chip({ active, children, onClick, className = '' }: { active?: boolean; children: ReactNode; onClick?: () => void; className?: string }) {
  return <button type="button" className={`chip ${className}`} aria-pressed={!!active} onClick={onClick}>{children}</button>;
}

export function Stepper({ value, onChange, min = 0, max = 999, step = 1, label, format }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; label: string; format?: (v: number) => string }) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" aria-label={`Decrease ${label}`} onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))}>−</button>
      <output aria-live="polite">{format ? format(value) : value}</output>
      <button type="button" aria-label={`Increase ${label}`} onClick={() => onChange(Math.min(max, +(value + step).toFixed(2)))}>+</button>
    </div>
  );
}

export function ProgressBar({ value, max, label }: { value: number; max: number; label?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return <div className="progress-bar" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={label}><div style={{ width: `${pct}%` }} /></div>;
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex items-center justify-between gap-4 py-2 cursor-pointer">
      <span><span className="block">{label}</span>{hint && <span className="muted text-sm font-normal block">{hint}</span>}</span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-12 h-7 accent-[var(--secondary)]" />
    </label>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="stack-sm">
      <label className="block">{label}</label>
      {hint && <p className="muted text-sm">{hint}</p>}
      {children}
    </div>
  );
}
