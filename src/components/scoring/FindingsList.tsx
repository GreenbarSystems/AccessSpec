import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import type { Finding, Rule, Severity } from '../../services/RuleEngine';
import { ALL_RULE_DEFS } from '../../services/AuditService';
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

// Build a lookup once so each row can find its rule without scanning.
const RULES_BY_ID: Record<string, Rule> = Object.fromEntries(
  ALL_RULE_DEFS.map((r) => [r.id, r] as const),
);

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
  // Which finding keys are currently expanded showing the fix preview?
  // Tracked as a Set in state so expanding one doesn't collapse the others.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpand = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

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
        {visible.map((f) => {
          const key = `${f.ruleId}:${f.element.id}`;
          const isOpen = expanded.has(key);
          const rule = RULES_BY_ID[f.ruleId];
          // Some rules have a code-level fix example (most do); some don't.
          // The expander still shows the description + suggestion summary
          // even when there's no diff block.
          const hasFixDetail =
            !!rule &&
            (!!rule.description || !!rule.suggestedFix?.summary || !!rule.suggestedFix?.example);
          return (
            <li key={key}>
              <div
                className="flex w-full items-start gap-3 px-4 py-2"
                data-finding={f.ruleId}
                data-severity={f.severity}
                data-category={f.category}
              >
                <span
                  className={`mt-0.5 rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${SEVERITY_TONE[f.severity]}`}
                >
                  {f.severity}
                </span>
                {/* Main row click expands the inline fix preview. We split the
                    click handlers so the trailing "Open in code" arrow can
                    still jump to the Analyzer without re-triggering the
                    expand. */}
                <button
                  type="button"
                  onClick={() => toggleExpand(key)}
                  aria-expanded={isOpen}
                  data-action="toggle-fix"
                  className="min-w-0 flex-1 cursor-pointer text-left"
                >
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
                </button>
                {hasFixDetail && (
                  <button
                    type="button"
                    onClick={() => toggleExpand(key)}
                    aria-label={isOpen ? 'Hide fix preview' : 'Show fix preview'}
                    data-action="toggle-fix-icon"
                    className="shrink-0 self-center rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                    title={isOpen ? 'Hide fix preview' : 'Show fix preview'}
                  >
                    {isOpen ? (
                      <ChevronDown aria-hidden className="h-4 w-4" />
                    ) : (
                      <ChevronRight aria-hidden className="h-4 w-4" />
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    navigate('/analyzer', {
                      state: { jump: { path: f.element.file, line: f.element.line } },
                    })
                  }
                  aria-label="Open in code"
                  data-action="open-in-code"
                  className="shrink-0 self-center rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  title="Open in Analyzer source view"
                >
                  <ExternalLink aria-hidden className="h-4 w-4" />
                </button>
              </div>
              {isOpen && rule && (
                <FixPreview rule={rule} />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Inline fix preview                                                  */
/* ------------------------------------------------------------------ */

/** Per-finding expander that surfaces the rule's description + fix example. */
function FixPreview({ rule }: { rule: Rule }) {
  const fix = rule.suggestedFix;
  return (
    <div
      className="border-t border-slate-100 bg-slate-50/50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50"
      data-testid="finding-fix-preview"
      data-rule={rule.id}
    >
      {rule.description && (
        <p className="text-xs text-slate-700 dark:text-slate-300">
          <span className="font-semibold">Why this matters · </span>
          {rule.description}
        </p>
      )}
      {rule.spec && (
        <p className="mt-1 text-[11px] text-slate-500">{rule.spec}</p>
      )}
      {fix?.summary && (
        <p className="mt-2 text-xs text-slate-700 dark:text-slate-300">
          <span className="font-semibold">How to fix · </span>
          {fix.summary}
        </p>
      )}
      {fix?.example && (
        <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
          {fix.example.bad && (
            <DiffBlock label="Before" tone="rose" code={fix.example.bad} language={fix.example.language} />
          )}
          <DiffBlock label="After" tone="emerald" code={fix.example.good} language={fix.example.language} />
        </div>
      )}
      {fix?.notes && fix.notes.length > 0 && (
        <ul className="mt-2 list-inside list-disc text-[11px] text-slate-600 dark:text-slate-400">
          {fix.notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DiffBlock({
  label,
  tone,
  code,
  language,
}: {
  label: string;
  tone: 'rose' | 'emerald';
  code: string;
  language?: string;
}) {
  const toneClass =
    tone === 'rose'
      ? 'border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-900/20'
      : 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20';
  const labelClass =
    tone === 'rose'
      ? 'text-rose-800 dark:text-rose-200'
      : 'text-emerald-800 dark:text-emerald-200';
  return (
    <div className={`overflow-hidden rounded border ${toneClass}`}>
      <div className={`flex items-center justify-between border-b border-current/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${labelClass}`}>
        <span>{label}</span>
        {language && <span className="opacity-60">{language}</span>}
      </div>
      <pre className="overflow-auto p-2 font-mono text-xs leading-relaxed text-slate-800 dark:text-slate-200">
        {code}
      </pre>
    </div>
  );
}
