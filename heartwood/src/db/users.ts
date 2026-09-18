/**
 * Two people share this app (Section 1 is single-user; this extends it to a
 * household of two). Each person gets a separate on-device database so plans,
 * logs, trees and stickers never mix. The active person is remembered on the
 * device and switching reloads the app so every module sees the right database.
 */
export type UserId = 'her' | 'john';
export type BodyType = 'woman' | 'man';

export interface UserDef { id: UserId; label: string; bodyType: BodyType }

export const USERS: UserDef[] = [
  { id: 'her', label: 'Me', bodyType: 'woman' },
  { id: 'john', label: 'John', bodyType: 'man' },
];

export const USER_MAP = Object.fromEntries(USERS.map((u) => [u.id, u])) as Record<UserId, UserDef>;

const KEY = 'heartwood:activeUser';

export function getActiveUserId(): UserId | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'her' || v === 'john' ? v : null;
  } catch { return null; }
}

export function setActiveUserId(id: UserId | null): void {
  try { if (id) localStorage.setItem(KEY, id); else localStorage.removeItem(KEY); } catch { /* ignore */ }
}

export function dbNameFor(id: UserId | null): string {
  return id ? `heartwood-${id}` : 'heartwood-unassigned';
}
