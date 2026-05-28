import type { Category } from '../../services/RuleEngine';
import { BAND_LABEL, bandOf, type CategoryScore } from '../../services/Scoring';
import { ScoreRing } from './ScoreRing';
import { SeverityTally, type SeverityFilter } from './SeverityTally';

const BAND_PILL: Record<'good' | 'warn' | 'bad', string> = {
  good: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:ring-emerald-800',
  warn: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-800',
  bad: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/30 dark:text-rose-200 dark:ring-rose-800',
};

type Props = {
  title: string;
  description: string;
  category: Category;
  score: CategoryScore | null;
  /** Currently active filter — wired up so this card's tallies highlight. */
  filter: SeverityFilter;
  /** Called when the user clicks one of the tallies. */
  onFilterChange: (next: SeverityFilter) => void;
};

export function ScoreCard({
  title,
  description,
  category,
  score,
  filter,
  onFilterChange,
}: Props) {
  return (
    <div
      className="card flex flex-col items-center p-4 text-center"
      data-testid={`score-card-${title.toLowerCase().replace(/\s+/g, '-')}`}
      data-category={category}
    >
      <ScoreRing score={score?.score ?? null} />
      <div className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</div>
      {/* Band pill — "Good" / "Needs attention" / "Action required". Gives
          novices a plain-language reading of the number above. */}
      {score && (
        <span
          className={`mt-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${BAND_PILL[bandOf(score.score)]}`}
          data-band={bandOf(score.score)}
          data-testid="score-band"
        >
          {BAND_LABEL[bandOf(score.score)]}
        </span>
      )}
      <p className="mt-1 max-w-[18ch] text-xs text-slate-500">{description}</p>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-xs">
        <SeverityTally
          severity="critical"
          category={category}
          count={score?.counts.critical ?? 0}
          onSelect={onFilterChange}
          active={filter}
        />
        <SeverityTally
          severity="warning"
          category={category}
          count={score?.counts.warning ?? 0}
          onSelect={onFilterChange}
          active={filter}
        />
        <SeverityTally
          severity="info"
          category={category}
          count={score?.counts.info ?? 0}
          onSelect={onFilterChange}
          active={filter}
        />
      </div>
    </div>
  );
}
