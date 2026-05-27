import { useEffect, useMemo, useState } from 'react';
import { useAuditReport } from '../../services/AuditCache';
import { ALL_RULE_DEFS } from '../../services/AuditService';
import type { Finding, Rule, Severity } from '../../services/RuleEngine';
import { IssueDetail } from './IssueDetail';

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

const SEVERITY_DOT: Record<Severity, string> = {
  critical: 'bg-rose-500',
  warning: 'bg-amber-500',
  info: 'bg-sky-500',
};

type Filter = 'all' | 'critical' | 'warning' | 'info' | 'with-findings';

type RuleSummary = {
  rule: Rule;
  count: number;
};

export function ViolationInspector() {
  const report = useAuditReport();

  const ruleSummaries: RuleSummary[] = useMemo(() => {
    const countByRule = new Map<string, number>();
    if (report) {
      for (const f of report.findings) {
        countByRule.set(f.ruleId, (countByRule.get(f.ruleId) ?? 0) + 1);
      }
    }
    return ALL_RULE_DEFS.map((rule) => ({
      rule,
      count: countByRule.get(rule.id) ?? 0,
    })).sort((a, b) => {
      // Findings first, then by severity, then by id.
      if ((b.count > 0 ? 1 : 0) !== (a.count > 0 ? 1 : 0)) {
        return b.count - a.count > 0 ? 1 : -1;
      }
      const sev = SEVERITY_RANK[a.rule.severity] - SEVERITY_RANK[b.rule.severity];
      if (sev !== 0) return sev;
      return a.rule.id.localeCompare(b.rule.id);
    });
  }, [report]);

  const [filter, setFilter] = useState<Filter>('with-findings');
  const visible = ruleSummaries.filter((s) => {
    switch (filter) {
      case 'all':
        return true;
      case 'critical':
        return s.rule.severity === 'critical';
      case 'warning':
        return s.rule.severity === 'warning';
      case 'info':
        return s.rule.severity === 'info';
      case 'with-findings':
        return s.count > 0;
    }
  });

  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);

  // Auto-select the first visible rule when the list changes (e.g. after
  // upload or filter change) so the detail pane is never empty when there's
  // something to show.
  useEffect(() => {
    if (visible.length === 0) {
      setSelectedRuleId(null);
      return;
    }
    if (!selectedRuleId || !visible.find((s) => s.rule.id === selectedRuleId)) {
      setSelectedRuleId(visible[0].rule.id);
    }
  }, [visible, selectedRuleId]);

  const selected = ruleSummaries.find((s) => s.rule.id === selectedRuleId) ?? null;
  const findingsForSelected: Finding[] = useMemo(() => {
    if (!report || !selected) return [];
    return report.findings.filter((f) => f.ruleId === selected.rule.id);
  }, [report, selected]);

  if (!report) {
    return (
      <div className="card p-6 text-sm text-slate-600 dark:text-slate-400">
        Upload a project on the Dashboard to inspect violations.
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 gap-4 lg:grid-cols-[20rem_1fr]"
      data-testid="violation-inspector"
    >
      <aside className="space-y-3">
        <div className="card p-3">
          <div className="flex flex-wrap gap-1.5">
            <FilterChip
              id="with-findings"
              label="With findings"
              n={ruleSummaries.filter((s) => s.count > 0).length}
              active={filter === 'with-findings'}
              onClick={() => setFilter('with-findings')}
            />
            <FilterChip
              id="all"
              label="All rules"
              n={ruleSummaries.length}
              active={filter === 'all'}
              onClick={() => setFilter('all')}
            />
            <FilterChip
              id="critical"
              label="Critical"
              tone="bg-rose-50 text-rose-700"
              n={ruleSummaries.filter((s) => s.rule.severity === 'critical').length}
              active={filter === 'critical'}
              onClick={() => setFilter('critical')}
            />
            <FilterChip
              id="warning"
              label="Warning"
              tone="bg-amber-50 text-amber-800"
              n={ruleSummaries.filter((s) => s.rule.severity === 'warning').length}
              active={filter === 'warning'}
              onClick={() => setFilter('warning')}
            />
            <FilterChip
              id="info"
              label="Info"
              tone="bg-sky-50 text-sky-700"
              n={ruleSummaries.filter((s) => s.rule.severity === 'info').length}
              active={filter === 'info'}
              onClick={() => setFilter('info')}
            />
          </div>
        </div>
        <div className="card overflow-hidden">
          {visible.length === 0 ? (
            <p className="p-4 text-sm text-emerald-700">
              ✓ Nothing to inspect under the current filter.
            </p>
          ) : (
            <ul role="listbox" aria-label="Rules" data-testid="rule-list">
              {visible.map((s) => {
                const isActive = s.rule.id === selectedRuleId;
                return (
                  <li key={s.rule.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onClick={() => setSelectedRuleId(s.rule.id)}
                      data-rule={s.rule.id}
                      data-active={isActive || undefined}
                      className={[
                        'flex w-full items-start gap-2 border-l-2 px-3 py-2 text-left text-sm transition',
                        isActive
                          ? 'border-brand-500 bg-brand-50'
                          : 'border-transparent hover:bg-slate-50 dark:bg-slate-900',
                      ].join(' ')}
                    >
                      <span
                        aria-hidden
                        className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${SEVERITY_DOT[s.rule.severity]}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-slate-900 dark:text-slate-100">
                          {s.rule.description}
                        </div>
                        <div className="truncate font-mono text-[11px] text-slate-500">
                          {s.rule.id}
                        </div>
                      </div>
                      <span
                        className={[
                          'shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums',
                          s.count > 0
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-emerald-100 text-emerald-700',
                        ].join(' ')}
                        data-count
                      >
                        {s.count}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      <div>
        {selected ? (
          <IssueDetail rule={selected.rule} findings={findingsForSelected} />
        ) : (
          <div className="card p-6 text-sm text-slate-500">
            Pick a rule from the list to inspect details, WCAG reference,
            suggested fix, and affected elements.
          </div>
        )}
      </div>
    </div>
  );
}

function FilterChip({
  id,
  label,
  n,
  tone,
  active,
  onClick,
}: {
  id: Filter;
  label: string;
  n: number;
  tone?: string;
  active: boolean;
  onClick: () => void;
}) {
  const base = tone ?? 'bg-slate-100 text-slate-700 dark:text-slate-300 dark:bg-slate-800';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-chip={id}
      className={[
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition',
        active
          ? 'border-brand-500 ring-2 ring-brand-500 ring-offset-1'
          : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:border-slate-700',
        base,
      ].join(' ')}
    >
      {label}
      <span className="rounded-full bg-white/70 px-1.5 text-[10px] font-semibold">
        {n}
      </span>
    </button>
  );
}
