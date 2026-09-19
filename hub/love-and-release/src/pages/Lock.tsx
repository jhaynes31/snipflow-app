import { useEffect, useState } from 'react'
import { hashPasscode, setUnlocked } from '@/lib/passcode'
import type { Settings } from '@/db/types'

export function Lock({ settings, onUnlock }: { settings: Settings; onUnlock: () => void }) {
  const [pin, setPin] = useState('')
  const [wrong, setWrong] = useState(false)

  // Check on every change so fast taps are never dropped; ignore stale results.
  useEffect(() => {
    if (pin.length < 4 || !settings.passcodeHash || !settings.passcodeSalt) return
    let stale = false
    hashPasscode(pin, settings.passcodeSalt).then((h) => {
      if (stale) return
      if (h === settings.passcodeHash) {
        setUnlocked(true)
        onUnlock()
      } else if (pin.length >= 8) {
        setWrong(true)
        setPin('')
      }
    })
    return () => { stale = true }
  }, [pin, settings.passcodeHash, settings.passcodeSalt, onUnlock])

  const press = (d: string) => {
    setWrong(false)
    setPin((p) => (p.length >= 8 ? p : p + d))
  }

  return (
    <div className="lock fade">
      <div>
        <div className="brand" style={{ color: 'var(--text-soft)', fontWeight: 800 }}>Love &amp; Release</div>
        <h1 style={{ marginTop: 8 }}>Welcome back.</h1>
        <p className="muted">Enter your passcode whenever you're ready.</p>
      </div>
      <div className="pin-dots" aria-label={`${pin.length} digits entered`}>
        {[0, 1, 2, 3, 4, 5, 6, 7].slice(0, Math.max(4, pin.length)).map((i) => (
          <span key={i} className={i < pin.length ? 'on' : ''} />
        ))}
      </div>
      <p className="faint" style={{ minHeight: '1.4rem' }} aria-live="polite">
        {wrong ? "That didn't match. No rush, try again." : pin.length >= 4 ? 'Checking…' : ' '}
      </p>
      <div className="keypad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} type="button" onClick={() => press(d)}>{d}</button>
        ))}
        <button type="button" aria-label="Clear" onClick={() => { setPin(''); setWrong(false) }} style={{ fontSize: '0.9rem' }}>Clear</button>
        <button type="button" onClick={() => press('0')}>0</button>
        <button type="button" aria-label="Delete last digit" onClick={() => setPin((p) => p.slice(0, -1))}>⌫</button>
      </div>
    </div>
  )
}
