import type { ScoreBand } from '../../services/Scoring';
import { bandOf } from '../../services/Scoring';

type Props = {
  /** 0 – 100 score, or null for an empty state. */
  score: number | null;
  size?: number;
  /** Visual style for the empty state. */
  emptyLabel?: string;
};

const BAND_STROKE: Record<ScoreBand, string> = {
  good: 'stroke-emerald-500',
  warn: 'stroke-amber-500',
  bad: 'stroke-rose-500',
};

const BAND_TEXT: Record<ScoreBand, string> = {
  good: 'text-emerald-700',
  warn: 'text-amber-700',
  bad: 'text-rose-700',
};

export function ScoreRing({ score, size = 80, emptyLabel = '—' }: Props) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = score === null ? 0 : Math.max(0, Math.min(100, score));
  const dash = (pct / 100) * c;
  const band = score === null ? 'warn' : bandOf(score);

  // Scale the numeric face with ring size so a 96px ring doesn't end up looking
  // like an 80px ring with empty space inside.
  const scoreFont = size >= 112 ? 'text-4xl' : size >= 96 ? 'text-3xl' : 'text-2xl';

  const ariaLabel =
    score === null ? 'Score not available' : `Score ${score} out of 100`;

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={ariaLabel}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-slate-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          className={score === null ? 'stroke-slate-300' : BAND_STROKE[band]}
        />
      </svg>
      {/*
        Inner stack: score number on top, "/100" subscript beneath. Both
        centered as a single block so the ring's geometric center carries
        the readable number, not the baseline of the larger glyph.
      */}
      <div
        aria-hidden
        className={[
          'absolute inset-0 flex flex-col items-center justify-center leading-none',
          score === null ? 'text-slate-400 dark:text-slate-500' : BAND_TEXT[band],
        ].join(' ')}
      >
        <span className={`${scoreFont} font-bold tabular-nums`}>
          {score === null ? emptyLabel : score}
        </span>
        {score !== null && (
          <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-500">
            / 100
          </span>
        )}
      </div>
    </div>
  );
}
