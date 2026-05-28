import type { Severity } from '../../services/RuleEngine';
import type { Category } from '../../services/RuleEngine';

/**
 * SeverityTally
 *
 * Severity count chip used in every ScoreCard plus the Overall card.
 * Becomes a button when `onClick` is provided so the ScoringDashboard
 * can use it as a filter control — click "12 critical" on the Mobile
 * card and the findings list below filters to mobile-category criticals
 * only.
 *
 * The active state (the currently-selected filter) gets a brand ring +
 * `aria-pressed=true` so screen-reader and keyboard users see the same
 * affordance as mouse users.
 */

export type SeverityFilter = {
  category: Category | 'all';
  severity: Severity | 'all';
};

const TONE: Record<Severity, string> = {
  critical: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
  info: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200',
};

const LABEL: Record<Severity, string> = {
  critical: 'Critical',
  warning: 'Warnings',
  info: 'Info',
};

type Props = {
  severity: Severity;
  /** The category this tally belongs to. 'all' for the Overall card. */
  category: Category | 'all';
  /** Number to display in the count pill. */
  count: number;
  /** When provided, the tally renders as a toggle button. */
  onSelect?: (next: SeverityFilter) => void;
  /** Currently active filter — used to highlight matching tallies. */
  active?: SeverityFilter;
  /** Optional data-key — kept for backwards-compat with existing tests. */
  dataKey?: string;
};

export function SeverityTally({
  severity,
  category,
  count,
  onSelect,
  active,
  dataKey,
}: Props) {
  const isActive =
    !!active && active.category === category && active.severity === severity;

  const ariaLabel = `${LABEL[severity]} ${count}${
    category === 'all' ? ' across all categories' : ` in ${category}`
  }`;

  // Toggle semantics: clicking the active tally clears the filter so the
  // same control acts as both apply and unapply.
  const handleClick = () => {
    if (!onSelect) return;
    if (isActive) onSelect({ category: 'all', severity: 'all' });
    else onSelect({ category, severity });
  };

  const pill = (
    <span
      className={`inline-flex min-w-[1.5rem] justify-center rounded px-1.5 py-0.5 font-mono font-semibold tabular-nums ${TONE[severity]}`}
      data-count={dataKey ?? severity}
    >
      {count}
    </span>
  );

  if (!onSelect) {
    // Read-only render (used by the Reports / inspector / etc. that
    // surface tallies without filter behaviour).
    return (
      <div className="flex items-center gap-1">
        <span className="text-slate-500">{LABEL[severity]}</span>
        {pill}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={isActive}
      aria-label={ariaLabel}
      data-filter={`${category}:${severity}`}
      className={[
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 transition',
        'hover:bg-slate-100 dark:hover:bg-slate-800',
        isActive
          ? 'ring-2 ring-brand-500 ring-offset-1 ring-offset-white dark:ring-offset-slate-900'
          : '',
      ].join(' ')}
    >
      <span className="text-slate-500">{LABEL[severity]}</span>
      {pill}
    </button>
  );
}
