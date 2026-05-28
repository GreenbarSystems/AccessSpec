import { useState } from 'react';
import { useAuditReport } from '../../services/AuditCache';
import { ScoreRing } from './ScoreRing';
import { ScoreCard } from './ScoreCard';
import { FindingsList } from './FindingsList';
import { SeverityTally, type SeverityFilter } from './SeverityTally';

/**
 * ScoringDashboard
 *
 * Owns the dashboard's severity / category filter. Each ScoreCard's
 * Critical / Warnings / Info tallies are clickable: selecting one
 * narrows the FindingsList below to that category + severity. Click
 * again to clear. Filters cross-talk — clicking Critical on Accessibility
 * replaces a previously-active Mobile filter (single selection model;
 * single hub instead of dropdowns).
 *
 * The filter lives in component state rather than the URL because the
 * Dashboard page already uses URL search params for the upload-drawer
 * toggle; mixing the two would muddle bookmark semantics.
 */
export function ScoringDashboard() {
  const report = useAuditReport();
  const [filter, setFilter] = useState<SeverityFilter>({
    category: 'all',
    severity: 'all',
  });

  const clearFilter = () =>
    setFilter({ category: 'all', severity: 'all' });

  return (
    <section aria-label="Accessibility scoring" data-testid="scoring-dashboard">
      <div
        className="grid grid-cols-1 gap-4 lg:grid-cols-4"
        role="group"
        aria-label="Compliance scores — click a severity tally to filter the findings list"
      >
        {/* Overall card — `category: 'all'` so clicking a tally here filters
            by severity only, leaving the category open. */}
        <div
          className="card flex flex-col items-center p-4 text-center"
          data-testid="score-card-overall"
        >
          <ScoreRing score={report?.scores.overall ?? null} size={112} />
          <div className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
            Overall Score
          </div>
          <p className="mt-0.5 max-w-[22ch] text-xs text-slate-500">
            Overall WCAG 2.2 + mobile + parity composite.
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-xs">
            <SeverityTally
              severity="critical"
              category="all"
              count={report?.scores.totalCounts.critical ?? 0}
              onSelect={setFilter}
              active={filter}
              dataKey="critical-total"
            />
            <SeverityTally
              severity="warning"
              category="all"
              count={report?.scores.totalCounts.warning ?? 0}
              onSelect={setFilter}
              active={filter}
              dataKey="warning-total"
            />
            <SeverityTally
              severity="info"
              category="all"
              count={report?.scores.totalCounts.info ?? 0}
              onSelect={setFilter}
              active={filter}
              dataKey="info-total"
            />
          </div>
        </div>

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

      <div className="mt-4">
        {report ? (
          <FindingsList
            findings={report.findings}
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
