/**
 * analyzerFilters
 *
 * The Analyzer page has one foundation tab ("Components") and five check
 * tabs (Touch targets, Contrast, Dynamic type, Reflow, Patterns). A user
 * who has narrowed the Components inventory to e.g. `?type=button&q=submit`
 * has done the cognitive work of scoping their attention; we want the
 * sibling check tabs to honor that same scope when they're opened next.
 *
 * This module is the shared plumbing for that handoff:
 *
 *   - `useInboundComponentFilter()` — reads the same `type` and `q` URL
 *     params Components writes, plus exposes a `clear()` that nukes them.
 *   - `applyInboundFilter()` — pure helper that filters a `UIElement[]`
 *     to the inbound scope. Each check panel calls this once on its raw
 *     element pool before handing off to its own analyzer service.
 *
 * Keeping the inbound filter in URL state (not React context or routing
 * `state`) means the check tab is also deep-linkable / shareable, and a
 * page reload doesn't drop the scope.
 */
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  UI_TYPES,
  type UIElement,
  type UIElementType,
} from './ComponentDetector';

const VALID_TYPES = new Set<string>(UI_TYPES);

/** Type-guard for URL-supplied ?type values. */
function parseTypeParam(raw: string | null): UIElementType | 'all' {
  if (raw && VALID_TYPES.has(raw)) return raw as UIElementType;
  return 'all';
}

export type InboundComponentFilter = {
  type: UIElementType | 'all';
  query: string;
  /** True iff at least one of type or query is set. */
  hasFilter: boolean;
  /** Clears both `type` and `q` from the URL (preserves other params). */
  clear: () => void;
};

export function useInboundComponentFilter(): InboundComponentFilter {
  const [searchParams, setSearchParams] = useSearchParams();
  const type = parseTypeParam(searchParams.get('type'));
  const query = searchParams.get('q') ?? '';
  const hasFilter = type !== 'all' || query.length > 0;

  const clear = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('type');
        next.delete('q');
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  return useMemo(
    () => ({ type, query, hasFilter, clear }),
    [type, query, hasFilter, clear],
  );
}

/**
 * Pure filter — apply the inbound scope to a raw element pool. Mirrors
 * the same matching logic ComponentInventoryPanel uses for its `visible`
 * derivation, so a user who saw N rows in Components will see the same
 * N elements feed each check tab.
 */
export function applyInboundFilter(
  elements: UIElement[],
  filter: { type: UIElementType | 'all'; query: string },
): UIElement[] {
  let out = elements;
  if (filter.type !== 'all') {
    out = out.filter((e) => e.type === filter.type);
  }
  if (filter.query) {
    const q = filter.query.toLowerCase();
    out = out.filter(
      (el) =>
        el.text.toLowerCase().includes(q) ||
        el.file.toLowerCase().includes(q) ||
        el.tagName.toLowerCase().includes(q) ||
        el.role.toLowerCase().includes(q),
    );
  }
  return out;
}
