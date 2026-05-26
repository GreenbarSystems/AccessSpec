import { useEffect, useMemo, useRef } from 'react';
import type { SourceFile } from '../../services/FileParser';
import { lineMatches } from '../../services/SearchEngine';

type Props = {
  file: SourceFile | null;
  /** Current search query — empty string means no highlighting. */
  query?: string;
  caseSensitive?: boolean;
  regex?: boolean;
  /** 1-based line to scroll into view (used when opening a search result). */
  scrollToLine?: number;
};

/** Files larger than this get truncated with a banner so the viewer stays responsive. */
const MAX_RENDERED_LINES = 5000;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Wrap each match span inside an already-escaped line. Ranges are pre-escape offsets. */
function renderLineHtml(
  line: string,
  hits: { start: number; end: number }[],
): string {
  if (hits.length === 0) return escapeHtml(line) || '&nbsp;';
  // Hits come back in order from lineMatches.
  let cursor = 0;
  let out = '';
  for (const h of hits) {
    if (h.start > cursor) out += escapeHtml(line.slice(cursor, h.start));
    out += `<mark class="rounded-sm bg-amber-200/70 text-slate-900">${escapeHtml(
      line.slice(h.start, h.end),
    )}</mark>`;
    cursor = h.end;
  }
  if (cursor < line.length) out += escapeHtml(line.slice(cursor));
  return out || '&nbsp;';
}

export function CodeViewer({
  file,
  query = '',
  caseSensitive,
  regex,
  scrollToLine,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Split content once per file change. For very large files we cap the
  // rendered slice so a 50k-line minified bundle doesn't tank the page.
  const { lines, truncated } = useMemo(() => {
    if (!file) return { lines: [] as string[], truncated: false };
    const all = file.content.split('\n');
    if (all.length > MAX_RENDERED_LINES) {
      return { lines: all.slice(0, MAX_RENDERED_LINES), truncated: true };
    }
    return { lines: all, truncated: false };
  }, [file]);

  // Pre-render each line as HTML with any match wrapping baked in.
  // Memoized so typing in the search box doesn't re-escape the whole file
  // every keystroke when nothing changed.
  const renderedLines = useMemo(() => {
    if (!query) return lines.map((l) => escapeHtml(l) || '&nbsp;');
    return lines.map((l) =>
      renderLineHtml(l, lineMatches(l, query, { caseSensitive, regex })),
    );
  }, [lines, query, caseSensitive, regex]);

  useEffect(() => {
    if (!scrollToLine || !scrollerRef.current) return;
    const target = scrollerRef.current.querySelector<HTMLElement>(
      `[data-line="${scrollToLine}"]`,
    );
    if (target) {
      target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [scrollToLine, file?.path]);

  if (!file) {
    return (
      <div className="card flex h-96 items-center justify-center text-sm text-slate-500">
        Select a file to view its source.
      </div>
    );
  }

  const gutterWidth = `${Math.max(2, String(lines.length).length)}ch`;

  return (
    <div className="card overflow-hidden" data-testid="code-viewer">
      <div
        ref={scrollerRef}
        className="max-h-[60vh] overflow-auto bg-slate-50"
        data-file-path={file.path}
      >
        <pre className="m-0 font-mono text-xs leading-5 text-slate-800">
          {renderedLines.map((html, idx) => {
            const lineNo = idx + 1;
            const isMatchLine =
              query.length > 0 && html.includes('<mark');
            return (
              <div
                key={lineNo}
                data-line={lineNo}
                data-has-match={isMatchLine || undefined}
                className={[
                  'flex items-start',
                  isMatchLine ? 'bg-amber-50' : '',
                  lineNo === scrollToLine ? 'ring-1 ring-amber-300' : '',
                ].join(' ')}
              >
                <span
                  aria-hidden
                  className="sticky left-0 select-none border-r border-slate-200 bg-slate-100 px-2 text-right text-slate-400"
                  style={{ minWidth: `calc(${gutterWidth} + 1rem)` }}
                >
                  {lineNo}
                </span>
                <code
                  className="block whitespace-pre px-3"
                  // Safe: escapeHtml + bounded <mark> insertion are the only sources.
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              </div>
            );
          })}
        </pre>
      </div>
      {truncated && (
        <div className="border-t border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Truncated after {MAX_RENDERED_LINES.toLocaleString()} lines for
          rendering performance.
        </div>
      )}
    </div>
  );
}
