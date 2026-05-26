import { useState } from 'react';
import { useSourceRepository } from '../../services/useSourceRepository';
import { useAuditReport } from '../../services/AuditCache';
import {
  exportReport,
  type ExportResult,
  type ReportFormat,
} from '../../services/ReportGenerator';

const FORMAT_META: Record<
  ReportFormat,
  { icon: string; title: string; subtitle: string; tone: string }
> = {
  pdf: {
    icon: '📄',
    title: 'PDF',
    subtitle: 'Print-ready, shareable',
    tone: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  html: {
    icon: '🌐',
    title: 'HTML',
    subtitle: 'Self-contained webpage',
    tone: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  json: {
    icon: '🧱',
    title: 'JSON',
    subtitle: 'Pipelines, tooling',
    tone: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  csv: {
    icon: '📊',
    title: 'CSV',
    subtitle: 'Open in any spreadsheet',
    tone: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
};

const ORDER: ReportFormat[] = ['pdf', 'html', 'json', 'csv'];

export function ReportExportPanel() {
  const { project } = useSourceRepository();
  const report = useAuditReport();

  const [status, setStatus] = useState<{
    kind: 'idle' | 'ok' | 'error';
    message?: string;
  }>({ kind: 'idle' });

  const ready = !!project && !!report;

  const onExport = (format: ReportFormat) => {
    if (!ready || !report || !project) return;
    try {
      const ctx = {
        projectName: project.name,
        origin: project.origin,
        fileCount: project.filesByPath.size,
        totalBytes: [...project.filesByPath.values()].reduce(
          (n, f) => n + f.size,
          0,
        ),
        audit: report,
        generatedAt: Date.now(),
      };
      const result: ExportResult = exportReport(format, ctx);
      if (result.kind === 'download') {
        setStatus({
          kind: 'ok',
          message: `Downloaded ${result.filename} (${formatBytes(result.bytes)})`,
        });
      } else {
        setStatus({
          kind: 'ok',
          message: 'Print dialog opened — choose “Save as PDF”.',
        });
      }
    } catch (e) {
      setStatus({
        kind: 'error',
        message: e instanceof Error ? e.message : 'Export failed',
      });
    }
  };

  return (
    <section
      aria-label="Report exports"
      className="card p-4"
      data-testid="report-export-panel"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Export report
          </h2>
          <p className="text-xs text-slate-500">
            {ready
              ? `Project · ${project!.name} · ${project!.filesByPath.size} files · ${report!.findings.length} findings`
              : 'Load a project on the Dashboard to enable exports.'}
          </p>
        </div>
        {status.kind !== 'idle' && (
          <span
            role={status.kind === 'error' ? 'alert' : 'status'}
            data-status={status.kind}
            className={[
              'rounded px-2 py-0.5 text-xs',
              status.kind === 'ok'
                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
            ].join(' ')}
          >
            {status.message}
          </span>
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ORDER.map((format) => {
          const meta = FORMAT_META[format];
          return (
            <button
              key={format}
              type="button"
              onClick={() => onExport(format)}
              disabled={!ready}
              data-export={format}
              className={[
                'flex flex-col items-start gap-1 rounded-lg border px-3 py-3 text-left transition disabled:opacity-50',
                meta.tone,
                'hover:brightness-95',
              ].join(' ')}
            >
              <span className="text-2xl" aria-hidden>
                {meta.icon}
              </span>
              <span className="text-sm font-semibold">{meta.title}</span>
              <span className="text-[11px] opacity-80">{meta.subtitle}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}
