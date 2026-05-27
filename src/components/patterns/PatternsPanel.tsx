import { useMemo, useState } from 'react';
import { Bot } from 'lucide-react';
import { useAuditReport } from '../../services/AuditCache';
import {
  recognizePatterns,
  PATTERN_KINDS,
  PATTERN_LABEL,
  type PatternInstance,
  type PatternKind,
  type PatternCheck,
} from '../../services/PatternRecognizer';
import { PATTERN_ICON } from '../icons/patternIcons';
import { iosMappingFor } from '../../services/IOSPatterns';
import { androidMappingFor } from '../../services/AndroidPatterns';

type Props = {
  onJump: (path: string, line: number) => void;
};

const CHECK_TONE: Record<PatternCheck['status'], string> = {
  pass: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  fail: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  info: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
};

const CHECK_GLYPH: Record<PatternCheck['status'], string> = {
  pass: '✓',
  fail: '✗',
  info: 'ⓘ',
};

export function PatternsPanel({ onJump }: Props) {
  const audit = useAuditReport();
  const report = useMemo(
    () => recognizePatterns(audit?.elements ?? []),
    [audit],
  );

  const [activeKind, setActiveKind] = useState<PatternKind | 'all'>('all');
  const visible = useMemo(() => {
    if (activeKind === 'all') return report.patterns;
    return report.patterns.filter((p) => p.kind === activeKind);
  }, [activeKind, report]);

  if (!audit) {
    return (
      <div className="card p-6 text-sm text-slate-600 dark:text-slate-400">
        Upload a project to recognize functional patterns.
      </div>
    );
  }

  if (report.patterns.length === 0) {
    return (
      <div className="card p-6 text-sm text-slate-600 dark:text-slate-400">
        No recognized patterns yet. Patterns need an HTML/JSX entry with
        recognizable widgets (date pickers, modals, tabs, search inputs…).
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="patterns-panel">
      {/* Chip row: All + 7 kinds */}
      <div className="card p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip
            id="all"
            label="All"
            n={report.patterns.length}
            active={activeKind === 'all'}
            onClick={() => setActiveKind('all')}
          />
          {PATTERN_KINDS.map((k) => {
            const Icon = PATTERN_ICON[k];
            return (
              <Chip
                key={k}
                id={k}
                icon={<Icon aria-hidden className="h-3.5 w-3.5" />}
                label={PATTERN_LABEL[k]}
                n={report.countsByKind[k]}
                active={activeKind === k}
                onClick={() => setActiveKind(k)}
              />
            );
          })}
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-500">
          Functional patterns recognized on top of the component inventory.
          Each card shows the anchor element, the evidence that classified it,
          and pattern-specific a11y heuristics.
        </p>
      </div>

      {visible.length === 0 ? (
        <div className="card p-6 text-sm text-slate-600 dark:text-slate-400">
          No patterns of this kind detected.
        </div>
      ) : (
        <ul
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
          data-testid="patterns-list"
        >
          {visible.map((p) => (
            <PatternCard key={p.id} pattern={p} onJump={onJump} />
          ))}
        </ul>
      )}
    </div>
  );
}

function PatternCard({
  pattern,
  onJump,
}: {
  pattern: PatternInstance;
  onJump: (path: string, line: number) => void;
}) {
  return (
    <li
      className="card flex flex-col gap-3 p-4"
      data-pattern={pattern.kind}
      data-anchor={pattern.anchor.id}
    >
      <header className="flex items-start gap-3">
        {(() => {
          const Icon = PATTERN_ICON[pattern.kind];
          return (
            <span
              aria-hidden
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700 dark:text-slate-300"
            >
              <Icon className="h-5 w-5" />
            </span>
          );
        })()}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {PATTERN_LABEL[pattern.kind]}
            </span>
            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-500">
              {pattern.evidence}
            </span>
            {pattern.members.length > 0 && (
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700">
                +{pattern.members.length} members
              </span>
            )}
          </div>
          {pattern.anchor.text && (
            <p className="mt-0.5 truncate text-xs text-slate-700 dark:text-slate-300">
              {pattern.anchor.text}
            </p>
          )}
        </div>
      </header>

      <button
        type="button"
        onClick={() => onJump(pattern.anchor.file, pattern.anchor.line)}
        data-jump={`${pattern.anchor.file}:${pattern.anchor.line}`}
        className="self-start rounded border border-slate-200 px-2 py-1 text-left font-mono text-[11px] text-slate-700 dark:text-slate-300 hover:border-brand-300 hover:bg-brand-50"
        title="Open in Analyzer · Source"
      >
        {'<'}
        {pattern.anchor.tagName}
        {'>'} · {pattern.anchor.file}:{pattern.anchor.line}
      </button>

      {pattern.checks.length > 0 && (
        <ul className="space-y-1.5" data-testid="pattern-checks">
          {pattern.checks.map((c, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-xs"
              data-check={c.status}
            >
              <span
                className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded ${CHECK_TONE[c.status]}`}
                aria-hidden
              >
                {CHECK_GLYPH[c.status]}
              </span>
              <div className="min-w-0">
                <div className="font-medium text-slate-800 dark:text-slate-200">{c.label}</div>
                <div className="truncate text-slate-500 dark:text-slate-500">{c.detail}</div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <IOSRecommendation kind={pattern.kind} />
      <AndroidRecommendation kind={pattern.kind} />
    </li>
  );
}

function IOSRecommendation({ kind }: { kind: PatternKind }) {
  const m = iosMappingFor(kind);
  return (
    <section
      className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-xs"
      data-testid="ios-recommendation"
      data-kind={kind}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
        <span aria-hidden></span>
        iOS recommendation
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        <span
          className="rounded bg-blue-50 px-1.5 py-0.5 font-mono text-[11px] font-medium text-blue-800 ring-1 ring-blue-200"
          data-uikit
        >
          UIKit · {m.uikit}
        </span>
        <span
          className="rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-[11px] font-medium text-indigo-800 ring-1 ring-indigo-200"
          data-swiftui
        >
          SwiftUI · {m.swiftui}
        </span>
      </div>
      <p className="mt-2 text-[11px] text-slate-700 dark:text-slate-300">{m.rationale}</p>
      <details className="mt-2">
        <summary className="cursor-pointer text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900">
          A11y benefits ({m.accessibility.length}) · SwiftUI sample
        </summary>
        <ul className="mt-1 list-inside list-disc space-y-0.5 text-[11px] text-slate-700 dark:text-slate-300">
          {m.accessibility.map((a, i) => (
            <li key={i}>{a}</li>
          ))}
        </ul>
        <pre className="mt-2 overflow-auto rounded bg-slate-900 p-2 font-mono text-[11px] leading-relaxed text-slate-100">
          {m.swiftSample}
        </pre>
        <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-500">{m.hig}</p>
      </details>
    </section>
  );
}

function AndroidRecommendation({ kind }: { kind: PatternKind }) {
  const m = androidMappingFor(kind);
  return (
    <section
      className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3 text-xs"
      data-testid="android-recommendation"
      data-kind={kind}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
        <Bot aria-hidden className="h-3.5 w-3.5" />
        Android recommendation
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        <span
          className="rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-[11px] font-medium text-emerald-900 ring-1 ring-emerald-300"
          data-views
        >
          Views · {m.views}
        </span>
        <span
          className="rounded bg-teal-100 px-1.5 py-0.5 font-mono text-[11px] font-medium text-teal-900 ring-1 ring-teal-300"
          data-compose
        >
          Compose · {m.compose}
        </span>
      </div>
      <p className="mt-2 text-[11px] text-slate-700 dark:text-slate-300">{m.rationale}</p>
      <details className="mt-2">
        <summary className="cursor-pointer text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900">
          A11y benefits ({m.accessibility.length}) · Compose sample
        </summary>
        <ul className="mt-1 list-inside list-disc space-y-0.5 text-[11px] text-slate-700 dark:text-slate-300">
          {m.accessibility.map((a, i) => (
            <li key={i}>{a}</li>
          ))}
        </ul>
        <pre className="mt-2 overflow-auto rounded bg-slate-900 p-2 font-mono text-[11px] leading-relaxed text-slate-100">
          {m.kotlinSample}
        </pre>
        <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-500">{m.material}</p>
      </details>
    </section>
  );
}

function Chip({
  id,
  icon,
  label,
  n,
  active,
  onClick,
}: {
  id: PatternKind | 'all';
  icon?: React.ReactNode;
  label: string;
  n: number;
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
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition',
        active
          ? 'border-brand-500 bg-brand-50 text-brand-800 ring-2 ring-brand-500 ring-offset-1'
          : 'border-slate-200 bg-white text-slate-700 dark:text-slate-300 hover:border-slate-300',
      ].join(' ')}
    >
      {icon}
      {label}
      <span
        className={[
          'rounded-full px-1.5 text-[10px] font-semibold tabular-nums',
          n === 0 ? 'bg-slate-100 text-slate-500 dark:text-slate-500' : 'bg-white text-slate-700 dark:text-slate-300',
        ].join(' ')}
      >
        {n}
      </span>
    </button>
  );
}
