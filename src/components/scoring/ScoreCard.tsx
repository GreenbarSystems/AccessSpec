import type { CategoryScore } from '../../services/Scoring';
import { ScoreRing } from './ScoreRing';

type Props = {
  title: string;
  description: string;
  score: CategoryScore | null;
};

export function ScoreCard({ title, description, score }: Props) {
  return (
    <div
      className="card flex flex-col items-center p-4 text-center"
      data-testid={`score-card-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <ScoreRing score={score?.score ?? null} />
      <div className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</div>
      <p className="mt-0.5 max-w-[18ch] text-xs text-slate-500 dark:text-slate-500">{description}</p>
      <dl className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs">
        <Severity
          label="Critical"
          tone="bg-rose-100 text-rose-800"
          n={score?.counts.critical ?? 0}
          dataKey="critical"
        />
        <Severity
          label="Warnings"
          tone="bg-amber-100 text-amber-800"
          n={score?.counts.warning ?? 0}
          dataKey="warning"
        />
        <Severity
          label="Info"
          tone="bg-sky-100 text-sky-800"
          n={score?.counts.info ?? 0}
          dataKey="info"
        />
      </dl>
    </div>
  );
}

function Severity({
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
      <dt className="text-slate-500 dark:text-slate-500">{label}</dt>
      <dd
        className={`inline-flex min-w-[1.5rem] justify-center rounded px-1.5 py-0.5 font-mono font-semibold tabular-nums ${tone}`}
        data-count={dataKey}
      >
        {n}
      </dd>
    </div>
  );
}
