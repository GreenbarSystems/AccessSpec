import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Sparkles, Smartphone, Wrench, type LucideIcon } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Glossary } from '../components/Glossary';
import { sourceRepository } from '../services/SourceRepository';
import { useToast } from '../components/toast/ToastHost';
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
  if (!project) return <EmptyState />;
  return <PopulatedState project={project} onClear={() => repo.clear()} />;
}

/* ------------------------------------------------------------------ */
/* Empty state: the only thing that matters is the upload action       */
/* ------------------------------------------------------------------ */

function EmptyState() {
  const toast = useToast();
  // Load a pre-bundled sample so a brand-new user can see a populated
  // dashboard in one click — no need to bring their own code first.
  const loadSample = async () => {
    try {
      const url = `${import.meta.env.BASE_URL}samples/demo.html`.replace(/\/{2,}/g, '/');
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const content = await res.text();
      sourceRepository.loadFiles(
        [
          {
            path: 'demo.html',
            name: 'demo.html',
            ext: 'html',
            language: 'html',
            size: content.length,
            content,
            origin: 'paste',
          },
        ],
        'AccessSpec sample',
        'paste',
      );
      toast.success('Loaded the sample project — see scores below');
    } catch (err) {
      toast.error(
        `Could not load the sample (${err instanceof Error ? err.message : 'unknown'})`,
      );
    }
  };

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={
          <>
            Audit a mobile app for{' '}
            <Glossary term="WCAG22">WCAG 2.2</Glossary> compliance — paste a
            snippet, drop files, upload a zip, or import a public repo.
          </>
        }
      />
      <div className="mx-auto max-w-3xl space-y-6">
        {/* New-user shortcut: skip upload and load the bundled sample so the
            dashboard populates immediately. The sample is intentionally
            seeded with a mix of good + bad patterns so every rule has
            something to report. */}
        <section
          aria-label="Quick start"
          className="card flex flex-wrap items-center justify-between gap-3 border-brand-200 bg-brand-50/50 p-4 dark:border-brand-800 dark:bg-brand-900/20"
          data-testid="quickstart-banner"
        >
          <div className="flex items-start gap-3">
            <Sparkles
              aria-hidden
              className="mt-0.5 h-5 w-5 shrink-0 text-brand-700 dark:text-brand-300"
            />
            <div>
              <h2 className="text-sm font-semibold text-brand-900 dark:text-brand-100">
                New here? Try a sample project
              </h2>
              <p className="text-xs text-brand-800 dark:text-brand-200">
                Loads a small HTML page that intentionally fails several
                rules — so you can see what a populated dashboard looks
                like without uploading your own code yet.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadSample}
            className="btn-primary text-sm"
            data-testid="load-sample"
          >
            Load sample
          </button>
        </section>

        <section
          aria-label="Upload source"
          className="card p-5"
          data-upload-panel
        >
          <div className="mb-3">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Or audit your own code
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Everything runs locally in your browser. No code leaves the page.
            </p>
          </div>
          <UploadPanel />
        </section>

        <section aria-label="What you'll get">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            What you'll get after uploading
          </h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <PreviewCard
              Icon={BarChart3}
              title="Compliance scores"
              body="Accessibility, mobile usability, and platform-parity scores with severity counts."
              to="/analyzer"
            />
            <PreviewCard
              Icon={Smartphone}
              title="Device + screenshot simulator"
              body="Render the app inside iPhone / Pixel / Galaxy / iPad frames; check contrast on screenshots."
              to="/simulator"
            />
            <PreviewCard
              Icon={Wrench}
              title="Remediation playbook"
              body="Per-issue WCAG reference, code fix snippets, and a markdown export for tickets."
              to="/reports"
            />
          </ul>
        </section>
      </div>
    </>
  );
}

function PreviewCard({
  Icon,
  title,
  body,
  to,
}: {
  Icon: LucideIcon;
  title: string;
  body: string;
  to: string;
}) {
  return (
    <li>
      <Link
        to={to}
        className="card flex h-full flex-col gap-2 p-4 transition hover:border-brand-300 hover:shadow-md"
      >
        <Icon aria-hidden className="h-6 w-6 text-brand-700" />
        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</span>
        <span className="text-xs text-slate-600 dark:text-slate-400">{body}</span>
        <span className="mt-auto text-xs font-medium text-brand-700">
          Preview →
        </span>
      </Link>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Populated state: metrics-first, upload moved to a collapsible drawer */
/* ------------------------------------------------------------------ */

function PopulatedState({
  project,
  onClear,
}: {
  project: Project;
  onClear: () => void;
}) {
  const stats = summarize(project);
  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={
          <>
            Review the mobile accessibility posture against{' '}
            <Glossary term="WCAG22">WCAG 2.2</Glossary>.
          </>
        }
        actions={
          <>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setUploadOpen((v) => !v)}
              aria-expanded={uploadOpen}
              aria-controls="dashboard-upload-drawer"
              data-action="toggle-upload"
            >
              {uploadOpen ? '▴ Hide upload' : '＋ Add or replace files'}
            </button>
            <button
              type="button"
              className="btn-ghost text-rose-700 hover:bg-rose-50"
              onClick={() => {
                if (window.confirm('Clear the current project? This wipes the in-memory audit.')) {
                  onClear();
                }
              }}
              data-action="clear-project"
            >
              Clear project
            </button>
          </>
        }
      />

      <section
        aria-label="Project summary"
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        <SummaryCard
          label="Project"
          value={project.name}
          hint={`origin: ${project.origin}`}
          mono
        />
        <SummaryCard
          label="Files"
          value={String(stats.fileCount)}
          hint={`${formatBytes(stats.totalBytes)} total`}
        />
        <SummaryCard
          label="Languages"
          value={String(Object.keys(stats.byLang).length)}
          hint={Object.entries(stats.byLang)
            .map(([k, v]) => `${k}·${v}`)
            .join(' ')}
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

      {/* Collapsible upload drawer + project tree, secondary content */}
      <div
        id="dashboard-upload-drawer"
        hidden={!uploadOpen}
        className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-5"
        data-upload-panel
      >
        <div className="lg:col-span-3">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Add or replace source
          </h2>
          <UploadPanel />
        </div>
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Project tree
          </h2>
          <div className="card p-3" data-testid="project-tree">
            <ProjectTree files={stats.files} />
          </div>
        </div>
      </div>
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
          'mt-1 truncate text-xl font-semibold text-slate-900 dark:text-slate-100',
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
