import { Filter, X } from 'lucide-react';
import type { InboundComponentFilter } from '../../services/analyzerFilters';

type Props = {
  filter: InboundComponentFilter;
  /**
   * What this check tab is currently looking at after the filter was applied
   * (e.g. "4 of 12 buttons"). Lets the banner tell the user *what shrank*,
   * not just *that* a filter is on.
   */
  scopedCount: number;
  totalCount: number;
};

/**
 * Slim strip rendered at the top of a check panel when the user arrived via
 * the Components tab's "Run on this filter" handoff. Spells out the scope
 * + offers a one-click clear. Sits above the panel's normal header so it
 * never feels hidden.
 */
export function InboundFilterBanner({ filter, scopedCount, totalCount }: Props) {
  if (!filter.hasFilter) return null;
  const parts: string[] = [];
  if (filter.type !== 'all') parts.push(`type: ${filter.type}`);
  if (filter.query) parts.push(`matches "${filter.query}"`);

  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-md border border-brand-300 bg-brand-50 px-3 py-2 text-xs text-brand-900 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-100"
      data-testid="inbound-filter-banner"
      role="status"
    >
      <Filter aria-hidden className="h-3.5 w-3.5 shrink-0" />
      <span>
        Scoped to <span className="font-semibold">{scopedCount}</span> of{' '}
        {totalCount} components from the Components tab ({parts.join(' · ')}).
      </span>
      <button
        type="button"
        onClick={filter.clear}
        data-testid="inbound-filter-clear"
        className="ml-auto inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium text-brand-700 hover:bg-brand-100 dark:text-brand-100 dark:hover:bg-brand-800/60"
      >
        <X aria-hidden className="h-3 w-3" />
        Clear filter
      </button>
    </div>
  );
}
