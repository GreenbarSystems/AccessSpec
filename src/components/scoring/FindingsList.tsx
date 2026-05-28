import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Finding, Severity } from '../../services/RuleEngine';
import type { SeverityFilter } from './SeverityTally';

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

const SEVERITY_TONE: Record<Severity, string> = {
  critical: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-200 dark:border-rose-800',
  warning: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800',
  info: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-200 dark:border-sky-800',
};

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'Critical',
  warning: 'Warning',
  info: 'Info',
};

const CATEGORY_LABEL: Record<string, string> = {
  accessibility: 'Accessibility',
  mobile: 'Mobile usability',
  parity: 'Platform parity',
};

type Props = {
  findings: Finding[];
  /** Default cap when no filter is active. Filtered views show everything. */
  limit?: number;
  /** Filter from the dashboard — narrows + lifts the cap. */
  filter?: SeverityFilter;
  /** Called when the user clicks the "Clear filter" link in the header. */
  onClearFilter?: () => void;
};

export function FindingsList({
  findings,
  limit = 10,
  filter,
  onClearFilter,
}: Props) {
  const navigate = useNavigate();

  // Apply category + severity filter first, then sort by severity then file.
  const filtered = useMemo(() => {
    let pool = findings;
    if (filter?.category && filter.category !== 'all') {
      pool = pool.filter((f) => f.category === filter.category);
    }
    if (filter?.severity && filter.severity !== 'all') {
      pool = pool.filter((f) => f.severity === filter.severity);
    }
    return [...pool].sort((a, b) => {
      const r = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
      if (r !== 0) return r;
      return a.element.file.localeCompare(b.element.file);
    });
  }, [findings, filter]);

  const filtersActive =
    !!filter && (filter.category !== 'all' || filter.severity !== 'all');

  // Filtered views show everything — the user has already narrowed down.
  // Unfiltered views keep the top-N cap so the dashboard stays compact.
  const visible = filtersActive ? filtered : filtered.slice(0, limit);

  // Build the human label shown in the header (e.g. "Critical in Mobile usability").
  const filterDescription = (() => {
    if (!filtersActive) return null;
    const parts: string[] = [];
    if (filter!.severity !== 'all') parts.push(SEVERITY_LABEL[filter!.severity as Severity]);
    if (filter!.category !== 'all') parts.push(`in ${CATEGORY_LABEL[filter!.category] ?? filter!.category}`);
    return parts.join(' ');
  })();

  if (filtered.length === 0) {
    // Two flavours of empty state: filtered → "no matches"; unfiltered → "all clear".
    if (filtersActive) {
      return (
        <div
          className="card flex items-center justify-between gap-3 p-4 text-sm"
          data-testid="findings-empty-filtered"
        >
          <span className="text-slate-600 dark:text-slate-400">
            No findings match <strong>{filterDescription}</strong>.
          </span>
          {onClearFilter && (
            <button
              type="button"
              onClick={onClearFilter}
              className="rounded px-1.5 py-0.5 text-xs font-medium text-brand-700 hover:underline dark:text-brand-300"
              data-testid="findings-clear-filter"
            >
              Clear filter
            </button>
          )}
        </div>
      );
    }
    return (
      <div className="card p-4 text-sm text-emerald-700">
        ✓ No findings — every detected component passed the active rules.
      </div>
    );
  }

  return (
    <div className="card overflow-hidden" data-testid="findings-list">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2 dark:bg-slate-900 dark:border-slate-800">
        <div className="flex flex-wrap items-baseline gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <span>
            {filtersActive ? 'Filtered findings' : 'Top findings'} ({visible.length}
            {filtersActive ? ` of ${filtered.length}` : ` of ${findings.length}`})
          </span>
          {filtersActive && filterDescription && (
            <span
              className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium normal-case tracking-normal text-brand-800 ring-1 ring-brand-200 dark:bg-brand-900/30 dark:text-brand-100 dark:ring-brand-800"
              data-testid="findings-active-filter"
            >
              {filterDescription}
            </span>
          )}
        </div>
        {filtersActive && onClearFilter && (
          <button
            type="button"
            onClick={onClearFilter}
            className="rounded px-1.5 py-0.5 text-xs font-medium text-brand-700 hover:underline dark:text-brand-300"
            data-testid="findings-clear-filter"
          >
            Clear filter
          </button>
        )}
      </div>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {visible.map((f) => (
          <li key={`${f.ruleId}:${f.element.id}`}>
            <button
              type="button"
              onClick={() =>
                // Jump to the Analyzer with the file/line stashed in location state.
                navigate('/analyzer', {
                  state: { jump: { path: f.element.file, line: f.element.line } },
                })
              }
              data-finding={f.ruleId}
              data-severity={f.severity}
              data-category={f.category}
              className="flex w-full items-start gap-3 px-4 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              <span
                className={`mt-0.5 rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${SEVERITY_TONE[f.severity]}`}
              >
                {f.severity}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {f.message}
                  </span>
                  <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500">
                    {f.ruleId}
                  </span>
                </div>
                <div className="mt-0.5 truncate font-mono text-xs text-slate-500">
                  {f.element.file}:{f.element.line} · {f.element.type} &lt;{f.element.tagName}&gt;
                </div>
              </div>
              <span aria-hidden className="shrink-0 self-center text-xs text-slate-400 dark:text-slate-500">
                →
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
