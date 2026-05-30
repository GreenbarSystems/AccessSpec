import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuditReport } from '../../services/AuditCache';
import { useUserPreferences } from '../../services/UserPreferences';
import { Glossary } from '../Glossary';
import {
  BAND_LABEL,
  BAND_THRESHOLDS,
  bandOf,
  type ScoreBand,
} from '../../services/Scoring';
import type { Finding, Severity } from '../../services/RuleEngine';
import { ScoreRing } from './ScoreRing';
import { ScoreCard } from './ScoreCard';
import { FindingsList } from './FindingsList';
import { SeverityTally, type SeverityFilter } from './SeverityTally';

/**
 * ScoringDashboard
 *
 * Owns the dashboard's severity / category filter and surfaces the
 * highest-priority findings up front so new users have an obvious
 * "fix these first" pointer.
 *
 * Layout, top to bottom:
 *   - Score legend strip   plain-language explanation of the bands
 *   - 4 score cards        Overall + Accessibility + Mobile + Parity
 *   - Top-3 priority list  the three highest-severity findings, prominent
 *   - Full FindingsList    filtered + capped per user preferences
 */

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

const SEVERITY_TONE: Record<Severity, string> = {
  critical: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/30 dark:text-rose-200 dark:ring-rose-800',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-800',
  info: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-900/30 dark:text-sky-200 dark:ring-sky-800',
};

