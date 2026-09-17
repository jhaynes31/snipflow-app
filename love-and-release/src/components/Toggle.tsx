interface Props { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }

export function Toggle({ label, hint, checked, onChange }: Props) {
  return (
    <div className="switch">
      <div>
        <div style={{ fontWeight: 700 }}>{label}</div>
        {hint && <div className="help">{hint}</div>}
      </div>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} className="toggle" onClick={() => onChange(!checked)} />
    </div>
  )
}
