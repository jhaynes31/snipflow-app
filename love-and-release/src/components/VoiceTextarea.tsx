import { useId } from 'react'
import { useSpeech } from '@/lib/speech'
import { MicIcon } from './Icons'

interface Props {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  label?: string
  rows?: number
  large?: boolean
  single?: boolean
}

/** Free text is always optional. Voice entry appears when the browser supports it. */
export function VoiceTextarea({ value, onChange, placeholder, label, large, single }: Props) {
  const id = useId()
  const { listening, start, stop, supported } = useSpeech((text) => onChange(value ? `${value} ${text}` : text))
  return (
    <div className="field">
      {label && <label className="label" htmlFor={id}>{label}</label>}
      {single ? (
        <input id={id} className="input" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <textarea id={id} className={`textarea ${large ? 'textarea-lg' : ''}`} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
      {supported && (
        <div className="row-between">
          <span className="help">{listening ? 'Listening… tap to stop.' : 'Typing is optional. You can speak instead.'}</span>
          <button
            type="button"
            className={`btn btn-sm ${listening ? 'btn-primary' : 'btn-ghost'}`}
            aria-pressed={listening}
            onClick={listening ? stop : start}
          >
            <MicIcon /> {listening ? 'Stop' : 'Speak'}
          </button>
        </div>
      )}
    </div>
  )
}
