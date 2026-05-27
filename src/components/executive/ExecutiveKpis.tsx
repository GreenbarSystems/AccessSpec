import { useAuditReport } from '../../services/AuditCache';
import { bandOf, type ScoreBand } from '../../services/Scoring';

/**
 * ExecutiveKpis
 *
 * Four at-a-glance tiles for the Dashboard hero: Accessibility, Mobile,
 * and Parity scores (0–100) plus the total critical-issue count. Each tile
 * is tone-colored by its band so a stakeholder can scan the row and know
 * the posture without reading numbers.
 *
 * Pulls data from the same `audit()` pipeline as the detailed ring cards
 * below, so the two sections always agree.
 */

type Tone = ScoreBand;

const TONE: Record<Tone, { card: string; bar: string; number: string }> = {
  good: {
    card: 'border-emerald-200 bg-emerald-50/50',
    bar: 'bg-emerald-500',
    number: 'text-emerald-700',
  },
  warn: {
    card: 'border-amber-200 bg-amber-50/50',
    bar: 'bg-amber-500',
    number: 'text-amber-700',
  },
  bad: {
    card: 'border-rose-200 bg-rose-50/50',
    bar: 'bg-rose-500',
    number: 'text-rose-700',
  },
};

export function ExecutiveKpis() {
  const report = useAuditReport();

  const a11y = report?.scores.byCategory.accessibility.score ?? null;
  const mobile = report?.scores.byCategory.mobile.score ?? null;
  const parity = report?.scores.byCategory.parity.score ?? null;
  const critical = report?.scores.totalCounts.critical ?? null;

  return (
    <section
      aria-label="Executive KPIs"
      className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      data-testid="executive-kpis"
    >
      <ScoreTile label="Accessibility Score" score={a11y} dataKey="accessibility" />
      <ScoreTile label="Mobile Score" score={mobile} dataKey="mobile" />
      <ScoreTile label="Parity Score" score={parity} dataKey="parity" />
      <CriticalTile count={critical} />
    </section>
  );
}

function toneForScore(score: number | null): Tone {
  if (score === null) return 'warn';
  return bandOf(score);
}

function ScoreTile({
  label,
  score,
  dataKey,
}: {
  label: string;
  score: number | null;
  dataKey: string;
}) {
  const tone = TONE[toneForScore(score)];
  const pct = score === null ? 0 : Math.max(0, Math.min(100, score));
  return (
    <article
      className={`card relative overflow-hidden border p-4 ${tone.card}`}
      data-testid={`kpi-${dataKey}`}
      data-score={score ?? ''}
    >
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span
          className={`text-4xl font-bold tabular-nums leading-none ${tone.number}`}
        >
          {score ?? '—'}
        </span>
        {score !== null && (
          <span className="text-sm font-medium text-slate-500">/100</span>
        )}
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {score === null
          ? 'No project loaded'
          : score >= 90
            ? 'On track'
            : score >= 70
              ? 'Needs attention'
              : 'Action required'}
      </p>
      {/* Bottom bar = visual score representation */}
      <div
        className="absolute inset-x-0 bottom-0 h-1.5 bg-slate-200/60"
        aria-hidden
      >
        <div
          className={`h-full transition-all ${tone.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </article>
  );
}

function CriticalTile({ count }: { count: number | null }) {
  const tone = TONE[count === null ? 'warn' : count > 0 ? 'bad' : 'good'];
  return (
    <article
      className={`card relative overflow-hidden border p-4 ${tone.card}`}
      data-testid="kpi-critical"
      data-count={count ?? ''}
    >
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        Critical Issues
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span
          className={`text-4xl font-bold tabular-nums leading-none ${tone.number}`}
        >
          {count ?? '—'}
        </span>
        {count !== null && count > 0 && (
          <span className="text-sm font-medium text-slate-500">
            blocking
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {count === null
          ? 'No project loaded'
          : count === 0
            ? 'No blocking findings'
            : count === 1
              ? 'Resolve before ship'
              : 'Resolve before ship'}
      </p>
      <div
        className="absolute inset-x-0 bottom-0 h-1.5 bg-slate-200/60"
        aria-hidden
      >
        <div
          className={`h-full transition-all ${tone.bar}`}
          style={{
            width: count === null ? '0%' : count === 0 ? '100%' : `${Math.min(100, count * 12)}%`,
          }}
        />
      </div>
    </article>
  );
}
