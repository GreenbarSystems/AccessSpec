import type { NavigateFunction } from 'react-router-dom';
import { sourceRepository } from '../services/SourceRepository';

/**
 * startNewAudit
 *
 * Shared "New audit" action used by both the TopBar button and the
 * `n` keyboard shortcut. Wipes the loaded project, returns to the
 * Dashboard, and moves keyboard focus to the upload-panel paste tab
 * so the user can start typing immediately.
 *
 * Lives in `lib/` (not inside TopBar) so any caller — including the
 * global key handler that lives outside TopBar — can trigger the
 * same behaviour without duplicating the scroll + focus dance.
 */
export function startNewAudit(navigate: NavigateFunction, currentPath: string): void {
  sourceRepository.clear();
  if (currentPath !== '/') navigate('/');
  // Wait two animation frames so the route + state changes commit
  // before we measure scroll position / move focus.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const target =
        document.querySelector<HTMLElement>('[data-upload-panel]') ??
        document.querySelector<HTMLElement>('[data-tab="paste"]');
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      document.querySelector<HTMLButtonElement>('[data-tab="paste"]')?.focus();
    });
  });
}
