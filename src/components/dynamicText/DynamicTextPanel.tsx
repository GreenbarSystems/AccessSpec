import { useMemo, useState } from 'react';
import { useAuditReport } from '../../services/AuditCache';
import {
  simulateDynamicText,
  TEXT_SCALES,
  type DynamicTextCheck,
  type ScaleResult,
  type SimulationVerdict,
} from '../../services/DynamicTextSimulator';

type Props = {
  onJump: (path: string, line: number) => void;
};

const VERDICT_BADGE: Record<SimulationVerdict, string> = {
  pass: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  overflow: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  clipped: 'bg-orange-50 text-orange-800 ring-1 ring-orange-200',
  truncated: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
  unmeasurable: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
};

const VERDICT_GLYPH: Record<SimulationVerdict, string> = {
  pass: '✓',
  overflow: '↔',
  clipped: '✂',
  truncated: '…',
  unmeasurable: '?',
};

const VERDICT_LABEL: Record<SimulationVerdict, string> = {
  pass: 'pass',
  overflow: 'overflow',
  clipped: 'clipped',
  truncated: 'trunc.',
  unmeasurable: 'n/a',
};

type Filter = 'all' | 'any-fail' | 'breaks-at-200' | 'breaks-at-150' | 'unmeasurable';

export function DynamicTextPanel({ onJump }: Props) {
  const audit = useAuditReport();
  const report = useMemo(
    () => simulateDynamicText(audit?.elements ?? []),
    [audit],
  );

  const [filter, setFilter] = useState<Filter>('any-fail');

  const visible = useMemo(() => {
    return report.checks.filter((c) => {
      const allUnmeasured = c.results.every((r) => r.verdict === 'unmeasurable');
      switch (filter) {
        case 'all':
          return true;
        case 'any-fail':
          return c.firstFailureScale !== null;
        case 'breaks-at-200':
          return c.firstFailureScale !== null && c.firstFailureScale <= 2.0;
        case 'breaks-at-150':
          return c.firstFailureScale !== null && c.firstFailureScale <= 1.5;
        case 'unmeasurable':
          return allUnmeasured;
      }
    });
  }, [report, filter]);

  if (!audit) {
    return (
      <div className="card p-6 text-sm text-slate-600">
        Upload a project to simulate dynamic type scaling.
      </div>
    );
  }

  if (report.checks.length === 0) {
    return (
      <div className="card p-6 text-sm text-slate-600">
        No text-bearing components detected.
      </div>
    );
  }

  const anyFailCount = report.checks.filter((c) => c.firstFailureScale !== null).length;
  const fullyUnmeasured = report.checks.filter((c) =>
    c.results.every((r) => r.verdict === 'unmeasurable'),
  ).length;

  return (
    <div className="space-y-4" data-testid="dynamic-text-panel">
      {/* Summary chips */}
      <div className="card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Chip
            id="all"
            label="All"
            primary={report.checks.length}
            secondary="text-bearing components"
            tone="bg-slate-100 text-slate-700 border-slate-200"
            active={filter === 'all'}
            onClick={() => setFilter('all')}
          />
          <Chip
            id="any-fail"
            label="Any failure"
            primary={anyFailCount}
            secondary="fails at some scale"
            tone={
              anyFailCount
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }
            active={filter === 'any-fail'}
            onClick={() => setFilter('any-fail')}
          />
          <Chip
            id="breaks-at-150"
            label="Breaks ≤ 150%"
            primary={report.failuresByScale['1.5'] ?? 0}
            secondary="critical: common user setting"
            tone="bg-rose-50 text-rose-700 border-rose-200"
            active={filter === 'breaks-at-150'}
            onClick={() => setFilter('breaks-at-150')}
          />
          <Chip
            id="breaks-at-200"
            label="Breaks ≤ 200%"
            primary={report.failuresByScale['2'] ?? 0}
            secondary="max iOS / Android scale"
            tone="bg-amber-50 text-amber-800 border-amber-200"
            active={filter === 'breaks-at-200'}
            onClick={() => setFilter('breaks-at-200')}
          />
          <Chip
            id="unmeasurable"
            label="Unmeasurable"
            primary={fullyUnmeasured}
            secondary="missing width or font-size"
            tone="bg-slate-100 text-slate-500 border-slate-200"
            active={filter === 'unmeasurable'}
            onClick={() => setFilter('unmeasurable')}
          />
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Scaling iOS Dynamic Type / Android Font Scale: 100% → 200% in 25%
          steps. Verdicts use canvas-measured text width and the element's
          declared <code>width</code> / <code>max-width</code> /{' '}
          <code>height</code> / <code>overflow</code> / <code>text-overflow</code>.
        </p>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {visible.length === 0 ? (
          <div className="p-6 text-sm text-emerald-700" data-testid="dynamic-empty">
            ✅ No components fail under the current filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="dynamic-text-table">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2 font-medium">Component</th>
                  <th className="px-3 py-2 font-medium">Base</th>
                  <th className="px-3 py-2 font-medium">Container</th>
                  {TEXT_SCALES.map((s) => (
                    <th
                      key={s}
                      className="px-3 py-2 font-medium text-center"
                      title={`${s * 100}% scale`}
                    >
                      {Math.round(s * 100)}%
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((c) => (
                  <Row key={c.element.id} c={c} onJump={onJump} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({
  c,
  onJump,
}: {
  c: DynamicTextCheck;
  onJump: (path: string, line: number) => void;
}) {
  const el = c.element;
  return (
    <tr
      className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
      data-row-id={el.id}
      data-first-fail={c.firstFailureScale ?? undefined}
    >
      <td className="px-3 py-2 align-top">
        <button
          type="button"
          onClick={() => onJump(el.file, el.line)}
          data-jump={`${el.file}:${el.line}`}
          className="text-left hover:text-brand-700"
        >
          <div className="flex items-baseline gap-2">
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-slate-700">
              {el.type}
            </span>
            <span className="font-mono text-xs text-slate-700">
              &lt;{el.tagName}&gt;
            </span>
          </div>
          <div className="mt-0.5 max-w-[28ch] truncate text-xs text-slate-800">
            {el.text}
          </div>
          <div className="mt-0.5 truncate font-mono text-[11px] text-slate-500">
            {el.file}:{el.line}
          </div>
        </button>
      </td>
      <td className="px-3 py-2 align-top font-mono text-xs text-slate-700">
        {c.baseFontPx === null ? '—' : `${c.baseFontPx}px`}
      </td>
      <td className="px-3 py-2 align-top font-mono text-xs text-slate-700">
        <div>{c.containerWidth === null ? '—' : `w ${c.containerWidth}px`}</div>
        <div className="text-slate-500">
          {c.containerHeight === null ? 'h —' : `h ${c.containerHeight}px`}
        </div>
        {(c.whiteSpace === 'nowrap' || c.textOverflow === 'ellipsis') && (
          <div className="mt-1 text-[10px] text-slate-500">
            {c.whiteSpace === 'nowrap' && 'nowrap '}
            {c.textOverflow === 'ellipsis' && 'ellipsis'}
          </div>
        )}
      </td>
      {c.results.map((r) => (
        <ScaleCell key={r.scale} r={r} />
      ))}
    </tr>
  );
}

function ScaleCell({ r }: { r: ScaleResult }) {
  return (
    <td className="px-3 py-2 align-top text-center">
      <span
        className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold ${VERDICT_BADGE[r.verdict]}`}
        title={r.note ?? `${r.fontPx}px${r.lines ? ` · ${r.lines} line${r.lines === 1 ? '' : 's'}` : ''}`}
        data-verdict={`${r.scale}:${r.verdict}`}
      >
        <span aria-hidden>{VERDICT_GLYPH[r.verdict]}</span>
        {VERDICT_LABEL[r.verdict]}
      </span>
    </td>
  );
}

function Chip({
  id,
  label,
  primary,
  secondary,
  tone,
  active,
  onClick,
}: {
  id: Filter;
  label: string;
  primary: number;
  secondary: string;
  tone: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-chip={id}
      className={[
        'flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left transition',
        active ? 'ring-2 ring-brand-500 ring-offset-1' : 'opacity-90 hover:opacity-100',
        tone,
      ].join(' ')}
    >
      <span className="text-xs font-semibold">{label}</span>
      <span className="font-mono text-sm font-semibold">{primary}</span>
      <span className="text-[10px] opacity-80">{secondary}</span>
    </button>
  );
}
