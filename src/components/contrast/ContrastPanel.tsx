import { useMemo, useState } from 'react';
import { useSourceRepository } from '../../services/useSourceRepository';
import { useAuditReport } from '../../services/AuditCache';
import {
  analyzeContrast,
  formatRgba,
  type ContrastCheck,
  type RGB,
  type Verdict,
} from '../../services/ContrastChecker';

type Props = {
  onJump: (path: string, line: number) => void;
};

type Filter = 'all' | 'aa-fail' | 'aaa-fail' | 'skipped';

const VERDICT_BADGE: Record<Verdict, string> = {
  pass: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  fail: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
};

const VERDICT_GLYPH: Record<Verdict, string> = {
  pass: '✓',
  fail: '✗',
};

export function ContrastPanel({ onJump }: Props) {
  const { project } = useSourceRepository();
  const audit = useAuditReport();
  // analyzeContrast needs the raw files to find the page-level background
  // from <body>/<html>/:root CSS rules.
  const files = useMemo(
    () => (project ? [...project.filesByPath.values()] : []),
    [project],
  );
  const report = useMemo(
    () => analyzeContrast(audit?.elements ?? [], files),
    [audit, files],
  );

  const [filter, setFilter] = useState<Filter>('aa-fail');

  const visible = useMemo(() => {
    return report.checks.filter((c) => {
      switch (filter) {
        case 'all':
          return true;
        case 'aa-fail':
          return !c.skipped && c.passes.aa === 'fail';
        case 'aaa-fail':
          return !c.skipped && c.passes.aaa === 'fail';
        case 'skipped':
          return !!c.skipped;
      }
    });
  }, [report, filter]);

  if (!project) {
    return (
      <div className="card p-6 text-sm text-slate-600 dark:text-slate-400">
        Upload a project to run the contrast checker.
      </div>
    );
  }

  if (report.checks.length === 0) {
    return (
      <div className="card p-6 text-sm text-slate-600 dark:text-slate-400">
        No text-bearing components detected. Contrast applies to elements with
        visible text content and a declared <code>color</code>.
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="contrast-panel">
      {/* Summary chips */}
      <div className="card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Chip
            id="all"
            label="All"
            tone="bg-slate-100 text-slate-700 dark:text-slate-300 border-slate-200"
            primary={report.checks.length}
            secondary={`${report.totals.checked} measured · ${report.totals.skipped} skipped`}
            active={filter === 'all'}
            onClick={() => setFilter('all')}
          />
          <Chip
            id="aa-fail"
            label="AA failing"
            tone={
              report.totals.aaFailing
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }
            primary={report.totals.aaFailing}
            secondary={`of ${report.totals.checked} measured`}
            active={filter === 'aa-fail'}
            onClick={() => setFilter('aa-fail')}
          />
          <Chip
            id="aaa-fail"
            label="AAA failing"
            tone={
              report.totals.aaaFailing
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }
            primary={report.totals.aaaFailing}
            secondary={`of ${report.totals.checked} measured`}
            active={filter === 'aaa-fail'}
            onClick={() => setFilter('aaa-fail')}
          />
          <Chip
            id="skipped"
            label="Skipped"
            tone="bg-slate-100 text-slate-500 dark:text-slate-500 border-slate-200"
            primary={report.totals.skipped}
            secondary="no color resolved"
            active={filter === 'skipped'}
            onClick={() => setFilter('skipped')}
          />
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-500">
          Page background:{' '}
          <SwatchInline rgb={report.pageBackground} />{' '}
          <span className="font-mono">{formatRgba(report.pageBackground)}</span>
          {' · '}
          Thresholds — Normal: <span className="font-mono">AA 4.5</span>{' '}
          <span className="font-mono">AAA 7</span> · Large text:{' '}
          <span className="font-mono">AA 3</span>{' '}
          <span className="font-mono">AAA 4.5</span>
        </p>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {visible.length === 0 ? (
          <div className="p-6 text-sm text-emerald-700" data-testid="contrast-empty">
            ✓ No contrast issues under the active filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="contrast-table">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-500">
                  <th className="px-3 py-2 font-medium">Component</th>
                  <th className="px-3 py-2 font-medium">Foreground</th>
                  <th className="px-3 py-2 font-medium">Background</th>
                  <th className="px-3 py-2 font-medium text-center">Opacity</th>
                  <th className="px-3 py-2 font-medium text-right">Ratio</th>
                  <th className="px-3 py-2 font-medium text-center">AA</th>
                  <th className="px-3 py-2 font-medium text-center">AAA</th>
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
  c: ContrastCheck;
  onJump: (path: string, line: number) => void;
}) {
  const el = c.element;
  // Show the user the actual pixel rendered by the browser (post-opacity).
  const fgPreview = c.fgEffective ?? null;
  const bgPreview = c.bg ?? null;
  return (
    <tr
      className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
      data-row-id={el.id}
      data-skipped={c.skipped ? 'true' : undefined}
    >
      <td className="px-3 py-2 align-top">
        <button
          type="button"
          onClick={() => onJump(el.file, el.line)}
          data-jump={`${el.file}:${el.line}`}
          className="text-left hover:text-brand-700"
        >
          <div className="flex items-baseline gap-2">
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-slate-700 dark:text-slate-300">
              {el.type}
            </span>
            <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
              &lt;{el.tagName}&gt;
            </span>
            {c.isLargeText && (
              <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 ring-1 ring-violet-200">
                large
              </span>
            )}
          </div>
          <div className="mt-0.5 max-w-[28ch] truncate text-xs text-slate-800 dark:text-slate-200">
            {el.text}
          </div>
          <div className="mt-0.5 truncate font-mono text-[11px] text-slate-500 dark:text-slate-500">
            {el.file}:{el.line}
          </div>
        </button>
      </td>
      <td className="px-3 py-2 align-top">
        <ColorCell raw={c.fgRaw} preview={fgPreview} />
      </td>
      <td className="px-3 py-2 align-top">
        <ColorCell raw={c.bgRaw ?? '(page)'} preview={bgPreview} />
      </td>
      <td className="px-3 py-2 align-top text-center font-mono text-xs">
        {c.opacity === 1 ? '—' : c.opacity.toFixed(2)}
      </td>
      <td className="px-3 py-2 align-top text-right font-mono text-sm font-semibold">
        {c.skipped ? (
          <span className="text-slate-400 dark:text-slate-500" title={c.skipped}>
            —
          </span>
        ) : (
          <span
            className={c.passes.aa === 'pass' ? 'text-emerald-700' : 'text-rose-700'}
          >
            {c.ratio!.toFixed(2)}:1
          </span>
        )}
      </td>
      <td className="px-3 py-2 align-top text-center">
        <VerdictBadge c={c} level="aa" />
      </td>
      <td className="px-3 py-2 align-top text-center">
        <VerdictBadge c={c} level="aaa" />
      </td>
    </tr>
  );
}

function VerdictBadge({ c, level }: { c: ContrastCheck; level: 'aa' | 'aaa' }) {
  if (c.skipped) {
    return (
      <span className="rounded px-1.5 py-0.5 text-[11px] text-slate-400 dark:text-slate-500" title={c.skipped}>
        n/a
      </span>
    );
  }
  const v = c.passes[level];
  const required = level === 'aa' ? c.required.aa : c.required.aaa;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold ${VERDICT_BADGE[v]}`}
      title={`Requires ${required}:1${c.isLargeText ? ' (large text)' : ''}`}
      data-verdict={`${level}:${v}`}
    >
      <span aria-hidden>{VERDICT_GLYPH[v]}</span>
      {v}
    </span>
  );
}

function ColorCell({ raw, preview }: { raw: string | null; preview: RGB | null }) {
  if (!raw) {
    return <span className="text-slate-400 dark:text-slate-500">—</span>;
  }
  return (
    <div className="flex items-center gap-2 font-mono text-xs">
      {preview && <SwatchInline rgb={preview} />}
      <span className="truncate" title={raw}>
        {raw}
      </span>
    </div>
  );
}

function SwatchInline({ rgb }: { rgb: RGB }) {
  return (
    <span
      aria-hidden
      className="inline-block h-4 w-4 shrink-0 rounded border border-slate-300"
      style={{ backgroundColor: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` }}
    />
  );
}

function Chip({
  id,
  label,
  tone,
  primary,
  secondary,
  active,
  onClick,
}: {
  id: Filter;
  label: string;
  tone: string;
  primary: number;
  secondary: string;
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
