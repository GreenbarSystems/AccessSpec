import type { SourceFile } from '../../services/FileParser';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function countLines(content: string): number {
  if (content.length === 0) return 0;
  let n = 1;
  for (let i = 0; i < content.length; i++) {
    if (content.charCodeAt(i) === 10) n++;
  }
  return n;
}

type Props = {
  file: SourceFile | null;
  matchCount?: number;
};

export function FileMetadata({ file, matchCount }: Props) {
  if (!file) {
    return (
      <div className="card p-4 text-sm text-slate-500">
        Select a file from the tree to inspect its metadata.
      </div>
    );
  }

  const lines = countLines(file.content);
  const stats: { label: string; value: string }[] = [
    { label: 'Language', value: file.language },
    { label: 'Extension', value: `.${file.ext}` },
    { label: 'Size', value: formatBytes(file.size) },
    { label: 'Lines', value: String(lines) },
    { label: 'Origin', value: file.origin },
  ];
  if (typeof matchCount === 'number') {
    stats.push({ label: 'Matches', value: String(matchCount) });
  }

  return (
    <div className="card p-4" data-testid="file-metadata">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <div
            className="truncate font-mono text-sm font-semibold text-slate-900 dark:text-slate-100"
            title={file.path}
          >
            {file.path}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">{file.name}</div>
        </div>
        <span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-brand-700">
          {file.ext}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3 md:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label}>
            <dt className="font-medium uppercase tracking-wide text-slate-500">
              {s.label}
            </dt>
            <dd className="mt-0.5 text-slate-800 dark:text-slate-200">{s.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
