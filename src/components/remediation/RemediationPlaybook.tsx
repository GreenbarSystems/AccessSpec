import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clipboard } from 'lucide-react';
import { useSourceRepository } from '../../services/useSourceRepository';
import { useAuditReport } from '../../services/AuditCache';
import {
  generateRemediation,
  remediationToMarkdown,
  type RemediationItem,
} from '../../services/RemediationGenerator';
import type { Severity } from '../../services/RuleEngine';

const SEVERITY_TONE: Record<Severity, string> = {
  critical: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  warning: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
  info: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
};

type SevFilter = 'all' | Severity;

export function RemediationPlaybook() {
  const navigate = useNavigate();
  const { project } = useSourceRepository();
  const report = useAuditReport();
  const items = useMemo(
    () => (report ? generateRemediation(report.findings) : []),
    [report],
  );

  const [filter, setFilter] = useState<SevFilter>('all');
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c = { critical: 0, warning: 0, info: 0 };
    for (const it of items) c[it.severity]++;
    return c;
  }, [items]);

  const visible = useMemo(
    () => (filter === 'all' ? items : items.filter((i) => i.severity === filter)),
    [items, filter],
  );

  const handleCopyAll = async () => {
    if (!project) return;
    const md = remediationToMarkdown(visible, {
      project: project.name,
      generatedAt: Date.now(),
    });
    try {
      await navigator.clipboard.writeText(md);
      setCopyMsg(`Copied ${visible.length} item(s) as markdown.`);
    } catch {
      setCopyMsg('Clipboard blocked — fall back to JSON export.');
    }
    setTimeout(() => setCopyMsg(null), 3000);
  };

  if (!project) {
    return (
      <div className="card p-6 text-sm text-slate-600 dark:text-slate-400">
        Upload a project to generate a remediation playbook.
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="card p-6 text-sm text-emerald-700">
        ✓ Nothing to remediate — every detected component passes the active
        rules.
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="remediation-playbook">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip id="all" label="All" n={items.length} active={filter === 'all'} onClick={() => setFilter('all')} />
          <Chip
            id="critical"
            label="Critical"
            tone="bg-rose-50 text-rose-700 border-rose-200"
            n={counts.critical}
            active={filter === 'critical'}
            onClick={() => setFilter('critical')}
          />
          <Chip
            id="warning"
            label="Warning"
            tone="bg-amber-50 text-amber-800 border-amber-200"
            n={counts.warning}
            active={filter === 'warning'}
            onClick={() => setFilter('warning')}
          />
          <Chip
            id="info"
            label="Info"
            tone="bg-sky-50 text-sky-700 border-sky-200"
            n={counts.info}
            active={filter === 'info'}
            onClick={() => setFilter('info')}
          />
        </div>
        <div className="flex items-center gap-2">
          {copyMsg && (
            <span
              role="status"
              data-testid="copy-status"
              className="text-xs text-emerald-700"
            >
              {copyMsg}
            </span>
          )}
          <button
            type="button"
            className="btn-primary inline-flex items-center gap-1 text-xs"
            onClick={handleCopyAll}
            data-testid="copy-markdown"
          >
            <Clipboard aria-hidden className="h-3.5 w-3.5" /> Copy as markdown
          </button>
        </div>
      </div>

      <ul className="space-y-3" data-testid="remediation-items">
        {visible.map((item, i) => (
          <RemediationCard
            key={`${item.ruleId}-${item.affected.file}-${item.affected.line}-${i}`}
            index={i}
            item={item}
            onJump={() =>
              navigate('/analyzer', {
                state: {
                  jump: { path: item.affected.file, line: item.affected.line },
                },
              })
            }
          />
        ))}
      </ul>
    </div>
  );
}

function RemediationCard({
  item,
  index,
  onJump,
}: {
  item: RemediationItem;
  index: number;
  onJump: () => void;
}) {
  return (
    <li
      className="card overflow-hidden"
      data-ruleid={item.ruleId}
      data-severity={item.severity}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2 dark:bg-slate-900 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] text-slate-500">
            #{index + 1}
          </span>
          <span
            className={`rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase ${SEVERITY_TONE[item.severity]}`}
            data-field="severity"
          >
            {item.severity}
          </span>
          <span className="font-mono text-[11px] text-slate-500">{item.ruleId}</span>
        </div>
        <button
          type="button"
          onClick={onJump}
          data-jump={`${item.affected.file}:${item.affected.line}`}
          className="font-mono text-[11px] text-brand-700 hover:underline"
        >
          {item.affected.file}:{item.affected.line} ↗
        </button>
      </header>

      <div className="p-4">
        <Section label="Problem" testId="field-problem">
          <p className="text-sm text-slate-800 dark:text-slate-200">{item.problem}</p>
          <p className="mt-1 text-xs text-slate-500">{item.affected.message}</p>
        </Section>

        <Section label="WCAG reference" testId="field-wcag">
          <p className="font-mono text-xs text-slate-700 dark:text-slate-300">
            {item.wcagReference}
          </p>
        </Section>

        <Section label="Affected element" testId="field-affected">
          <p className="text-xs text-slate-700 dark:text-slate-300">
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium uppercase dark:bg-slate-800">
              {item.affected.type}
            </span>{' '}
            <span className="font-mono">&lt;{item.affected.tagName}&gt;</span>
            {item.affected.text && (
              <span className="italic"> · "{item.affected.text}"</span>
            )}
          </p>
        </Section>

        <Section label="Fix recommendation" testId="field-fix">
          <p className="text-sm text-slate-800 dark:text-slate-200">
            {item.fixRecommendation.summary}
          </p>
          {item.fixRecommendation.notes && item.fixRecommendation.notes.length > 0 && (
            <ul className="mt-1 list-inside list-disc text-xs text-slate-600 dark:text-slate-400">
              {item.fixRecommendation.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          )}
        </Section>

        {item.codeExample && (
          <Section label="Code example" testId="field-code">
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
              {item.codeExample.bad && (
                <CodeBlock tone="rose" label="Don't" code={item.codeExample.bad} language={item.codeExample.language} />
              )}
              <CodeBlock tone="emerald" label="Do" code={item.codeExample.good} language={item.codeExample.language} />
            </div>
          </Section>
        )}
      </div>
    </li>
  );
}

function Section({
  label,
  testId,
  children,
}: {
  label: string;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-3 last:mb-0" data-testid={testId}>
      <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </h3>
      {children}
    </section>
  );
}

function CodeBlock({
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
      <div className={`flex items-center justify-between border-b border-current/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${labelClass}`}>
        <span>{label}</span>
        {language && <span className="opacity-60">{language}</span>}
      </div>
      <pre className="overflow-auto p-2 font-mono text-xs leading-relaxed text-slate-800 dark:text-slate-200">
        {code}
      </pre>
    </div>
  );
}

function Chip({
  id,
  label,
  n,
  tone,
  active,
  onClick,
}: {
  id: SevFilter;
  label: string;
  n: number;
  tone?: string;
  active: boolean;
  onClick: () => void;
}) {
  const base = tone ?? 'bg-slate-100 text-slate-700 dark:text-slate-300 border-slate-200 dark:bg-slate-800 dark:border-slate-800';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-chip={id}
      className={[
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition',
        active ? 'ring-2 ring-brand-500 ring-offset-1' : 'opacity-90 hover:opacity-100',
        base,
      ].join(' ')}
    >
      {label}
      <span className="rounded-full bg-white/70 px-1.5 text-[10px] font-semibold tabular-nums">
        {n}
      </span>
    </button>
  );
}
