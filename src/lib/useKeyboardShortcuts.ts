import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * useKeyboardShortcuts
 *
 * Single global keydown handler that wires up the shortcut surface the
 * Keyboard Shortcuts overlay documents:
 *
 *   ?            — toggle the shortcuts overlay
 *   g d          — go to Dashboard
 *   g a          — go to Analyzer
 *   g s          — go to Simulator
 *   g r          — go to Reports
 *   g ,          — go to Settings
 *   /            — focus the in-page search input (if any)
 *   n            — start a new audit (matches the TopBar button)
 *   Escape       — close the shortcuts overlay
 *
 * The `g …` form is a two-stroke sequence: press `g`, then within 1.2 s
 * press the destination key. This matches the vim / GitHub / Linear
 * convention and keeps the single-key namespace clean.
 *
 * The handler aborts when the focus is inside an input, textarea, or
 * contenteditable element so typing the letter `g` in a paste-source box
 * doesn't yank the user away to a different page.
 */

type Handlers = {
  onToggleHelp: () => void;
  onCloseHelp: () => void;
  onNewAudit: () => void;
};

/** ms after pressing `g` during which the second key counts as a sequence. */
const SEQUENCE_WINDOW_MS = 1200;

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

function focusSearchInput(): boolean {
  // Look for ANY visible input that opted in with `data-search="…"`. Multiple
  // tabs across the app expose searches (explorer, inventory, etc.) — the
  // panel that's currently mounted owns the only visible one.
  const candidates = Array.from(
    document.querySelectorAll<HTMLInputElement>('input[data-search]'),
  );
  for (const el of candidates) {
    // offsetParent is null when the element is display:none or detached.
    if (el.offsetParent !== null) {
      el.focus();
      el.select();
      return true;
    }
  }
  return false;
}

export function useKeyboardShortcuts(handlers: Handlers): void {
  const navigate = useNavigate();
  // Track the `g` prefix between strokes without re-rendering.
  const pendingGoUntil = useRef<number>(0);
  // Latest refs so the handler always sees the freshest callbacks even
  // though we register the listener once.
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      const h = handlersRef.current;
      // Escape always works, even when typing — so a stuck overlay can be
      // dismissed from any focus context.
      if (ev.key === 'Escape') {
        h.onCloseHelp();
        return;
      }
      // Don't hijack typing.
      if (isEditableTarget(ev.target)) return;
      // Ignore modifier combos — those belong to the browser / OS.
      if (ev.metaKey || ev.ctrlKey || ev.altKey) return;

      // Two-stroke `g …` sequence.
      if (pendingGoUntil.current > Date.now()) {
        pendingGoUntil.current = 0;
        const dest = ({
          d: '/',
          a: '/analyzer',
          s: '/simulator',
          r: '/reports',
          ',': '/settings',
        } as const)[ev.key.toLowerCase() as 'd' | 'a' | 's' | 'r' | ','];
        if (dest) {
          ev.preventDefault();
          navigate(dest);
        }
        return;
      }

      if (ev.key === 'g') {
        pendingGoUntil.current = Date.now() + SEQUENCE_WINDOW_MS;
        return;
      }

      // Single-key shortcuts.
      if (ev.key === '?' || (ev.shiftKey && ev.key === '/')) {
        ev.preventDefault();
        h.onToggleHelp();
        return;
      }
      if (ev.key === '/') {
        if (focusSearchInput()) {
          ev.preventDefault();
        }
        return;
      }
      if (ev.key === 'n' || ev.key === 'N') {
        ev.preventDefault();
        h.onNewAudit();
        return;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);
}
