/**
 * Love & Release lives inside The Shire at /love-and-release/app/. The Shire
 * opens it with ?who=her|john so each person gets their own on-device
 * database on a shared phone or laptop. Jen's is the original database
 * ("love-and-release"), so nothing she has written moves; John's gets its own
 * name. Nothing else is read from the address. The value is remembered on the
 * device so reloads and installed-app opens stay with the same person.
 */
export type Person = 'her' | 'john'

const KEY = 'lr:person'

export const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')
/** The Shire page this app is opened from; "Switch person" and a full reset go back there. */
export const SHIRE_PAGE = '/love-and-release'

export function getPerson(): Person {
  try { return localStorage.getItem(KEY) === 'john' ? 'john' : 'her' } catch { return 'her' }
}

export function setPerson(p: Person): void {
  try { localStorage.setItem(KEY, p) } catch { /* ignore */ }
}

/** "" for Jen (the original database and markers), "-john" for John. */
export function personSuffix(p: Person = getPerson()): string {
  return p === 'john' ? '-john' : ''
}

/** Called once at startup, before any database opens. */
export function takeHandoff(): void {
  let url: URL
  try { url = new URL(window.location.href) } catch { return }
  const who = url.searchParams.get('who')
  if (who !== 'her' && who !== 'john') return
  setPerson(who)
  url.searchParams.delete('who')
  const q = [...url.searchParams.keys()].length ? `?${url.searchParams}` : ''
  try { window.history.replaceState(null, '', url.pathname + q + url.hash) } catch { /* ignore */ }
}
