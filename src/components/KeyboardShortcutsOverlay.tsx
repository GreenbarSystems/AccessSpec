import { useEffect, useRef } from 'react';

/**
 * KeyboardShortcutsOverlay
 *
 * Modal cheat-sheet that documents every binding registered by
 * `useKeyboardShortcuts`. Opens via `?` (or the help button in the
 * TopBar) and closes via `Escape`, the close button, or a backdrop
 * click.
 *
 * Accessibility:
 *   - `role="dialog"` + `aria-modal="true"` so screen readers announce
 *     the popup as a separate context.
 *   - `aria-labelledby` ties the dialog to its visible heading.
 *   - Focus moves to the close button on open; restores to the
 *     previously-focused element on close.
 *   - Escape close is handled inside the global hook (so the
 *     overlay closes even when focus has drifted to a child).
 *
 * No external dependencies — the dashboard's "dep-free polish" stance
 * applies here too.
 */

type Props = {
  open: boolean;
  onClose: () => void;
};

type Binding = {
  keys: string[];
  label: string;
};

type Group = {
  title: string;
  bindings: Binding[];
};

const GROUPS: Group[] = [
  {
    title: 'Navigation',
    bindings: [
      { keys: ['g', 'd'], label: 'Go to Dashboard' },
      { keys: ['g', 'a'], label: 'Go to Analyzer' },
      { keys: ['g', 's'], label: 'Go to Simulator' },
      { keys: ['g', 'r'], label: 'Go to Reports' },
      { keys: ['g', ','], label: 'Go to Settings' },
    ],
  },
  {
    title: 'Actions',
    bindings: [
      { keys: ['n'], label: 'Start a new audit' },
      { keys: ['/'], label: 'Focus the search input' },
      { keys: ['?'], label: 'Toggle this overlay' },
      { keys: ['Esc'], label: 'Close any overlay / dialog' },
    ],
  },
];

export function KeyboardShortcutsOverlay({ open, onClose }: Props) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  // Remember which element had focus before opening so we can restore it.
  const restoreFocusTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreFocusTo.current = document.activeElement as HTMLElement | null;
    // Move focus into the dialog on the next paint so the dialog is
    // already in the accessibility tree.
    const t = setTimeout(() => closeButtonRef.current?.focus(), 0);
    return () => {
      clearTimeout(t);
      restoreFocusTo.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
      data-testid="shortcuts-overlay"
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Close shortcuts overlay"
        onClick={onClose}
        // The backdrop is itself a button so click-out works without
        // wiring an extra div + click handler.
        className="absolute inset-0 -z-10 bg-slate-900/40 backdrop-blur-sm"
      />
      <div className="card w-full max-w-md overflow-hidden shadow-xl">
        <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 dark:bg-slate-900 dark:border-slate-800">
          <h2
            id="shortcuts-title"
            className="text-sm font-semibold text-slate-900 dark:text-slate-100"
          >
            Keyboard shortcuts
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <span aria-hidden>✕</span>
          </button>
        </header>
        <div className="space-y-4 p-4">
          {GROUPS.map((group) => (
            <section key={group.title}>
              <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {group.title}
              </h3>
              <ul className="space-y-1.5">
                {group.bindings.map((b) => (
                  <li
                    key={b.label}
                    className="flex items-center justify-between gap-3 text-sm text-slate-800 dark:text-slate-200"
                  >
                    <span>{b.label}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {b.keys.map((k, i) => (
                        <Kbd key={i}>{k}</Kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <p className="border-t border-slate-100 pt-3 text-[11px] text-slate-500 dark:border-slate-800">
            Shortcuts are ignored while typing into a text input. Press{' '}
            <Kbd>Esc</Kbd> to dismiss.
          </p>
        </div>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-700 dark:text-slate-300 shadow-[inset_0_-1px_0_rgba(0,0,0,0.05)] dark:bg-slate-800 dark:border-slate-700">
      {children}
    </kbd>
  );
}
