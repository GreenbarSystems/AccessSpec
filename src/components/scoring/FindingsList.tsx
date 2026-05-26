import { useNavigate } from 'react-router-dom';
import type { Finding, Severity } from '../../services/RuleEngine';

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

const SEVERITY_TONE: Record<Severity, string> = {
  critical: 'bg-rose-50 text-rose-700 border-rose-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  info: 'bg-sky-50 text-sky-700 border-sky-200',
};

type Props = {
  findings: Finding[];
  limit?: number;
};

export function FindingsList({ findings, limit = 10 }: Props) {
  const navigate = useNavigate();
  const sorted = [...findings].sort((a, b) => {
    const r = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (r !== 0) return r;
    return a.element.file.localeCompare(b.element.file);
  });
  const visible = sorted.slice(0, limit);

  if (visible.length === 0) {
    return (
      <div className="card p-4 text-sm text-emerald-700">
        ✓ No findings — every detected component passed the active rules.
      </div>
    );
  }

  return (
    <div className="card overflow-hidden" data-testid="findings-list">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Top findings ({visible.length} of {findings.length})
      </div>
      <ul className="divide-y divide-slate-100">
        {visible.map((f) => (
          <li key={`${f.ruleId}:${f.element.id}`}>
            <button
              type="button"
              onClick={() =>
                // Jump to the Analyzer with the file/line stashed in location state.
                navigate('/analyzer', {
                  state: { jump: { path: f.element.file, line: f.element.line } },
                })
              }
              data-finding={f.ruleId}
              data-severity={f.severity}
              className="flex w-full items-start gap-3 px-4 py-2 text-left hover:bg-slate-50"
            >
              <span
                className={`mt-0.5 rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${SEVERITY_TONE[f.severity]}`}
              >
                {f.severity}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-sm font-medium text-slate-900">
                    {f.message}
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">
                    {f.ruleId}
                  </span>
                </div>
                <div className="mt-0.5 truncate font-mono text-xs text-slate-500">
                  {f.element.file}:{f.element.line} · {f.element.type} &lt;{f.element.tagName}&gt;
                </div>
              </div>
              <span aria-hidden className="shrink-0 self-center text-xs text-slate-400">
                ↗
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