export function ScoringDashboard() {
  const report = useAuditReport();
  const prefs = useUserPreferences();
  const [filter, setFilter] = useState<SeverityFilter>(() => ({
    category: 'all',
    severity:
      prefs.defaultSeverityFilter === 'all' ? 'all' : prefs.defaultSeverityFilter,
  }));

  const clearFilter = () =>
    setFilter({ category: 'all', severity: 'all' });

  return (
    <section aria-label="Accessibility scoring" data-testid="scoring-dashboard">
      <ScoreLegend />

      <div
        className="grid grid-cols-1 gap-4 lg:grid-cols-4"
        role="group"
        aria-label="Compliance scores — click a severity tally to filter the findings list"
      >
        <OverallCard
          report={report}
          filter={filter}
          onFilterChange={setFilter}
        />

        <ScoreCard
          title="Accessibility"
          description="WCAG 2.2 conformance for screen-reader & keyboard users."
          category="accessibility"
          score={report?.scores.byCategory.accessibility ?? null}
          filter={filter}
          onFilterChange={setFilter}
        />
        <ScoreCard
          title="Mobile usability"
          description="Touch targets, font sizes, scaling."
          category="mobile"
          score={report?.scores.byCategory.mobile ?? null}
          filter={filter}
          onFilterChange={setFilter}
        />
        <ScoreCard
          title="Platform parity"
          description="Match iOS / Android native patterns."
          category="parity"
          score={report?.scores.byCategory.parity ?? null}
          filter={filter}
          onFilterChange={setFilter}
        />
      </div>

      {report && <TopPriorityWidget findings={report.findings} />}

      <div className="mt-4">
        {report ? (
          <FindingsList
            findings={report.findings}
            limit={prefs.findingsLimit}
            filter={filter}
            onClearFilter={clearFilter}
          />
        ) : (
          <div className="card p-4 text-sm text-slate-500">
            Upload a project below to generate scores.
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Legend strip                                                        */
/* ------------------------------------------------------------------ */

/** One-line scale explainer that sits above the score cards. */
function ScoreLegend() {
  const bands: { band: ScoreBand; tone: string }[] = [
    { band: 'good', tone: 'bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:ring-emerald-800' },
    { band: 'warn', tone: 'bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:ring-amber-800' },
    { band: 'bad', tone: 'bg-rose-100 text-rose-800 ring-rose-200 dark:bg-rose-900/40 dark:text-rose-200 dark:ring-rose-800' },
  ];
  return (
    <div
      className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400"
      data-testid="score-legend"
    >
      <span className="font-medium text-slate-700 dark:text-slate-300">
        Score guide:
      </span>
      {bands.map(({ band, tone }) => (
        <span
          key={band}
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium ring-1 ${tone}`}
          data-legend-band={band}
        >
          <span className="font-mono text-[11px] font-semibold tabular-nums">
            {BAND_THRESHOLDS[band]}
          </span>
          <span>{BAND_LABEL[band]}</span>
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Overall card with band pill                                         */
/* ------------------------------------------------------------------ */

const OVERALL_BAND_PILL: Record<ScoreBand, string> = {
  good: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:ring-emerald-800',
  warn: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-800',
  bad: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/30 dark:text-rose-200 dark:ring-rose-800',
};

function OverallCard({
  report,
  filter,
  onFilterChange,
}: {
  report: ReturnType<typeof useAuditReport>;
  filter: SeverityFilter;
  onFilterChange: (next: SeverityFilter) => void;
}) {
  const overall = report?.scores.overall ?? null;
  const band = overall !== null ? bandOf(overall) : null;
  return (
    <div
      className="card flex flex-col items-center p-4 text-center"
      data-testid="score-card-overall"
    >
      <ScoreRing score={overall} size={112} />
      <div className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
        Overall Score
      </div>
      {band && (
        <span
          className={`mt-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${OVERALL_BAND_PILL[band]}`}
          data-band={band}
          data-testid="overall-band"
        >
          {BAND_LABEL[band]}
        </span>
      )}
      <p className="mt-1 max-w-[24ch] text-xs text-slate-500">
        Composite of{' '}
        <Glossary term="WCAG22">WCAG 2.2</Glossary>, mobile usability,
        and{' '}
        <Glossary term="parity">parity</Glossary>.
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-xs">
        <SeverityTally
          severity="critical"
          category="all"
          count={report?.scores.totalCounts.critical ?? 0}
          onSelect={onFilterChange}
          active={filter}
          dataKey="critical-total"
        />
        <SeverityTally
          severity="warning"
          category="all"
          count={report?.scores.totalCounts.warning ?? 0}
          onSelect={onFilterChange}
          active={filter}
          dataKey="warning-total"
        />
        <SeverityTally
          severity="info"
          category="all"
          count={report?.scores.totalCounts.info ?? 0}
          onSelect={onFilterChange}
          active={filter}
          dataKey="info-total"
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Top-3 priority widget                                               */
/* ------------------------------------------------------------------ */

/**
 * "Start with these" — the three highest-severity findings, surfaced
 * above the full list so a new user knows where to begin. Falls back
 * to "Nothing critical — well done" when no findings exist.
 */
function TopPriorityWidget({ findings }: { findings: Finding[] }) {
  const navigate = useNavigate();
  const top = useMemo(() => {
    return [...findings]
      .sort((a, b) => {
        const r = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
        if (r !== 0) return r;
        return a.element.file.localeCompare(b.element.file);
      })
      .slice(0, 3);
  }, [findings]);

  if (top.length === 0) {
    return (
      <div
        className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200"
        data-testid="top-priority-empty"
      >
        <span aria-hidden className="text-base">✓</span>
        <span>
          <strong>All clear.</strong> No findings against the active rules.
        </span>
      </div>
    );
  }

  return (
    <section
      aria-label="Top priority findings"
      className="mt-4 rounded-lg border border-brand-200 bg-brand-50/50 p-3 dark:border-brand-800 dark:bg-brand-900/20"
      data-testid="top-priority"
    >
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-brand-800 dark:text-brand-200">
          Start with these
        </h3>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          Top {top.length} by severity
        </span>
      </div>
      <ul className="space-y-1.5" data-testid="top-priority-list">
        {top.map((f) => (
          <li key={`${f.ruleId}:${f.element.id}`}>
            <button
              type="button"
              onClick={() =>
                navigate('/analyzer', {
                  state: { jump: { path: f.element.file, line: f.element.line } },
                })
              }
              data-priority-rule={f.ruleId}
              data-priority-severity={f.severity}
              className="group flex w-full items-start gap-2 rounded-md bg-white p-2 text-left shadow-sm hover:shadow dark:bg-slate-900"
            >
              <span
                className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${SEVERITY_TONE[f.severity]}`}
              >
                {f.severity}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-900 group-hover:text-brand-700 dark:text-slate-100 dark:group-hover:text-brand-200">
                  {f.message}
                </span>
                <span className="block truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">
                  {f.element.file}:{f.element.line} · {f.ruleId}
                </span>
              </span>
              <span
                aria-hidden
                className="shrink-0 self-center text-xs text-brand-600 dark:text-brand-300"
              >
                Fix →
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
