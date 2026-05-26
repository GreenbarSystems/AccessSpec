import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSourceRepository } from '../../services/useSourceRepository';
import { useAuditReport } from '../../services/AuditCache';
import {
  CAT_LABEL,
  generateRefactors,
  type RefactorCategory,
  type RefactorSuggestion,
} from '../../services/RefactoringGenerator';
import type { Severity } from '../../services/RuleEngine';

const CATEGORY_ORDER: RefactorCategory[] = ['html', 'css', 'aria', 'touch-target'];

const CATEGORY_ICON: Record<RefactorCategory, string> = {
  html: '🧱',
  css: '🎨',
  aria: '🦮',
  'touch-target': '👆',
};

const CATEGORY_TONE: Record<RefactorCategory, string> = {
  html: 'border-orange-200 bg-orange-50/40',
  css: 'border-sky-200 bg-sky-50/40',
  aria: 'border-violet-200 bg-violet-50/40',
  'touch-target': 'border-emerald-200 bg-emerald-50/40',
};

const SEVERITY_TONE: Record<Severity, string> = {
  critical: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  warning: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
  info: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
};

type Filter = 'all' | RefactorCategory;

export function RefactoringPanel() {
  const navigate = useNavigate();
  const { project } = useSourceRepository();
  const report = useAuditReport();
  // `generateRefactors` reads source lines for the "before" snippet, so it
  // still needs the file list. Reading from `project.filesByPath` is cheap.
  const files = useMemo(
    () => (project ? [...project.filesByPath.values()] : []),
    [project],
  );
  const refactor = useMemo(
    () => (report ? generateRefactors(report.findings, files) : null),
    [report, files],
  );

  const [filter, setFilter] = useState<Filter>('all');
  const [toast, setToast] = useState<string | null>(null);

  if (!project) {
    return (
      <div className="card p-6 text-sm text-slate-600">
        Upload a project to generate refactoring suggestions.
      </div>
    );
  }
  if (!refactor || refactor.suggestions.length === 0) {
    return (
      <div className="card p-6 text-sm text-emerald-700">
        ✓ Nothing to refactor — every detected component passes the active rules.
      </div>
    );
  }

  const counts = {
    all: refactor.suggestions.length,
    html: refactor.byCategory.html.length,
    css: refactor.byCategory.css.length,
    aria: refactor.byCategory.aria.length,
    'touch-target': refactor.byCategory['touch-target'].length,
  };

  const visibleCategories =
    filter === 'all'
      ? CATEGORY_ORDER.filter((c) => refactor.byCategory[c].length > 0)
      : refactor.byCategory[filter].length > 0
        ? [filter]
        : [];

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast(`Copied ${label} to clipboard.`);
    } catch {
      setToast('Clipboard blocked — select & copy manually.');
    }
    setTimeout(() => setToast(null), 2500);
  };

  return (
    <div className="space-y-4" data-testid="refactoring-panel">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip id="all" label="All" n={counts.all} active={filter === 'all'} onClick={() => setFilter('all')} />
          {CATEGORY_ORDER.map((c) => (
            <Chip
              key={c}
              id={c}
              label={`${CATEGORY_ICON[c]} ${CAT_LABEL[c]}`}
              n={counts[c]}
              active={filter === c}
              onClick={() => setFilter(c)}
            />
          ))}
        </div>
        {toast && (
          <span className="text-xs text-emerald-700" role="status">
            {toast}
          </span>
        )}
      </div>

      {visibleCategories.length === 0 ? (
        <div className="card p-6 text-sm text-slate-500">
          No suggestions in that category.
        </div>
      ) : (
        visibleCategories.map((cat) => (
          <section
            key={cat}
            className="space-y-2"
            data-category={cat}
            aria-label={CAT_LABEL[cat]}
          >
            <header className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                {CATEGORY_ICON[cat]} {CAT_LABEL[cat]}
              </h2>
              <span className="text-xs text-slate-500">
                {refactor.byCategory[cat].length} suggestion
                {refactor.byCategory[cat].length === 1 ? '' : 's'}
              </span>
            </header>
            <ul className="space-y-2" data-testid={`refactor-${cat}`}>
              {refactor.byCategory[cat].map((s) => (
                <SuggestionCard
                  key={s.id}
                  s={s}
                  onJump={() =>
                    navigate('/analyzer', {
                      state: { jump: { path: s.location.file, line: s.location.line } },
                    })
                  }
                  onCopy={() => copy(s.after, `${s.ruleId} fix`)}
                />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

function SuggestionCard({
  s,
  onJump,
  onCopy,
}: {
  s: RefactorSuggestion;
  onJump: () => void;
  onCopy: () => void;
}) {
  return (
    <li
      className={`card overflow-hidden border ${CATEGORY_TONE[s.category]}`}
      data-ruleid={s.ruleId}
      data-category={s.category}
      data-severity={s.severity}
      data-auto={s.autoApplicable || undefined}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white/60 px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase ${SEVERITY_TONE[s.severity]}`}
          >
            {s.severity}
          </span>
          <span className="font-mono text-[11px] text-slate-700">{s.ruleId}</span>
          {s.autoApplicable && (
            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-emerald-700">
              auto-applicable
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onJump}
          data-jump={`${s.location.file}:${s.location.line}`}
          className="font-mono text-[11px] text-brand-700 hover:underline"
        >
          {s.location.file}:{s.location.line} ↗
        </button>
      </header>
      <div className="p-3">
        <p className="mb-2 text-xs text-slate-700">{s.rationale}</p>
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          <DiffBlock tone="rose" label="Before" code={s.before} language={s.language} />
          <DiffBlock tone="emerald" label="After" code={s.after} language={s.language} />
        </div>
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={onCopy}
            data-testid={`copy-${s.id}`}
            className="text-[11px] font-medium text-brand-700 hover:underline"
          >
            📋 Copy fix
          </button>
        </div>
      </div>
    </li>
  );
}

function DiffBlock({
  tone,
  label,
  code,
  language,
}: {
  tone: 'rose' | 'emerald';
  label: string;
  code: string;
  language?: string;
}) {
  const toneClass =
    tone === 'rose'
      ? 'border-rose-200 bg-rose-50'
      : 'border-emerald-200 bg-emerald-50';
  const labelClass = tone === 'rose' ? 'text-rose-700' : 'text-emerald-700';
  return (
    <div className={`overflow-hidden rounded border ${toneClass}`}>
      <div
        className={`flex items-center justify-between border-b border-current/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${labelClass}`}
      >
        <span>{label}</span>
        {language && <span className="opacity-60">{language}</span>}
      </div>
      <pre className="overflow-auto p-2 font-mono text-xs leading-relaxed text-slate-800">
        {code}
      </pre>
    </div>
  );
}

function Chip({
  id,
  label,
  n,
  active,
  onClick,
}: {
  id: Filter;
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
          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
      ].join(' ')}
    >
      {label}
      <span className="rounded-full bg-white/70 px-1.5 text-[10px] font-semibold tabular-nums">
        {n}
      </span>
    </button>
  );
}
