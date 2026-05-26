import type { SearchSummary } from '../../services/SearchEngine';

type Props = {
  query: string;
  onQuery: (q: string) => void;
  caseSensitive: boolean;
  onCaseSensitive: (v: boolean) => void;
  regex: boolean;
  onRegex: (v: boolean) => void;
  summary: SearchSummary;
};

export function SearchBar({
  query,
  onQuery,
  caseSensitive,
  onCaseSensitive,
  regex,
  onRegex,
  summary,
}: Props) {
  return (
    <div className="card p-3" data-testid="search-bar">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="explorer-search" className="sr-only">
          Search source
        </label>
        <input
          id="explorer-search"
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search across all loaded files…"
          className="flex-1 min-w-[200px] rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          data-testid="search-input"
          // useKeyboardShortcuts hooks `/` to focus this input.
          data-search="explorer"
          spellCheck={false}
        />
        <ToggleChip
          label="Aa"
          title="Case sensitive"
          active={caseSensitive}
          onClick={() => onCaseSensitive(!caseSensitive)}
          dataAttr="search-case"
        />
        <ToggleChip
          label=".*"
          title="Regex"
          active={regex}
          onClick={() => onRegex(!regex)}
          dataAttr="search-regex"
        />
      </div>
      <SummaryLine query={query} summary={summary} />
    </div>
  );
}

function ToggleChip({
  label,
  title,
  active,
  onClick,
  dataAttr,
}: {
  label: string;
  title: string;
  active: boolean;
  onClick: () => void;
  dataAttr: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      data-action={dataAttr}
      className={[
        'rounded-md border px-2 py-1 font-mono text-xs transition',
        active
          ? 'border-brand-500 bg-brand-50 text-brand-700'
          : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

function SummaryLine({
  query,
  summary,
}: {
  query: string;
  summary: SearchSummary;
}) {
  if (!query) {
    return (
      <p className="mt-2 text-xs text-slate-500">
        Empty query — type to filter and highlight matches.
      </p>
    );
  }
  if (summary.error) {
    return (
      <p className="mt-2 text-xs text-rose-700" role="alert">
        Pattern error: {summary.error}
      </p>
    );
  }
  if (summary.matches.length === 0) {
    return <p className="mt-2 text-xs text-slate-500">No matches.</p>;
  }
  return (
    <p className="mt-2 text-xs text-slate-600">
      <span className="font-semibold text-slate-800">
        {summary.matches.length}
        {summary.truncated ? '+' : ''}
      </span>{' '}
      match{summary.matches.length === 1 ? '' : 'es'} in{' '}
      <span className="font-semibold text-slate-800">
        {summary.filesMatched}
      </span>{' '}
      file{summary.filesMatched === 1 ? '' : 's'}
      {summary.truncated && ' · results capped'}
    </p>
  );
}
