import { useMemo } from 'react';
import { useSourceRepository } from '../../services/useSourceRepository';
import { audit } from '../../services/AuditService';
import { ScoreRing } from './ScoreRing';
import { ScoreCard } from './ScoreCard';
import { FindingsList } from './FindingsList';

export function ScoringDashboard() {
  const { project } = useSourceRepository();
  const files = useMemo(() => {
    if (!project) return [];
    return [...project.filesByPath.values()];
  }, [project]);

  const report = useMemo(() => (files.length ? audit(files) : null), [files]);

  return (
    <section aria-label="Accessibility scoring" data-testid="scoring-dashboard">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="card flex flex-col items-center p-4 text-center">
          <ScoreRing score={report?.scores.overall ?? null} size={112} />
          <div className="mt-3 text-sm font-semibold text-slate-900">
            Overall Score
          </div>
          <p className="mt-0.5 max-w-[22ch] text-xs text-slate-500">
            Overall WCAG 2.2 + mobile + parity composite.
          </p>
          <dl className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs">
            <Tally
              label="Critical"
              tone="bg-rose-100 text-rose-800"
              n={report?.scores.totalCounts.critical ?? 0}
              dataKey="critical-total"
            />
            <Tally
              label="Warnings"
              tone="bg-amber-100 text-amber-800"
              n={report?.scores.totalCounts.warning ?? 0}
              dataKey="warning-total"
            />
            <Tally
              label="Info"
              tone="bg-sky-100 text-sky-800"
              n={report?.scores.totalCounts.info ?? 0}
              dataKey="info-total"
            />
          </dl>
        </div>

        <ScoreCard
          title="Accessibility"
          description="WCAG 2.2 conformance for screen-reader & keyboard users."
          score={report?.scores.byCategory.accessibility ?? null}
        />
        <ScoreCard
          title="Mobile usability"
          description="Touch targets, font sizes, scaling."
          score={report?.scores.byCategory.mobile ?? null}
        />
        <ScoreCard
          title="Platform parity"
          description="Match iOS / Android native patterns."
          score={report?.scores.byCategory.parity ?? null}
        />
      </div>

      <div className="mt-4">
        {report ? (
          <FindingsList findings={report.findings} />
        ) : (
          <div className="card p-4 text-sm text-slate-500">
            Upload a project below to generate scores.
          </div>
        )}
      </div>
    </section>
  );
}

function Tally({
  label,
  tone,
  n,
  dataKey,
}: {
  label: string;
  tone: string;
  n: number;
  dataKey: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <dt className="text-slate-500">{label}</dt>
      <dd
        className={`inline-flex min-w-[1.5rem] justify-center rounded px-1.5 py-0.5 font-mono font-semibold tabular-nums ${tone}`}
        data-count={dataKey}
      >
        {n}
      </dd>
    </div>
  );
}
