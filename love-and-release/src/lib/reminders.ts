import type { Reminder } from '@/db/types'
import { dayKey } from './dates'

const FIRED_KEY = 'lr:reminder-fired'

export const notificationsSupported = () => 'Notification' in window

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'denied'
  if (Notification.permission !== 'default') return Notification.permission
  return Notification.requestPermission()
}

/**
 * Gentle, local reminders. With no backend there is no push; reminders fire
 * while the app is open (or installed and running in the background on
 * platforms that allow it). Each reminder fires at most once per day.
 */
export function checkReminders(reminders: Reminder[]): void {
  if (!notificationsSupported() || Notification.permission !== 'granted') return
  const nowD = new Date()
  const hhmm = `${String(nowD.getHours()).padStart(2, '0')}:${String(nowD.getMinutes()).padStart(2, '0')}`
  const fired: Record<string, string> = JSON.parse(localStorage.getItem(FIRED_KEY) ?? '{}')
  const today = dayKey(nowD)
  for (const r of reminders) {
    if (!r.enabled || r.time !== hhmm || fired[r.id] === today) continue
    fired[r.id] = today
    try {
      new Notification('Love & Release', { body: r.label || 'A gentle check-in, whenever you\'re ready.', icon: '/icon-192.png', silent: true })
    } catch {
      /* some platforms only allow notifications from a service worker */
    }
  }
  localStorage.setItem(FIRED_KEY, JSON.stringify(fired))
}
