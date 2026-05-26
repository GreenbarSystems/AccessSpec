import { PageHeader } from '../components/PageHeader';
import { UploadPanel } from '../components/upload/UploadPanel';
import { ProjectTree } from '../components/ProjectTree';
import { ScoringDashboard } from '../components/scoring/ScoringDashboard';
import { ExecutiveKpis } from '../components/executive/ExecutiveKpis';
import { useSourceRepository } from '../services/useSourceRepository';
import type { Project } from '../services/SourceRepository';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function summarize(project: Project) {
  const files = [...project.filesByPath.values()];
  const totalBytes = files.reduce((n, f) => n + f.size, 0);
  const byLang: Record<string, number> = {};
  for (const f of files) byLang[f.language] = (byLang[f.language] ?? 0) + 1;
  return { fileCount: files.length, totalBytes, byLang, files };
}

export default function Dashboard() {
  const { project, repo } = useSourceRepository();
  const stats = project ? summarize(project) : null;
  const files = stats?.files ?? [];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Upload an app, then review its mobile accessibility posture against WCAG 2.2."
        actions={
          project && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => repo.clear()}
              data-action="clear-project"
            >
              Clear project
            </button>
          )
        }
      />

      <section
        aria-label="Project summary"
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        <SummaryCard
          label="Project"
          value={project?.name ?? '—'}
          hint={project ? `origin: ${project.origin}` : 'Upload to begin'}
          mono
        />
        <SummaryCard
          label="Files"
          value={stats ? String(stats.fileCount) : '—'}
          hint={stats ? formatBytes(stats.totalBytes) + ' total' : 'in memory'}
        />
        <SummaryCard
          label="Languages"
          value={stats ? String(Object.keys(stats.byLang).length) : '—'}
          hint={
            stats
              ? Object.entries(stats.byLang)
                  .map(([k, v]) => `${k}·${v}`)
                  .join(' ')
              : 'detected'
          }
        />
      </section>

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Executive summary
        </h2>
        <ExecutiveKpis />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Compliance scores
        </h2>
        <ScoringDashboard />
      </div>

      <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Upload source
          </h2>
          <UploadPanel />
        </div>
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Project tree
          </h2>
          <div className="card p-3" data-testid="project-tree">
            <ProjectTree files={files} />
          </div>
        </div>
      </section>
    </>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  mono,
}: {
  label: string;
  value: string;
  hint: string;
  mono?: boolean;
}) {
  return (
    <div className="card p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div
        className={[
          'mt-1 truncate text-xl font-semibold text-slate-900',
          mono && 'font-mono text-base',
        ]
          .filter(Boolean)
          .join(' ')}
        title={value}
      >
        {value}
      </div>
      <div className="mt-1 text-xs text-slate-500">{hint}</div>
    </div>
  );
}
