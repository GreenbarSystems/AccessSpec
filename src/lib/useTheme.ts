import { useCallback, useEffect, useState } from 'react';

/**
 * useTheme
 *
 * Tiny dependency-free theme manager. Adds / removes the `.dark` class on
 * <html>, persists the choice in localStorage, and falls back to the user's
 * OS preference when no choice has been saved yet.
 *
 * Returns:
 *   theme       — 'light' | 'dark', the *effective* theme right now
 *   preference  — 'light' | 'dark' | 'system', what's stored
 *   setPreference(p) — change it
 *   toggle()    — flip between light and dark (jumps out of 'system')
 *
 * Pair with Tailwind's `darkMode: 'class'` config (already set). Any time
 * Tailwind sees a `dark:` prefix, those rules apply when <html> has the
 * `.dark` class.
 */

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'accessspec:theme';

function readPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  const raw = window.localStorage?.getItem(STORAGE_KEY);
  if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  return 'system';
}

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

export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => readPreference());
  const [theme, setTheme] = useState<ResolvedTheme>(() => resolve(readPreference()));

  // Apply on mount + whenever preference changes.
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
    setPreferenceState(p);
    try {
      window.localStorage?.setItem(STORAGE_KEY, p);
    } catch {
      /* private mode or quota — ignore, preference still applies for this session */
    }
  }, []);

  const toggle = useCallback(() => {
    setPreference(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setPreference]);

  return { theme, preference, setPreference, toggle } as const;
}

/**
 * Boot-time helper that runs before React mounts. Keeps the FIRST paint in
 * the correct theme so users don't see a light flash before the React tree
 * comes online. Call from main.tsx synchronously.
 */
export function bootstrapTheme(): void {
  apply(resolve(readPreference()));
}
