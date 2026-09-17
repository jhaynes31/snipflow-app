import { db } from '@/db/db'
import { markUnseeded } from '@/db/seed'
import { DEFAULT_SETTINGS } from '@/db/types'

export interface Backup {
  app: 'love-and-release'
  version: 1
  exportedAt: string
  data: Record<string, unknown[]>
}

const TABLES = ['people', 'reciprocity', 'checkIns', 'pauses', 'truths', 'boundaries', 'releases', 'wins', 'settings', 'rings', 'ringMoves', 'trustSignals', 'redFlags', 'disclosures', 'layerBoundaries', 'reviewSessions', 'loopEpisodes', 'thoughtThemes', 'exposureSteps', 'exposureSessions', 'coreValues', 'selfProfile', 'breathPrayers', 'reassuranceLog', 'relapsePlan', 'skillPractices'] as const

export async function exportBackup(): Promise<Backup> {
  const data: Record<string, unknown[]> = {}
  for (const t of TABLES) data[t] = await db.table(t).toArray()
  return { app: 'love-and-release', version: 1, exportedAt: new Date().toISOString(), data }
}

export async function downloadBackup(): Promise<void> {
  const backup = await exportBackup()
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `love-and-release-backup-${backup.exportedAt.slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function parseBackup(text: string): Backup {
  const parsed = JSON.parse(text) as Partial<Backup>
  if (parsed.app !== 'love-and-release' || !parsed.data || typeof parsed.data !== 'object') {
    throw new Error('This file doesn\'t look like a Love & Release backup.')
  }
  return parsed as Backup
}

/** mode 'merge' keeps existing entries and adds/updates from the file; 'replace' clears first. */
export async function importBackup(backup: Backup, mode: 'merge' | 'replace'): Promise<void> {
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    if (mode === 'replace') for (const t of TABLES) await db.table(t).clear()
    for (const t of TABLES) {
      const rows = backup.data[t]
      if (Array.isArray(rows) && rows.length) await db.table(t).bulkPut(rows)
    }
    if (!(await db.settings.get('settings'))) await db.settings.put(DEFAULT_SETTINGS)
  })
  localStorage.setItem('lr:seeded:v1', '1')
  localStorage.setItem('lr:rings-seeded:v1', '1')
  localStorage.setItem('lr:grace-seeded:v1', '1')
}

export async function resetEverything(): Promise<void> {
  await db.delete()
  markUnseeded()
  Object.keys(localStorage)
    .filter((k) => k.startsWith('lr:'))
    .forEach((k) => localStorage.removeItem(k))
  sessionStorage.clear()
}
