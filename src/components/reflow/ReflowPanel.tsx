import { useMemo, useState } from 'react';
import { useAuditReport } from '../../services/AuditCache';
import {
  analyzeReflow,
  VIEWPORTS,
  type ReflowCheck,
  type ReflowVerdict,
  type Viewport,
  type ViewportResult,
} from '../../services/ReflowAnalyzer';

type Props = {
  onJump: (path: string, line: number) => void;
};

const VERDICT_BADGE: Record<ReflowVerdict, string> = {
  fits: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  scrolls: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  clipped: 'bg-orange-50 text-orange-800 ring-1 ring-orange-200',
  fluid: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  unmeasurable: 'bg-slate-100 text-slate-500 dark:text-slate-500 ring-1 ring-slate-200',
};

const VERDICT_GLYPH: Record<ReflowVerdict, string> = {
  fits: '✓',
  scrolls: '↔',
  clipped: '✂',
  fluid: '~',
  unmeasurable: '?',
};

const VERDICT_LABEL: Record<ReflowVerdict, string> = {
  fits: 'fits',
  scrolls: 'scroll',
  clipped: 'clip',
  fluid: 'fluid',
  unmeasurable: 'n/a',
};

const VIEWPORT_LABEL: Record<Viewport, string> = {
  320: '320 · iPhone SE',
  375: '375 · iPhone mini',
  414: '414 · iPhone Plus',
  768: '768 · iPad portrait',
};

type Filter = 'any-fail' | 'fail-320' | 'fail-768' | 'all';

