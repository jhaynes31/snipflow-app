/**
 * This app (once Love & Release, now the "Everyone, and me" side of
 * Re-Centered) lives inside The Shire at /love-and-release/app/. The Shire
 * opens it with ?who=her|john so each person gets their own on-device
 * database on a shared phone or laptop. Jen's is the original database
 * ("love-and-release"), so nothing she has written moves; John's gets its own
 * name. Nothing else is read from the address. The value is remembered on the
 * device so reloads and installed-app opens stay with the same person.
 */
export type Person = 'her' | 'john'

const KEY = 'lr:person'
const PLAN_KEY = 'lr:plan'

export const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')
/** The Shire page this app is opened from; a full reset goes back there. */
export const SHIRE_PAGE = '/love-and-release'
/** The "partner, and me" room, kept in The Shire. */
export const SHIRE_ROOM = '/love-and-release/john'
/** The Shire's coach, told it is being opened from Re-Centered. */
export const SHIRE_COACH = '/talk?place=love-and-release'

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
  const plan = url.searchParams.get('plan') === '1'
  if (who !== 'her' && who !== 'john' && !plan) return
  if (who === 'her' || who === 'john') setPerson(who)
  // One yes-or-no for this visit: a word wasn't kept recently, so the plan in the room is ready.
  try { if (plan) sessionStorage.setItem(PLAN_KEY, '1') } catch { /* ignore */ }
  url.searchParams.delete('who')
  url.searchParams.delete('plan')
  const q = [...url.searchParams.keys()].length ? `?${url.searchParams}` : ''
  try { window.history.replaceState(null, '', url.pathname + q + url.hash) } catch { /* ignore */ }
}

/** True when The Shire said, on the way in, that the plan in the room is ready. */
export function planReady(): boolean {
  try { return sessionStorage.getItem(PLAN_KEY) === '1' } catch { return false }
}
