import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, defaultProfile, saveProfile } from '@/db/db';
import type { UserProfile } from '@/domain/types';

/**
 * Live profile. Reads only inside the live query (Dexie forbids writes there);
 * the default profile is created from an effect the first time it is missing.
 */
export function useProfile(): UserProfile | undefined {
  const result = useLiveQuery(async () => (await db.profile.get('me')) ?? null, []);
  useEffect(() => {
    if (result === null) db.profile.put(defaultProfile()).catch(() => {});
  }, [result]);
  return result ?? undefined;
}

export async function updateProfile(patch: Partial<UserProfile>) {
  return saveProfile(patch, db);
}
