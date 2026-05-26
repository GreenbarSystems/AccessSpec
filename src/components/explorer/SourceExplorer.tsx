import { useEffect, useMemo, useState } from 'react';
import { useSourceRepository } from '../../services/useSourceRepository';
import { search, type SearchSummary } from '../../services/SearchEngine';
import { ProjectTree } from '../ProjectTree';
import { CodeViewer } from './CodeViewer';
import { FileMetadata } from './FileMetadata';
import { SearchBar } from './SearchBar';
import { SearchResults } from './SearchResults';
import type { SourceFile } from '../../services/FileParser';

type ExternalJump = { path: string; line: number; tick: number } | null;

export function SourceExplorer({ externalJump }: { externalJump?: ExternalJump } = {}) {
  const { project } = useSourceRepository();
  const files = useMemo(() => {
    if (!project) return [] as SourceFile[];
    return [...project.filesByPath.values()].sort((a, b) =>
      a.path.localeCompare(b.path),
    );
  }, [project]);

  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [scrollLine, setScrollLine] = useState<number | undefined>(undefined);
  const [query, setQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [regex, setRegex] = useState(false);

  // If the project changes and our selection no longer exists, clear it.
  // Otherwise default to the first file once one is available.
  const selected = selectedPath
    ? files.find((f) => f.path === selectedPath) ?? null
    : files[0] ?? null;

  const summary: SearchSummary = useMemo(
    () => search(files, query, { caseSensitive, regex }),
    [files, query, caseSensitive, regex],
  );

  const matchCountForSelected = selected
    ? summary.matches.filter((m) => m.file.path === selected.path).length
    : 0;

  const handleSelect = (file: SourceFile) => {
    setSelectedPath(file.path);
    setScrollLine(undefined);
  };

  const handleJump = (path: string, line: number) => {
    setSelectedPath(path);
    // Reset first to guarantee the effect re-fires even when the line repeats.
    setScrollLine(undefined);
    requestAnimationFrame(() => setScrollLine(line));
  };

  // Honor jumps coming from outside the explorer (e.g. the inventory panel
  // switching tabs back to Source). `tick` makes the effect re-fire when
  // the same path/line is requested twice in a row.
  useEffect(() => {
    if (!externalJump) return;
    handleJump(externalJump.path, externalJump.line);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalJump?.tick]);

  if (!project) {
    return (
      <div className="card p-6 text-sm text-slate-600">
        No project loaded yet. Upload sources on the{' '}
        <a className="font-medium text-brand-700 underline" href="/">
          Dashboard
        </a>{' '}
        to start exploring.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SearchBar
        query={query}
        onQuery={setQuery}
        caseSensitive={caseSensitive}
        onCaseSensitive={setCaseSensitive}
        regex={regex}
        onRegex={setRegex}
        summary={summary}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <aside className="lg:col-span-4 space-y-4">
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Project tree
            </h2>
            <div className="card p-2" data-testid="explorer-tree">
              <ProjectTree files={files} onSelect={handleSelect} />
            </div>
          </div>

          {query && (
            <div>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Search results
              </h2>
              <SearchResults
                matches={summary.matches}
                selectedPath={selected?.path}
                onJump={handleJump}
              />
            </div>
          )}
        </aside>

        <section className="lg:col-span-8 space-y-3">
          <FileMetadata
            file={selected}
            matchCount={query ? matchCountForSelected : undefined}
          />
          <CodeViewer
            file={selected}
            query={query}
            caseSensitive={caseSensitive}
            regex={regex}
            scrollToLine={scrollLine}
          />
        </section>
      </div>
    </div>
  );
}
