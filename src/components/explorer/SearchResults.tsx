import { useMemo } from 'react';
import type { SearchMatch } from '../../services/SearchEngine';

type Props = {
  matches: SearchMatch[];
  selectedPath?: string;
  onJump: (path: string, line: number) => void;
};

type GroupedFile = {
  path: string;
  name: string;
  matches: SearchMatch[];
};

function group(matches: SearchMatch[]): GroupedFile[] {
  const map = new Map<string, GroupedFile>();
  for (const m of matches) {
    let g = map.get(m.file.path);
    if (!g) {
      g = { path: m.file.path, name: m.file.name, matches: [] };
      map.set(m.file.path, g);
    }
    g.matches.push(m);
  }
  return [...map.values()].sort((a, b) => a.path.localeCompare(b.path));
}

/** Trim a long line and shift the highlight range so it stays visible. */
function clipPreview(
  text: string,
  column: number,
  length: number,
): { text: string; start: number; end: number } {
  const PAD = 30;
  const MAX = 100;
  if (text.length <= MAX) {
    return { text, start: column, end: column + length };
  }
  const startCut = Math.max(0, column - PAD);
  const endCut = Math.min(text.length, column + length + PAD);
  const prefix = startCut > 0 ? '…' : '';
  const suffix = endCut < text.length ? '…' : '';
  const sliced = text.slice(startCut, endCut);
  return {
    text: `${prefix}${sliced}${suffix}`,
    start: prefix.length + (column - startCut),
    end: prefix.length + (column - startCut) + length,
  };
}

export function SearchResults({ matches, selectedPath, onJump }: Props) {
  const groups = useMemo(() => group(matches), [matches]);

  if (groups.length === 0) return null;

  return (
    <div
      className="card max-h-[40vh] overflow-auto p-2 text-sm"
      data-testid="search-results"
    >
      {groups.map((g) => (
        <div key={g.path} className="mb-2 last:mb-0">
          <div
            className={[
              'sticky top-0 z-10 truncate rounded bg-slate-100 px-2 py-1 font-mono text-xs',
              g.path === selectedPath ? 'text-brand-700' : 'text-slate-700',
            ].join(' ')}
            title={g.path}
          >
            {g.path}
            <span className="ml-1 text-slate-500">({g.matches.length})</span>
          </div>
          <ul>
            {g.matches.map((m, i) => {
              const clip = clipPreview(m.lineText, m.column, m.length);
              return (
                <li key={`${m.line}-${i}`}>
                  <button
                    type="button"
                    onClick={() => onJump(m.file.path, m.line)}
                    data-jump={`${m.file.path}:${m.line}`}
                    className="flex w-full items-baseline gap-2 rounded px-2 py-0.5 text-left hover:bg-slate-100"
                  >
                    <span className="w-10 shrink-0 text-right font-mono text-xs text-slate-400">
                      {m.line}
                    </span>
                    <span className="flex-1 truncate font-mono text-xs text-slate-700">
                      {clip.text.slice(0, clip.start)}
                      <mark className="rounded-sm bg-amber-200/70 text-slate-900">
                        {clip.text.slice(clip.start, clip.end)}
                      </mark>
                      {clip.text.slice(clip.end)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
