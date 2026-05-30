/**
 * UserPreferences
 *
 * Typed, persisted user settings shared across the dashboard. Lives in
 * localStorage under a single namespaced key so we can serialize the
 * whole object in one read / write and avoid scattered keys.
 *
 * Two access patterns:
 *
 *   1. Outside React: `getPreferences()` / `setPreferences(partial)` —
 *      direct read / partial merge. The setter notifies subscribers.
 *   2. Inside React: `useUserPreferences()` — useSyncExternalStore hook
 *      that re-renders the component when ANY pref changes. For more
 *      targeted reads, the caller can destructure only what it needs.
 *
 * Why a single hub vs each panel owning its prefs:
 *   - One source of truth, one localStorage entry to migrate later
 *   - A "Reset preferences" button can wipe the whole namespace
 *   - The Settings page can show the live state without prop drilling
 *
 * The defaults table is the single declaration of what's configurable
 * — the Settings UI iterates over THIS shape, the consumers read from
 * it, and the store enforces type-correctness on write.
 */

import { useSyncExternalStore } from 'react';

/* ------------------------------------------------------------------ */
/* Schema                                                              */
/* ------------------------------------------------------------------ */

export type ThemePreference = 'light' | 'dark' | 'system';
export type SeverityDefault = 'all' | 'critical' | 'warning' | 'info';

export type UserPreferences = {
  /** Effective theme — also mirrored to useTheme() so the hook can stay tiny. */
  theme: ThemePreference;
  /** Default device for the Simulator page on load. */
  defaultDeviceId: string;
  /** How many findings to show in the unfiltered Top findings list. */
  findingsLimit: number;
  /** Severity that the dashboard pre-selects on first visit (or 'all'). */
  defaultSeverityFilter: SeverityDefault;
  /** Group inventory rows by file on the Components tab by default. */
  inventoryGroupByFile: boolean;
  /** Set to true after the user dismisses or completes the onboarding tour. */
  onboardingDismissed: boolean;
};

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  defaultDeviceId: 'iphone-15',
  findingsLimit: 10,
  defaultSeverityFilter: 'all',
  inventoryGroupByFile: false,
  onboardingDismissed: false,
};

const STORAGE_KEY = 'accessspec:user-preferences';

/* ------------------------------------------------------------------ */
/* Validation / migration                                              */
/* ------------------------------------------------------------------ */

/**
 * Sanitise a candidate object from localStorage into a valid prefs shape.
 * Unknown keys are dropped, missing keys fall back to defaults, and any
 * value that fails the simple range / enum check resets to its default
 * — so a corrupted entry never bricks the app.
 */
function normalize(raw: unknown): UserPreferences {
  const next: UserPreferences = { ...DEFAULT_PREFERENCES };
  if (!raw || typeof raw !== 'object') return next;
  const obj = raw as Record<string, unknown>;
  if (obj.theme === 'light' || obj.theme === 'dark' || obj.theme === 'system') {
    next.theme = obj.theme;
  }
  if (typeof obj.defaultDeviceId === 'string' && obj.defaultDeviceId.length > 0) {
    next.defaultDeviceId = obj.defaultDeviceId;
  }
  if (typeof obj.findingsLimit === 'number' && obj.findingsLimit >= 5 && obj.findingsLimit <= 100) {
    next.findingsLimit = Math.round(obj.findingsLimit);
  }
  if (
    obj.defaultSeverityFilter === 'all' ||
    obj.defaultSeverityFilter === 'critical' ||
    obj.defaultSeverityFilter === 'warning' ||
    obj.defaultSeverityFilter === 'info'
  ) {
    next.defaultSeverityFilter = obj.defaultSeverityFilter;
  }
  if (typeof obj.inventoryGroupByFile === 'boolean') {
    next.inventoryGroupByFile = obj.inventoryGroupByFile;
  }
  if (typeof obj.onboardingDismissed === 'boolean') {
    next.onboardingDismissed = obj.onboardingDismissed;
  }
  return next;
}

/* ------------------------------------------------------------------ */
/* Module state + subscribers                                          */
/* ------------------------------------------------------------------ */

let current: UserPreferences = readFromStorage();
const listeners = new Set<() => void>();

function readFromStorage(): UserPreferences {
  if (typeof window === 'undefined') return { ...DEFAULT_PREFERENCES };
  try {
    const raw = window.localStorage?.getItem(STORAGE_KEY);
    return normalize(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

function writeToStorage(next: UserPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage?.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* private mode / quota — preference applies for this session only */
  }
}

function emit(): void {
  for (const l of listeners) l();
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/** Synchronous read — returns the current preferences object. */
export function getPreferences(): UserPreferences {
  return current;
}

/**
 * Merge a partial update into the current preferences, persist, and notify
 * subscribers. Returns the new full preferences object.
 */
export function setPreferences(patch: Partial<UserPreferences>): UserPreferences {
  current = { ...current, ...patch };
  writeToStorage(current);
  emit();
  return current;
}

/** Wipe preferences back to defaults. */
export function resetPreferences(): UserPreferences {
  current = { ...DEFAULT_PREFERENCES };
  writeToStorage(current);
  emit();
  return current;
}

/** Subscribe to any change. Returns an unsubscribe function. */
export function subscribePreferences(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * React hook — re-renders when any preference changes. Components that
 * only care about one field can destructure to limit prop-drilling but
 * will still re-render on unrelated changes (acceptable: prefs change
 * rarely).
 */
export function useUserPreferences(): UserPreferences {
  return useSyncExternalStore(subscribePreferences, getPreferences, getPreferences);
}