export function ReflowPanel({ onJump }: Props) {
  const audit = useAuditReport();
  const report = useMemo(
    () => analyzeReflow(audit?.elements ?? []),
    [audit],
  );

  const [filter, setFilter] = useState<Filter>('any-fail');

  const visible = useMemo(() => {
    return report.checks.filter((c) => {
      switch (filter) {
        case 'all':
          return true;
        case 'any-fail':
          return c.worstFailingViewport !== null;
        case 'fail-320':
          return c.results.some(
            (r) => r.viewport === 320 && (r.verdict === 'scrolls' || r.verdict === 'clipped'),
          );
        case 'fail-768':
          return c.results.some(
            (r) => r.viewport === 768 && (r.verdict === 'scrolls' || r.verdict === 'clipped'),
          );
      }
    });
  }, [report, filter]);

  if (!audit) {
    return (
      <div className="card p-6 text-sm text-slate-600 dark:text-slate-400">
        Upload a project to run the responsive reflow audit.
      </div>
    );
  }

  if (report.checks.length === 0) {
    return (
      <div className="card p-6 text-sm text-slate-600 dark:text-slate-400">
        No components detected to analyze.
      </div>
    );
  }

  const anyFail = report.checks.filter((c) => c.worstFailingViewport !== null).length;

  return (
    <div className="space-y-4" data-testid="reflow-panel">
      {/* Per-viewport summary chips */}
      <div className="card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Chip
            id="all"
            label="All"
            primary={report.checks.length}
            secondary="components analyzed"
            tone="bg-slate-100 text-slate-700 dark:text-slate-300 border-slate-200"
            active={filter === 'all'}
            onClick={() => setFilter('all')}
          />
          <Chip
            id="any-fail"
            label="Any failure"
            primary={anyFail}
            secondary="fails at some viewport"
            tone={
              anyFail
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }
            active={filter === 'any-fail'}
            onClick={() => setFilter('any-fail')}
          />
          <Chip
            id="fail-320"
            label="Fails @ 320"
            primary={report.failuresByViewport[320]}
            secondary="WCAG 1.4.10 reflow"
            tone="bg-rose-50 text-rose-700 border-rose-200"
            active={filter === 'fail-320'}
            onClick={() => setFilter('fail-320')}
          />
          <Chip
            id="fail-768"
            label="Fails @ 768"
            primary={report.failuresByViewport[768]}
            secondary="tablet portrait"
            tone="bg-amber-50 text-amber-800 border-amber-200"
            active={filter === 'fail-768'}
            onClick={() => setFilter('fail-768')}
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {VIEWPORTS.map((vp) => {
            const d = report.detailsByViewport[vp];
            return (
              <div
                key={vp}
                className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
                data-viewport-summary={vp}
              >
                <div className="font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  {VIEWPORT_LABEL[vp]}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-slate-600 dark:text-slate-400">
                  <Tally tone="text-rose-700" label="scroll" n={d.scrolls} />
                  <Tally tone="text-orange-700" label="clip" n={d.clipped} />
                  <Tally tone="text-emerald-700" label="fits" n={d.fits} />
                  <Tally tone="text-sky-700" label="fluid" n={d.fluid} />
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-500">
          Tests against four reference widths. Elements with no declared px
          width are treated as <span className="text-sky-700">fluid</span> —
          the browser reflows them naturally. Fixed widths exceeding the
          viewport produce <span className="text-rose-700">scroll</span>;
          fixed widths plus <code>overflow:hidden</code> produce{' '}
          <span className="text-orange-700">clip</span>.
        </p>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {visible.length === 0 ? (
          <div className="p-6 text-sm text-emerald-700" data-testid="reflow-empty">
            ✓ No reflow issues under the current filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="reflow-table">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-500">
                  <th className="px-3 py-2 font-medium">Component</th>
                  <th className="px-3 py-2 font-medium">Declared width</th>
                  {VIEWPORTS.map((vp) => (
                    <th key={vp} className="px-3 py-2 font-medium text-center" title={VIEWPORT_LABEL[vp]}>
                      {vp}px
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
  c: ReflowCheck;
  onJump: (path: string, line: number) => void;
}) {
  const el = c.element;
  return (
    <tr
      className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
      data-row-id={el.id}
      data-worst={c.worstFailingViewport ?? undefined}
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
          </div>
          {el.text && (
            <div className="mt-0.5 max-w-[28ch] truncate text-xs text-slate-800 dark:text-slate-200">
              {el.text}
            </div>
          )}
          <div className="mt-0.5 truncate font-mono text-[11px] text-slate-500 dark:text-slate-500">
            {el.file}:{el.line}
          </div>
        </button>
      </td>
      <td className="px-3 py-2 align-top font-mono text-xs text-slate-700 dark:text-slate-300">
        <div>
          {c.declaredWidth !== null
            ? `w ${c.declaredWidth}px`
            : c.isPercentageWidth
              ? 'w fluid'
              : 'w —'}
        </div>
        {c.declaredMinWidth !== null && (
          <div className="text-slate-500 dark:text-slate-500">min {c.declaredMinWidth}px</div>
        )}
        {c.declaredMaxWidth !== null && (
          <div className="text-slate-500 dark:text-slate-500">max {c.declaredMaxWidth}px</div>
        )}
        {c.overflow && (
          <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-500">
            overflow: {c.overflow}
          </div>
        )}
      </td>
      {c.results.map((r) => (
        <ViewportCell key={r.viewport} r={r} />
      ))}
    </tr>
  );
}

function ViewportCell({ r }: { r: ViewportResult }) {
  return (
    <td className="px-3 py-2 align-top text-center">
      <span
        className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold ${VERDICT_BADGE[r.verdict]}`}
        title={r.note}
        data-verdict={`${r.viewport}:${r.verdict}`}
      >
        <span aria-hidden>{VERDICT_GLYPH[r.verdict]}</span>
        {VERDICT_LABEL[r.verdict]}
      </span>
    </td>
  );
}

function Tally({ tone, label, n }: { tone: string; label: string; n: number }) {
  if (n === 0) return null;
  return (
    <span className={tone}>
      <span className="font-semibold">{n}</span> {label}
    </span>
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
