/**
 * SearchEngine
 *
 * Plain-text and regex search across the in-memory SourceRepository. Returns
 * one match per line (the first occurrence on that line is enough to anchor
 * the UI to it); the viewer can compute additional in-line matches when it
 * renders. Keeping this pure makes it trivially testable and lets the UI
 * memoize results by query.
 */

import type { SourceFile } from './FileParser';

export type SearchMatch = {
  file: SourceFile;
  /** 1-based line number, matches what's shown in the gutter. */
  line: number;
  /** 0-based column of the match within the line. */
  column: number;
  /** Length of the matched substring. */
  length: number;
  /** Original line text (untrimmed, used for preview rendering). */
  lineText: string;
};

export type SearchOptions = {
  caseSensitive?: boolean;
  regex?: boolean;
  /** Hard cap so a runaway query (e.g. "a") doesn't lock the UI. */
  maxResults?: number;
  /** Skip lines longer than this — almost always minified blobs. */
  maxLineLength?: number;
};

const DEFAULTS: Required<Pick<SearchOptions, 'maxResults' | 'maxLineLength'>> = {
  maxResults: 500,
  maxLineLength: 2000,
};

export type SearchSummary = {
  matches: SearchMatch[];
  filesMatched: number;
  /** True if results were cut off at `maxResults`. */
  truncated: boolean;
  /** Set when `regex: true` and the pattern failed to compile. */
  error?: string;
};

/** Escape a literal string for use inside a RegExp. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildPattern(query: string, opts: SearchOptions): RegExp | { error: string } {
  const flags = (opts.caseSensitive ? '' : 'i') + 'g';
  try {
    return new RegExp(opts.regex ? query : escapeRegex(query), flags);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'invalid pattern' };
  }
}

export function search(
  files: SourceFile[],
  query: string,
  options: SearchOptions = {},
): SearchSummary {
  const matches: SearchMatch[] = [];
  if (query.length === 0) {
    return { matches, filesMatched: 0, truncated: false };
  }

  const pattern = buildPattern(query, options);
  if (pattern instanceof RegExp === false) {
    return {
      matches,
      filesMatched: 0,
      truncated: false,
      error: (pattern as { error: string }).error,
    };
  }
  const re = pattern as RegExp;
  const cap = options.maxResults ?? DEFAULTS.maxResults;
  const maxLine = options.maxLineLength ?? DEFAULTS.maxLineLength;

  const filesMatched = new Set<string>();
  for (const file of files) {
    if (matches.length >= cap) break;
    const lines = file.content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i];
      if (lineText.length > maxLine) continue;
      re.lastIndex = 0;
      const m = re.exec(lineText);
      if (!m) continue;
      matches.push({
        file,
        line: i + 1,
        column: m.index,
        length: m[0].length,
        lineText,
      });
      filesMatched.add(file.path);
      if (matches.length >= cap) break;
    }
  }

  return {
    matches,
    filesMatched: filesMatched.size,
    truncated: matches.length >= cap,
  };
}

/**
 * Find every match offset on a single line. Used by the CodeViewer to
 * highlight all hits in the visible file, not just the first per line.
 */
export function lineMatches(
  lineText: string,
  query: string,
  options: SearchOptions = {},
): { start: number; end: number }[] {
  if (!query) return [];
  const pattern = buildPattern(query, options);
  if (pattern instanceof RegExp === false) return [];
  const re = pattern as RegExp;
  const out: { start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(lineText))) {
    out.push({ start: m.index, end: m.index + m[0].length });
    if (m[0].length === 0) re.lastIndex++; // avoid infinite loop on empty match
  }
  return out;
}
