import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuditReport } from '../../services/AuditCache';
import {
  UI_TYPES,
  type UIElement,
  type UIElementType,
} from '../../services/ComponentDetector';
import { buildInventory } from '../../services/ComponentInventory';
import { getPreferences } from '../../services/UserPreferences';
import { TYPE_STYLES } from './typeStyles';

type Props = {
  /** Switches the Analyzer back to Source view and opens this file at line. */
  onJump: (path: string, line: number) => void;
};

const VALID_TYPES = new Set<string>(UI_TYPES);

/** Type-guard for URL-supplied ?type values. */
function parseTypeParam(raw: string | null): UIElementType | 'all' {
  if (raw && VALID_TYPES.has(raw)) return raw as UIElementType;
  return 'all';
}

export function ComponentInventoryPanel({ onJump }: Props) {
  const report = useAuditReport();
  const elements = report?.elements ?? [];
  const inventory = useMemo(() => buildInventory(elements), [elements]);

  // Count how many elements have computed CSS — surfaced in the summary line
  // so users can tell at a glance whether stylesheet resolution kicked in.
  const enrichedCount = useMemo(
    () => inventory.elements.filter((e) => e.styles.computed).length,
    [inventory],
  );

  // Filter state lives in the URL so /analyzer?type=button&q=submit is
  // shareable, survives tab switches inside the Analyzer, and shows up in
  // browser history (back / forward).
  const [searchParams, setSearchParams] = useSearchParams();
  const activeType = parseTypeParam(searchParams.get('type'));
  const query = searchParams.get('q') ?? '';
  // URL param wins when present; fall back to the user's saved default
  // so visiting the tab fresh respects the Settings choice.
  const groupParam = searchParams.get('group');
  const groupByFile =
    groupParam === 'file'
      ? true
      : groupParam === 'flat'
        ? false
        : getPreferences().inventoryGroupByFile;

  // Helper that mutates one param while preserving the others. `null` clears.
  const updateParam = useCallback(
    (key: string, value: string | null) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value === null || value === '') next.delete(key);
          else next.set(key, value);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setActiveType = (t: UIElementType | 'all') =>
    updateParam('type', t === 'all' ? null : t);
  const setQuery = (q: string) => updateParam('q', q.length === 0 ? null : q);
  // Use an explicit "flat" string (vs deleting the param) when overriding
  // the pref to OFF — otherwise the pref would re-assert itself on the
  // next render.
  const setGroupByFile = (on: boolean) =>
    updateParam('group', on ? 'file' : 'flat');

  // Only show chips for types that actually exist in this inventory, sorted
  // by count DESC so the heaviest buckets surface first. Declaration order in
  // UI_TYPES is the tiebreaker so the chip row stays stable across re-renders.
  const visibleTypeChips = useMemo(() => {
    return UI_TYPES.filter((t) => inventory.totals.byType[t] > 0).sort(
      (a, b) => {
        const diff = inventory.totals.byType[b] - inventory.totals.byType[a];
        if (diff !== 0) return diff;
        return UI_TYPES.indexOf(a) - UI_TYPES.indexOf(b);
      },
    );
  }, [inventory]);

  const visible: UIElement[] = useMemo(() => {
    const pool =
      activeType === 'all' ? inventory.elements : inventory.byType[activeType];
    if (!query) return pool;
    const q = query.toLowerCase();
    return pool.filter(
      (el) =>
        el.text.toLowerCase().includes(q) ||
        el.file.toLowerCase().includes(q) ||
        el.tagName.toLowerCase().includes(q) ||
        el.role.toLowerCase().includes(q),
    );
  }, [activeType, inventory, query]);

  // Grouping isn't a "filter" in the user's mental model — keep it out of
  // the filtersActive check so toggling group-by-file doesn't make the
  // "Clear filters" link light up.
  const filtersActive = activeType !== 'all' || query.length > 0;
  const clearFilters = () => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('type');
        next.delete('q');
        return next;
      },
      { replace: true },
    );
  };

  // Bucket elements by file. Sorted by descending count so files with the
  // most components surface first; ties broken alphabetically for stability.
  const groupedByFile = useMemo(() => {
    if (!groupByFile) return null;
    const map = new Map<string, UIElement[]>();
    for (const el of visible) {
      const arr = map.get(el.file);
      if (arr) arr.push(el);
      else map.set(el.file, [el]);
    }
    return Array.from(map.entries()).sort((a, b) => {
      const diff = b[1].length - a[1].length;
      if (diff !== 0) return diff;
      return a[0].localeCompare(b[0]);
    });
  }, [visible, groupByFile]);

  if (!report) {
    return (
      <div className="card p-6 text-sm text-slate-600 dark:text-slate-400">
        Upload a project on the Dashboard to generate a component inventory.
      </div>
    );
  }

  if (inventory.totals.all === 0) {
    return (
      <div className="card p-6 text-sm text-slate-600 dark:text-slate-400">
        No UI components detected. Try uploading HTML, JSX/TSX, or Vue files.
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="inventory-panel">
      <div className="card p-3">
        <div
          role="group"
          aria-label="Filter by component type"
          className="flex flex-wrap items-center gap-1.5"
        >
          <TypeChip
            label="All"
            count={inventory.totals.all}
            active={activeType === 'all'}
            onClick={() => setActiveType('all')}
            dataAttr="all"
          />
          {visibleTypeChips.map((t) => {
            const Icon = TYPE_STYLES[t].Icon;
            return (
              <TypeChip
                key={t}
                label={t}
                icon={<Icon aria-hidden className="h-3 w-3" />}
                count={inventory.totals.byType[t]}
                active={activeType === t}
                onClick={() => setActiveType(t)}
                dataAttr={t}
                chipClass={TYPE_STYLES[t].chip}
              />
            );
          })}
        </div>
        <div className="relative mt-3">
          <label htmlFor="inventory-filter" className="sr-only">
            Filter inventory
          </label>
          <input
            id="inventory-filter"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by text, role, tag, or file…  (press / to focus)"
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 pr-9 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-slate-700"
            data-testid="inventory-filter-input"
            // useKeyboardShortcuts hooks `/` to the visible data-search input.
            data-search="inventory"
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              data-testid="inventory-clear-search"
              // The native `type="search"` × is suppressed by Tailwind's
              // preflight in most browsers — render our own so the affordance
              // is consistent across Chrome / Safari / Firefox.
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 dark:text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-800"
            >
              <span aria-hidden>✕</span>
            </button>
          )}
        </div>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
          <span>
            Showing{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-200">{visible.length}</span>{' '}
            of {inventory.totals.all} detected component
            {inventory.totals.all === 1 ? '' : 's'} across{' '}
            {Object.keys(inventory.byFile).length} file
            {Object.keys(inventory.byFile).length === 1 ? '' : 's'}.
          </span>
          {enrichedCount > 0 && (
            <span>
              <span className="font-semibold text-emerald-700">
                {enrichedCount}
              </span>{' '}
              enriched from CSS
            </span>
          )}
          <span className="ml-auto flex items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={groupByFile}
              onClick={() => setGroupByFile(!groupByFile)}
              data-testid="inventory-group-toggle"
              className={[
                'rounded-full border px-2 py-0.5 text-[11px] font-medium transition',
                groupByFile
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-slate-300 bg-white text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700',
              ].join(' ')}
              title="Group rows by source file"
            >
              Group by file
            </button>
            {filtersActive && (
              <button
                type="button"
                onClick={clearFilters}
                data-testid="inventory-clear-filters"
                className="rounded px-1.5 py-0.5 text-xs font-medium text-brand-700 underline-offset-2 hover:underline"
              >
                Clear filters
              </button>
            )}
          </span>
        </p>
      </div>

      <div className="card overflow-hidden">
        {visible.length === 0 ? (
          <div className="space-y-3 p-6 text-sm text-slate-600 dark:text-slate-400">
            <p>No components match the current filter.</p>
            <button
              type="button"
              onClick={clearFilters}
              className="btn-ghost text-xs"
              data-testid="inventory-empty-clear"
            >
              Clear filters
            </button>
          </div>
        ) : groupedByFile ? (
          <ul className="divide-y divide-slate-200" data-testid="inventory-file-groups">
            {groupedByFile.map(([file, items]) => (
              <FileGroup
                key={file}
                file={file}
                items={items}
                onJump={onJump}
              />
            ))}
          </ul>
        ) : (
          <ul className="divide-y divide-slate-100" data-testid="inventory-list">
            {visible.map((el) => (
              <ElementRow key={el.id} el={el} onJump={onJump} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function FileGroup({
  file,
  items,
  onJump,
}: {
  file: string;
  items: UIElement[];
  onJump: (path: string, line: number) => void;
}) {
  return (
    <li>
      {/* `open` by default so users see content immediately on first toggle —
          if they want to collapse a file they can. */}
      <details open data-testid="inventory-file-group" data-file={file}>
        <summary className="flex cursor-pointer items-center justify-between gap-3 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-900 dark:bg-slate-800 dark:hover:bg-slate-800">
          <span className="truncate font-mono" title={file}>
            {file}
          </span>
          <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-400 ring-1 ring-slate-200 dark:bg-slate-900">
            {items.length}
          </span>
        </summary>
        <ul className="divide-y divide-slate-100">
          {items.map((el) => (
            <ElementRow key={el.id} el={el} onJump={onJump} />
          ))}
        </ul>
      </details>
    </li>
  );
}

function ElementRow({
  el,
  onJump,
}: {
  el: UIElement;
  onJump: (path: string, line: number) => void;
}) {
  const style = TYPE_STYLES[el.type];
  const computed = el.styles.computed;
  const inline = el.styles.inline;
  const hasStyleDetails =
    (computed && Object.keys(computed).length > 0) ||
    (inline && Object.keys(inline).length > 0);

  return (
    <li>
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={() => onJump(el.file, el.line)}
          data-jump={`${el.file}:${el.line}`}
          data-type={el.type}
          className="flex flex-1 items-start gap-3 px-3 py-2 text-left hover:bg-slate-50 dark:bg-slate-900"
        >
          <span
            aria-hidden
            className={`mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${style.chip}`}
              >
                <style.Icon aria-hidden className="h-3 w-3" />
                {el.type}
              </span>
              <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                &lt;{el.tagName}&gt;
              </span>
              {el.role && (
                <span className="text-xs text-slate-500">
                  role: <span className="font-mono">{el.role}</span>
                </span>
              )}
              {computed && (
                <span
                  className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-200"
                  data-enriched
                >
                  +{Object.keys(computed).length} CSS
                </span>
              )}
            </div>
            {el.text && (
              <p className="mt-0.5 truncate text-sm text-slate-800 dark:text-slate-200">
                {el.text}
              </p>
            )}
            <div
              className="mt-0.5 truncate font-mono text-xs text-slate-500"
              // Truncation hides long paths — the title makes the full path
              // available on hover without having to jump to the Source tab.
              title={`${el.file}:${el.line}${el.styles.className ? ` · .${el.styles.className.split(/\s+/).join('.')}` : ''}`}
            >
              {el.file}:{el.line}
              {el.styles.className && (
                <span className="ml-2 text-slate-400 dark:text-slate-500">
                  .{el.styles.className.split(/\s+/).slice(0, 3).join(' .')}
                  {el.styles.className.split(/\s+/).length > 3 ? '…' : ''}
                </span>
              )}
            </div>
          </div>
          <span
            aria-hidden
            // → matches the in-page jump behavior. The old ↗ glyph
            // reads as "external link" which this isn't.
            className="shrink-0 self-center text-xs text-slate-400 dark:text-slate-500"
          >
            →
          </span>
        </button>
      </div>
      {hasStyleDetails && (
        <details className="border-t border-slate-100 bg-slate-50/50 px-3 py-1 dark:border-slate-800">
          <summary className="cursor-pointer text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
            Styles{' '}
            <span className="text-slate-400 dark:text-slate-500">
              {/* Split CSS vs inline so the count matches what the expanded
                  view actually shows (two separate tables). */}
              {[
                computed && Object.keys(computed).length > 0
                  ? `${Object.keys(computed).length} CSS`
                  : null,
                inline && Object.keys(inline).length > 0
                  ? `${Object.keys(inline).length} inline`
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </summary>
          {inline && Object.keys(inline).length > 0 && (
            <StyleTable
              title="inline"
              styles={inline}
              tone="bg-amber-100 text-amber-800"
            />
          )}
          {computed && Object.keys(computed).length > 0 && (
            <StyleTable
              title="computed from CSS"
              styles={computed}
              tone="bg-emerald-100 text-emerald-800"
            />
          )}
        </details>
      )}
    </li>
  );
}

function StyleTable({
  title,
  styles,
  tone,
}: {
  title: string;
  styles: Record<string, string>;
  tone: string;
}) {
  return (
    <div className="mt-1">
      <div className="mb-1 flex items-center gap-1.5">
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${tone}`}
        >
          {title}
        </span>
      </div>
      <dl className="grid grid-cols-1 gap-x-4 gap-y-0.5 font-mono text-xs sm:grid-cols-2">
        {Object.entries(styles).map(([k, v]) => (
          <div key={k} className="flex gap-2">
            <dt className="text-slate-500">{k}:</dt>
            <dd className="truncate text-slate-800 dark:text-slate-200" title={v}>
              {v}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function TypeChip({
  label,
  icon,
  count,
  active,
  onClick,
  dataAttr,
  chipClass,
}: {
  label: string;
  icon?: React.ReactNode;
  count: number;
  active: boolean;
  onClick: () => void;
  dataAttr: string;
  chipClass?: string;
}) {
  const base = chipClass ?? 'bg-slate-100 text-slate-700 dark:text-slate-300 border-slate-200 dark:bg-slate-800 dark:border-slate-800';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-chip={dataAttr}
      className={[
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition',
        active ? 'ring-2 ring-brand-500 ring-offset-1' : 'opacity-80 hover:opacity-100',
        base,
      ].join(' ')}
    >
      {icon}
      <span>{label}</span>
      <span className="rounded-full bg-white/70 px-1.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
        {count}
      </span>
    </button>
  );
}
