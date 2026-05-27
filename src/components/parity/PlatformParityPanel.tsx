import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuditReport } from '../../services/AuditCache';
import {
  analyzeParity,
  type ParityRow,
  type ParityVerdict,
} from '../../services/PlatformParityEngine';
import {
  PATTERN_LABEL,
  type PatternKind,
} from '../../services/PatternRecognizer';
import { PATTERN_ICON } from '../icons/patternIcons';
import { Bot } from 'lucide-react';

const VERDICT_TONE: Record<ParityVerdict, string> = {
  native: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  custom: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
  generic: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
};

const VERDICT_GLYPH: Record<ParityVerdict, string> = {
  native: '✓',
  custom: '~',
  generic: '✗',
};

const VERDICT_LABEL: Record<ParityVerdict, string> = {
  native: 'native semantic',
  custom: 'custom component',
  generic: 'generic markup',
};

type Filter = 'all' | ParityVerdict | PatternKind;

export function PlatformParityPanel() {
  const navigate = useNavigate();
  const audit = useAuditReport();
  const report = useMemo(
    () => analyzeParity(audit?.elements ?? []),
    [audit],
  );

  const [filter, setFilter] = useState<Filter>('all');
  const visible = useMemo(() => {
    if (filter === 'all') return report.rows;
    if (filter === 'native' || filter === 'custom' || filter === 'generic') {
      return report.rows.filter((r) => r.current.verdict === filter);
    }
    return report.rows.filter((r) => r.kind === filter);
  }, [filter, report]);

  if (!audit) {
    return (
      <div className="card p-6 text-sm text-slate-600">
        Upload a project to generate the parity report.
      </div>
    );
  }
  if (report.rows.length === 0) {
    return (
      <div className="card p-6 text-sm text-slate-600">
        No recognizable patterns to compare. Patterns like modals, tabs, date
        pickers, and toggles produce parity rows.
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="platform-parity-panel">
      {/* Summary chips — split into two rows so verdict chips and kind chips
          don't collide when the row wraps past ~8 items. */}
      <div className="card p-3">
        <div
          className="flex flex-wrap items-center gap-1.5"
          aria-label="Filter by verdict"
        >
          <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Verdict
          </span>
          <Chip
            id="all"
            label="All"
            n={report.rows.length}
            active={filter === 'all'}
            onClick={() => setFilter('all')}
          />
          <Chip
            id="native"
            label="Native"
            tone="bg-emerald-50 text-emerald-700 border-emerald-200"
            n={report.verdictCounts.native}
            active={filter === 'native'}
            onClick={() => setFilter('native')}
          />
          <Chip
            id="custom"
            label="Custom"
            tone="bg-amber-50 text-amber-800 border-amber-200"
            n={report.verdictCounts.custom}
            active={filter === 'custom'}
            onClick={() => setFilter('custom')}
          />
          <Chip
            id="generic"
            label="Generic"
            tone="bg-rose-50 text-rose-700 border-rose-200"
            n={report.verdictCounts.generic}
            active={filter === 'generic'}
            onClick={() => setFilter('generic')}
          />
        </div>
        <div
          className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2"
          aria-label="Filter by pattern kind"
        >
          <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Kind
          </span>
          {(Object.keys(report.countsByKind) as PatternKind[])
            .filter((k) => report.countsByKind[k] > 0)
            .map((k) => {
              const Icon = PATTERN_ICON[k];
              return (
                <Chip
                  key={k}
                  id={k}
                  icon={<Icon aria-hidden className="h-3.5 w-3.5" />}
                  label={PATTERN_LABEL[k]}
                  n={report.countsByKind[k]}
                  active={filter === k}
                  onClick={() => setFilter(k)}
                />
              );
            })}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Each row compares the current implementation against the native iOS
          and Android primitives it should map to. Use the verdict chip to
          spot generic markup that needs upgrading.
        </p>
      </div>

      {visible.length === 0 ? (
        <div className="card p-6 text-sm text-slate-600">
          No rows match the current filter.
        </div>
      ) : (
        <ul className="space-y-3" data-testid="parity-rows">
          {visible.map((row) => (
            <ParityCard
              key={row.id}
              row={row}
              onJump={(path, line) =>
                navigate('/analyzer', { state: { jump: { path, line } } })
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ParityCard({
  row,
  onJump,
}: {
  row: ParityRow;
  onJump: (path: string, line: number) => void;
}) {
  return (
    <li
      className="card overflow-hidden"
      data-row-id={row.id}
      data-kind={row.kind}
      data-verdict={row.current.verdict}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2">
        <div className="flex items-center gap-2">
          {(() => {
            const Icon = PATTERN_ICON[row.kind];
            return <Icon aria-hidden className="h-5 w-5 text-slate-700" />;
          })()}
          <span className="text-sm font-semibold text-slate-900">
            {PATTERN_LABEL[row.kind]}
          </span>
          <span className="font-mono text-[11px] text-slate-500">
            {row.pattern.evidence}
          </span>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold ${VERDICT_TONE[row.current.verdict]}`}
          data-verdict-chip={row.current.verdict}
        >
          <span aria-hidden>{VERDICT_GLYPH[row.current.verdict]}</span>
          {VERDICT_LABEL[row.current.verdict]}
        </span>
      </header>

      <div className="grid grid-cols-1 gap-px bg-slate-200 md:grid-cols-3">
        {/* Current */}
        <section className="bg-white p-3" data-col="current">
          <h3 className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Current component
          </h3>
          <div className="mt-1 font-mono text-xs text-slate-700">
            &lt;{row.current.tagName}&gt;
          </div>
          {row.current.text && (
            <p className="mt-1 truncate text-xs text-slate-800">
              {row.current.text}
            </p>
          )}
          <button
            type="button"
            onClick={() => onJump(row.current.file, row.current.line)}
            data-jump={`${row.current.file}:${row.current.line}`}
            className="mt-1 truncate font-mono text-[11px] text-brand-700 underline-offset-2 hover:underline"
          >
            {row.current.file}:{row.current.line}
          </button>
          <p className="mt-2 text-[11px] text-slate-600">{row.current.note}</p>
        </section>

        {/* iOS */}
        <section className="bg-white p-3" data-col="ios">
          <h3 className="text-[10px] font-semibold uppercase tracking-wide text-blue-700">
             iOS native
          </h3>
          <div
            className="mt-1 font-mono text-xs text-blue-900"
            data-ios-uikit
          >
            {row.ios.uikit}
          </div>
          <div
            className="mt-0.5 font-mono text-[11px] text-indigo-800"
            data-ios-swiftui
          >
            SwiftUI · {row.ios.swiftui}
          </div>
          <p className="mt-2 text-[11px] text-slate-600">{row.ios.rationale}</p>
        </section>

        {/* Android */}
        <section className="bg-white p-3" data-col="android">
          <h3 className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
            <Bot aria-hidden className="h-3.5 w-3.5" /> Android native
          </h3>
          <div
            className="mt-1 font-mono text-xs text-emerald-900"
            data-android-views
          >
            {row.android.views}
          </div>
          <div
            className="mt-0.5 font-mono text-[11px] text-teal-800"
            data-android-compose
          >
            Compose · {row.android.compose}
          </div>
          <p className="mt-2 text-[11px] text-slate-600">
            {row.android.rationale}
          </p>
        </section>
      </div>

      {/* Gaps */}
      <footer className="border-t border-slate-200 bg-slate-50 px-4 py-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Parity actions ({row.gaps.length})
        </h3>
        <ul
          className="mt-1 list-inside list-disc space-y-0.5 text-xs text-slate-700"
          data-testid="parity-gaps"
        >
          {row.gaps.map((g, i) => (
            <li key={i}>{g}</li>
          ))}
        </ul>
      </footer>
    </li>
  );
}

function Chip({
  id,
  label,
  icon,
  n,
  tone,
  active,
  onClick,
}: {
  id: Filter;
  label: string;
  icon?: React.ReactNode;
  n: number;
  tone?: string;
  active: boolean;
  onClick: () => void;
}) {
  const base = tone ?? 'bg-slate-100 text-slate-700 border-slate-200';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-chip={id}
      className={[
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition',
        active
          ? 'ring-2 ring-brand-500 ring-offset-1'
          : 'opacity-90 hover:opacity-100',
        base,
      ].join(' ')}
    >
      {icon}
      {label}
      <span className="rounded-full bg-white/70 px-1.5 text-[10px] font-semibold tabular-nums">
        {n}
      </span>
    </button>
  );
}
