import { useMemo, useState } from 'react';
import { useSourceRepository } from '../../services/useSourceRepository';
import { detectComponents } from '../../services/ComponentDetector';
import { enrichElements } from '../../services/CssResolver';
import {
  analyzeTouchTargets,
  STANDARDS,
  STANDARD_DEFS,
  type StandardId,
  type TouchTargetMeasurement,
  type VerdictStatus,
} from '../../services/TouchTargetAnalyzer';

type Props = {
  onJump: (path: string, line: number) => void;
};

const STATUS_BADGE: Record<VerdictStatus, string> = {
  pass: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  fail: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  unmeasurable: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
};

const STATUS_GLYPH: Record<VerdictStatus, string> = {
  pass: '✓',
  fail: '✗',
  unmeasurable: '?',
};

export function TouchTargetsPanel({ onJump }: Props) {
  const { project } = useSourceRepository();
  const files = useMemo(() => {
    if (!project) return [];
    return [...project.filesByPath.values()];
  }, [project]);

  const report = useMemo(() => {
    const elements = enrichElements(detectComponents(files), files);
    return analyzeTouchTargets(elements);
  }, [files]);

  const [onlyViolations, setOnlyViolations] = useState(true);
  const [activeStandard, setActiveStandard] = useState<StandardId | 'any'>('any');

  const visible = useMemo(() => {
    return report.measurements.filter((m) => {
      if (onlyViolations) {
        if (activeStandard === 'any') return m.hasViolation;
        return m.verdicts[activeStandard].status === 'fail';
      }
      return true;
    });
  }, [report, onlyViolations, activeStandard]);

  if (!project) {
    return (
      <div className="card p-6 text-sm text-slate-600">
        Upload a project to analyze touch targets.
      </div>
    );
  }

  if (report.totalInteractive === 0) {
    return (
      <div className="card p-6 text-sm text-slate-600">
        No interactive components detected. Touch targets apply to buttons,
        links, inputs, tabs, and menu items.
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="touch-targets-panel">
      {/* Summary chips per standard */}
      <div className="card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <StandardChip
            id="any"
            label="Any"
            failing={report.measurements.filter((m) => m.hasViolation).length}
            measured={report.totalInteractive}
            active={activeStandard === 'any'}
            onClick={() => setActiveStandard('any')}
          />
          {STANDARDS.map((s) => {
            const t = report.totalsByStandard[s];
            return (
              <StandardChip
                key={s}
                id={s}
                label={STANDARD_DEFS[s].label}
                spec={`${STANDARD_DEFS[s].minWidth}×${STANDARD_DEFS[s].minHeight}px`}
                failing={t.failing}
                measured={t.measured}
                unmeasured={t.unmeasured}
                active={activeStandard === s}
                onClick={() => setActiveStandard(s)}
              />
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            <span className="font-semibold text-slate-800">
              {report.totalInteractive}
            </span>{' '}
            interactive component{report.totalInteractive === 1 ? '' : 's'} ·
            showing{' '}
            <span className="font-semibold text-slate-800">{visible.length}</span>
          </p>
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={onlyViolations}
              onChange={(e) => setOnlyViolations(e.target.checked)}
              data-testid="violations-only"
              className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            Show violations only
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {visible.length === 0 ? (
          <div className="p-6 text-sm text-emerald-700" data-testid="empty-state">
            ✅ No touch-target violations under the active filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="touch-target-table">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2 font-medium">Component</th>
                  <th className="px-3 py-2 font-medium">Size</th>
                  <th className="px-3 py-2 font-medium">Spacing</th>
                  {STANDARDS.map((s) => (
                    <th
                      key={s}
                      className="px-3 py-2 font-medium text-center"
                      title={STANDARD_DEFS[s].spec}
                    >
                      {STANDARD_DEFS[s].label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((m) => (
                  <Row key={m.element.id} m={m} onJump={onJump} />
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
  m,
  onJump,
}: {
  m: TouchTargetMeasurement;
  onJump: (path: string, line: number) => void;
}) {
  const el = m.element;
  return (
    <tr
      className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
      data-row-id={el.id}
      data-violation={m.hasViolation || undefined}
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
          {el.text && (
            <div className="mt-0.5 max-w-[28ch] truncate text-xs text-slate-800">
              {el.text}
            </div>
          )}
          <div className="mt-0.5 truncate font-mono text-[11px] text-slate-500">
            {el.file}:{el.line}
          </div>
        </button>
      </td>
      <td className="px-3 py-2 align-top font-mono text-xs text-slate-700">
        {fmtPx(m.width)} × {fmtPx(m.height)}
      </td>
      <td className="px-3 py-2 align-top font-mono text-xs text-slate-700">
        {fmtSpacing(m)}
      </td>
      {STANDARDS.map((s) => {
        const v = m.verdicts[s];
        return (
          <td key={s} className="px-3 py-2 align-top text-center">
            <span
              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[v.status]}`}
              title={v.message}
              data-verdict={`${s}:${v.status}`}
            >
              <span aria-hidden>{STATUS_GLYPH[v.status]}</span>
              {v.status === 'pass' ? 'pass' : v.status === 'fail' ? 'fail' : 'n/a'}
            </span>
          </td>
        );
      })}
    </tr>
  );
}

function fmtPx(n: number | null): string {
  return n === null ? '—' : `${n}px`;
}

function fmtSpacing(m: TouchTargetMeasurement): string {
  if (
    m.spacingTop === null &&
    m.spacingRight === null &&
    m.spacingBottom === null &&
    m.spacingLeft === null
  ) {
    return '—';
  }
  // Compact TRBL like CSS shorthand.
  const t = fmtPx(m.spacingTop);
  const r = fmtPx(m.spacingRight);
  const b = fmtPx(m.spacingBottom);
  const l = fmtPx(m.spacingLeft);
  if (t === r && r === b && b === l) return t;
  if (t === b && r === l) return `${t} ${r}`;
  return `${t} ${r} ${b} ${l}`;
}

function StandardChip({
  id,
  label,
  spec,
  failing,
  measured,
  unmeasured,
  active,
  onClick,
}: {
  id: StandardId | 'any';
  label: string;
  spec?: string;
  failing: number;
  measured: number;
  unmeasured?: number;
  active: boolean;
  onClick: () => void;
}) {
  const tone =
    failing > 0
      ? 'bg-rose-50 text-rose-700 border-rose-200'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200';
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
      {spec && <span className="text-[10px] opacity-80">{spec}</span>}
      <span className="mt-1 text-[11px] font-mono">
        <span className="font-semibold">{failing}</span>
        <span className="opacity-70"> / {measured} failing</span>
        {unmeasured ? <span className="opacity-50"> · {unmeasured} n/a</span> : null}
      </span>
    </button>
  );
}
