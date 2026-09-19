import { useState } from 'react'
import { PlusIcon } from './Icons'

interface Props {
  options: string[]
  value: string[]
  onChange: (next: string[]) => void
  allowCustom?: boolean
  customLabel?: string
  single?: boolean
  variant?: 'accent' | 'sage'
}

/** Tap-to-select chips. Multi-select by default; optional custom entry. */
export function Chips({ options, value, onChange, allowCustom, customLabel = 'Add my own', single, variant = 'accent' }: Props) {
  const [adding, setAdding] = useState(false)
  const [custom, setCustom] = useState('')
  const toggle = (opt: string) => {
    if (single) return onChange(value.includes(opt) ? [] : [opt])
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt])
  }
  const extras = value.filter((v) => !options.includes(v))
  const commit = () => {
    const t = custom.trim()
    if (t && !value.includes(t)) onChange(single ? [t] : [...value, t])
    setCustom('')
    setAdding(false)
  }
  return (
    <div className="stack">
      <div className="chips" role="group">
        {[...options, ...extras].map((opt) => (
          <button
            key={opt}
            type="button"
            className={`chip ${variant === 'sage' ? 'chip-sage' : ''}`}
            aria-pressed={value.includes(opt)}
            onClick={() => toggle(opt)}
          >
            {opt}
          </button>
        ))}
        {allowCustom && !adding && (
          <button type="button" className="chip" onClick={() => setAdding(true)}>
            <PlusIcon /> {customLabel}
          </button>
        )}
      </div>
      {adding && (
        <div className="row">
          <input
            className="input grow"
            autoFocus
            value={custom}
            placeholder="Type it in your own words"
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit()
              if (e.key === 'Escape') setAdding(false)
            }}
          />
          <button type="button" className="btn btn-sm btn-primary" onClick={commit}>Add</button>
        </div>
      )}
    </div>
  )
}
