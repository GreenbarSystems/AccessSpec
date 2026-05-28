import type { Category } from '../../services/RuleEngine';
import type { CategoryScore } from '../../services/Scoring';
import { ScoreRing } from './ScoreRing';
import { SeverityTally, type SeverityFilter } from './SeverityTally';

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
      <p className="mt-0.5 max-w-[18ch] text-xs text-slate-500">{description}</p>
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
