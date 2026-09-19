import { useCallback, useEffect, useRef, useState } from 'react'

const PREFIX = 'lr:draft:'

export function readDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function clearDraft(key: string): void {
  localStorage.removeItem(PREFIX + key)
}

export function hasDraft(key: string): boolean {
  return localStorage.getItem(PREFIX + key) !== null
}

/** Auto-saving state: interruptions never lose progress. */
export function useDraft<T extends object>(key: string, initial: T): [T, (patch: Partial<T> | ((prev: T) => T)) => void, () => void] {
  const [state, setState] = useState<T>(() => ({ ...initial, ...(readDraft<T>(key) ?? {}) }))
  const first = useRef(true)
  const initialRef = useRef(initial)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    try {
      const json = JSON.stringify(state)
      // Only keep a draft when something has actually been entered.
      if (json === JSON.stringify(initialRef.current)) localStorage.removeItem(PREFIX + key)
      else localStorage.setItem(PREFIX + key, json)
    } catch {
      /* storage may be unavailable; drafts are a convenience */
    }
  }, [key, state])
  const update = useCallback((patch: Partial<T> | ((prev: T) => T)) => {
    setState((prev) => (typeof patch === 'function' ? patch(prev) : { ...prev, ...patch }))
  }, [])
  const reset = useCallback(() => {
    clearDraft(key)
    setState(initialRef.current)
  }, [key])
  return [state, update, reset]
}
