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
/** The Shire page that frames this app under its toolbar (2026-11-18). */
export const SHIRE_FRAME = '/love-and-release/everyone'

/** True when The Shire has this app open inside its frame. */
export function inShire(): boolean {
  try { return window.self !== window.top } catch { return true }
}

/**
 * Opened on its own (an old link, a bookmark, the installed icon): go to the
 * same screen inside The Shire, so the toolbar is there. Keeps the address
 * and the hand-off (who, plan) intact. Never in the hosted preview.
 */
export function goToShireFrame(): boolean {
  if (__PREVIEW__ || inShire()) return false
  const inner = window.location.pathname.startsWith(BASE) ? window.location.pathname.slice(BASE.length) : ''
  window.location.replace(`${SHIRE_FRAME}${inner === '/' ? '' : inner}${window.location.search}${window.location.hash}`)
  return true
}

/** Tell The Shire which screen is open, so its address bar follows along. */
export function reportRoute(path: string): void {
  if (!inShire()) return
  try { window.parent.postMessage({ type: 'shire:route', app: 'love-and-release', path }, window.location.origin) } catch { /* ignore */ }
}
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
