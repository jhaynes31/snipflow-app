import type { ReactNode } from 'react'

/** The companion's voice: a soft bubble, first person, warm. */
export function Speak({ children, tone = 'warm' }: { children: ReactNode; tone?: 'warm' | 'sage' | 'gold' }) {
  return (
    <div className={`speak speak-${tone}`} role="status">
      <span className="speak-dot" aria-hidden="true" />
      <div className="speak-text">{children}</div>
    </div>
  )
}
