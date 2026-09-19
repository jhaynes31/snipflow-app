import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import { DEFAULT_SETTINGS, type Settings } from '@/db/types'

/** undefined while loading, so callers can avoid rendering before the passcode state is known. */
export function useSettingsMaybe(): Settings | undefined {
  return useLiveQuery(async () => (await db.settings.get('settings')) ?? DEFAULT_SETTINGS, [])
}

export function useSettings(): Settings {
  return useSettingsMaybe() ?? DEFAULT_SETTINGS
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  const current = (await db.settings.get('settings')) ?? DEFAULT_SETTINGS
  await db.settings.put({ ...current, ...patch, id: 'settings' })
}

export function applyTheme(s: Settings): void {
  const root = document.documentElement
  root.dataset.theme = s.theme
  root.dataset.textSize = s.textSize
  root.dataset.reduceMotion = s.reduceMotion ? 'true' : 'false'
  const dark =
    s.theme === 'dark' || (s.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#1F261C' : '#F5EFE0')
}
