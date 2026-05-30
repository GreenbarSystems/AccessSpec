import { useNavigate } from 'react-router-dom';
import type { Finding, Rule, Severity } from '../../services/RuleEngine';

type Props = {
  rule: Rule;
  findings: Finding[];
};

const SEVERITY_TONE: Record<Severity, string> = {
  critical: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  warning: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
  info: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
};

const CATEGORY_LABEL: Record<Rule['category'], string> = {
  accessibility: 'Accessibility',
  mobile: 'Mobile usability',
  parity: 'Platform parity',
};

export function IssueDetail({ rule, findings }: Props) {
  const navigate = useNavigate();
  return (
    <article className="space-y-4" data-testid="issue-detail" data-rule={rule.id}>
      {/*
        Header — severity + ID + category + title + spec citation + count.
        We deliberately fold the spec citation in here (and drop the
        separate "WCAG reference" card) so a single short string doesn't
        get its own card. The "Issue details" card was removed for the
        same reason: it duplicated the title verbatim.
      */}
      <header className="card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${SEVERITY_TONE[rule.severity]}`}
            data-severity={rule.severity}
          >
            {rule.severity}
          </span>
          <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium uppercase text-slate-700 dark:text-slate-300 dark:bg-slate-800">
            {CATEGORY_LABEL[rule.category]}
          </span>
          <span className="font-mono text-[11px] text-slate-500">{rule.id}</span>
          {rule.spec && (
            <span
              className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              data-testid="rule-spec"
              title="WCAG reference"
            >
              {rule.spec}
            </span>
          )}
        </div>
        <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
          {rule.description}
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {findings.length === 0
            ? 'No components in the loaded project fail this rule.'
            : `${findings.length} affected component${findings.length === 1 ? '' : 's'} in the loaded project.`}
        </p>
      </header>

      <Section title="Suggested fix" testId="section-fix">
        <p className="text-sm text-slate-700 dark:text-slate-300">{rule.suggestedFix.summary}</p>
        {rule.suggestedFix.example && (
          <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">
            {rule.suggestedFix.example.bad && (
              <CodeBlock
                tone="rose"
                label="Don't"
                language={rule.suggestedFix.example.language}
                code={rule.suggestedFix.example.bad}
              />
            )}
            <CodeBlock
              tone="emerald"
              label="Do"
              language={rule.suggestedFix.example.language}
              code={rule.suggestedFix.example.good}
            />
          </div>
        )}
        {rule.suggestedFix.notes && rule.suggestedFix.notes.length > 0 && (
          <ul className="mt-3 list-inside list-disc text-xs text-slate-600 dark:text-slate-400">
            {rule.suggestedFix.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title={`Affected elements (${findings.length})`}
        testId="section-elements"
      >
        {findings.length === 0 ? (
          <p className="text-sm text-emerald-700">
            ✓ No elements currently fail this rule.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100" data-testid="affected-list">
            {findings.map((f) => (
              <li key={f.element.id}>
                <button
                  type="button"
                  onClick={() =>
                    navigate('/analyzer', {
                      state: {
                        jump: { path: f.element.file, line: f.element.line },
                      },
                    })
                  }
                  data-jump={`${f.element.file}:${f.element.line}`}
                  className="flex w-full items-start gap-3 px-1 py-2 text-left hover:bg-slate-50 dark:bg-slate-900"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-slate-700 dark:text-slate-300 dark:bg-slate-800">
                        {f.element.type}
                      </span>
                      <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                        &lt;{f.element.tagName}&gt;
                      </span>
                      {f.element.text && (
                        <span className="truncate text-sm text-slate-800 dark:text-slate-200">
                          {f.element.text}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 truncate font-mono text-[11px] text-slate-500">
                      {f.element.file}:{f.element.line} · {f.message}
                    </div>
                  </div>
                  <span
                    aria-hidden
                    className="shrink-0 self-center text-xs text-slate-400 dark:text-slate-500"
                  >
                    ↗
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </article>
  );
}

function Section({
  title,
  testId,
  children,
}: {
  title: string;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-4" data-testid={testId}>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h3>
      {children}
    </section>
  );
}

function CodeBlock({
  tone,
  label,
  language,
  code,
}: {
  tone: 'rose' | 'emerald';
  label: string;
  language?: string;
  code: string;
}) {
  const toneClass =
    tone === 'rose'
      ? 'border-rose-200 bg-rose-50'
      : 'border-emerald-200 bg-emerald-50';
  const labelClass =
    tone === 'rose' ? 'text-rose-700' : 'text-emerald-700';
  return (
    <div className={`overflow-hidden rounded border ${toneClass}`}>
      <div
        className={`flex items-center justify-between border-b border-current/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide ${labelClass}`}
      >
        <span>{label}</span>
        {language && <span className="opacity-60">{language}</span>}
      </div>
      {/*
        Two-column DO/DON'T grids leave each `<pre>` quite narrow, so HTML
        and JSX snippets used to clip — readers had to horizontally scroll
        a pane that gave no visual cue it was scrollable. Wrap instead:
        `whitespace-pre-wrap` keeps newlines/leading indent, `break-words`
        lets long attribute values break at safe points rather than
        overflow.
      */}
      <pre className="whitespace-pre-wrap break-words p-3 font-mono text-xs leading-relaxed text-slate-800 dark:text-slate-200">
        {code}
      </pre>
    </div>
  );
}
