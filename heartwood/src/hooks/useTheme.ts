import { useEffect } from 'react';
import type { UserProfile } from '@/domain/types';

/** Applies theme/sensory data-attributes to <html> from the profile (Sections 3.2, 14, 15). */
export function useApplyTheme(profile: UserProfile | undefined) {
  useEffect(() => {
    const root = document.documentElement;
    const mode = profile?.themeMode ?? 'system';
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = mode === 'dark' || (mode === 'system' && !!mq?.matches);
      root.dataset.theme = dark ? 'dark' : 'light';
      const meta = document.querySelector('meta[name="theme-color"]');
      meta?.setAttribute('content', dark ? '#1F3322' : '#2F4A2E');
    };
    apply();
    mq?.addEventListener?.('change', apply);
    root.dataset.reducedMotion = String(!!profile?.sensorySettings.reducedMotion);
    root.dataset.outdoor = String(!!profile?.sensorySettings.outdoorMode);
    return () => mq?.removeEventListener?.('change', apply);
  }, [profile?.themeMode, profile?.sensorySettings.reducedMotion, profile?.sensorySettings.outdoorMode]);
}
