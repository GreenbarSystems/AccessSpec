import { useCallback, useEffect, useState } from 'react';
import {
  getPreferences,
  setPreferences,
  subscribePreferences,
  type ThemePreference,
} from '../services/UserPreferences';

/**
 * useTheme
 *
 * Tiny dependency-free theme manager. Adds / removes the `.dark` class on
 * <html>, persists the choice via the shared UserPreferences store, and
 * falls back to the user's OS preference when no choice has been saved.
 *
 * Returns:
 *   theme       — 'light' | 'dark', the *effective* theme right now
 *   preference  — 'light' | 'dark' | 'system', what's stored
 *   setPreference(p) — change it (persists across reloads)
 *   toggle()    — flip between light and dark (jumps out of 'system')
 *
 * Pair with Tailwind's `darkMode: 'class'` config (already set). Any time
 * Tailwind sees a `dark:` prefix, those rules apply when <html> has the
 * `.dark` class.
 *
 * Storage lives inside UserPreferences ("accessspec:user-preferences" →
 * `.theme`). The Settings page reads/writes the same key, so toggling
 * the TopBar Sun/Moon button and switching the radio on Settings stay
 * in sync without any extra wiring.
 *
 * Legacy single-key store ("accessspec:theme") is still honoured at
 * boot to migrate users from the pre-UserPreferences build seamlessly.
 */

export type { ThemePreference } from '../services/UserPreferences';
export type ResolvedTheme = 'light' | 'dark';

const LEGACY_KEY = 'accessspec:theme';

function systemPrefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches === true
  );
}

function resolve(pref: ThemePreference): ResolvedTheme {
  if (pref === 'system') return systemPrefersDark() ? 'dark' : 'light';
  return pref;
}

function apply(theme: ResolvedTheme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  // Hint to the browser so native form controls / scrollbars match.
  root.style.colorScheme = theme;
}

/**
 * One-shot migration: if the user has a legacy theme entry but no
 * UserPreferences entry yet, copy it forward and drop the legacy key.
 */
function migrateLegacy(): void {
  if (typeof window === 'undefined') return;
  try {
    const legacy = window.localStorage?.getItem(LEGACY_KEY);
    if (!legacy) return;
    if (legacy === 'light' || legacy === 'dark' || legacy === 'system') {
      setPreferences({ theme: legacy });
    }
    window.localStorage?.removeItem(LEGACY_KEY);
  } catch {
    /* private mode — skip */
  }
}

export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>(
    () => getPreferences().theme,
  );
  const [theme, setTheme] = useState<ResolvedTheme>(() =>
    resolve(getPreferences().theme),
  );

  // Subscribe to the shared store so TopBar + Settings stay in sync.
  useEffect(() => {
    const unsub = subscribePreferences(() => {
      const next = getPreferences().theme;
      setPreferenceState(next);
      const resolved = resolve(next);
      setTheme(resolved);
      apply(resolved);
    });
    return unsub;
  }, []);

  // Apply on mount + whenever preference changes locally.
  useEffect(() => {
    const resolved = resolve(preference);
    setTheme(resolved);
    apply(resolved);
  }, [preference]);

  // Subscribe to OS theme changes while preference === 'system'.
  useEffect(() => {
    if (preference !== 'system' || typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const next = systemPrefersDark() ? 'dark' : 'light';
      setTheme(next);
      apply(next);
    };
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, [preference]);

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferences({ theme: p });
  }, []);

  const toggle = useCallback(() => {
    setPreferences({ theme: theme === 'dark' ? 'light' : 'dark' });
  }, [theme]);

  return { theme, preference, setPreference, toggle } as const;
}

/**
 * Boot-time helper that runs before React mounts. Migrates the legacy
 * key (one-time) then applies the resolved theme so users don't see a
 * light flash before the React tree comes online.
 */
export function bootstrapTheme(): void {
  migrateLegacy();
  apply(resolve(getPreferences().theme));
}
