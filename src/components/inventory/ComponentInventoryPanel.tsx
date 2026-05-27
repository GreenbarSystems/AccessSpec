import { useMemo, useState } from 'react';
import { useAuditReport } from '../../services/AuditCache';
import {
  UI_TYPES,
  type UIElement,
  type UIElementType,
} from '../../services/ComponentDetector';
import { buildInventory } from '../../services/ComponentInventory';
import { TYPE_STYLES } from './typeStyles';

type Props = {
  /** Switches the Analyzer back to Source view and opens this file at line. */
  onJump: (path: string, line: number) => void;
};

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

  const [activeType, setActiveType] = useState<UIElementType | 'all'>('all');
  const [query, setQuery] = useState('');

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

  const filtersActive = activeType !== 'all' || query.length > 0;
  const clearFilters = () => {
    setActiveType('all');
    setQuery('');
  };

  if (!report) {
    return (
      <div className="card p-6 text-sm text-slate-600">
        Upload a project on the Dashboard to generate a component inventory.
      </div>
    );
  }

  if (inventory.totals.all === 0) {
    return (
      <div className="card p-6 text-sm text-slate-600">
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
          {visibleTypeChips.map((t) => (
            <TypeChip
              key={t}
              label={`${TYPE_STYLES[t].icon} ${t}`}
              count={inventory.totals.byType[t]}
              active={activeType === t}
              onClick={() => setActiveType(t)}
              dataAttr={t}
              chipClass={TYPE_STYLES[t].chip}
            />
          ))}
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
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 pr-9 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
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
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <span aria-hidden>✕</span>
            </button>
          )}
        </div>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
          <span>
            Showing{' '}
            <span className="font-semibold text-slate-800">{visible.length}</span>{' '}
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
          {filtersActive && (
            <button
              type="button"
              onClick={clearFilters}
              data-testid="inventory-clear-filters"
              className="ml-auto rounded px-1.5 py-0.5 text-xs font-medium text-brand-700 underline-offset-2 hover:underline"
            >
              Clear filters
            </button>
          )}
        </p>
      </div>

      <div className="card overflow-hidden">
        {visible.length === 0 ? (
          <div className="space-y-3 p-6 text-sm text-slate-600">
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
          className="flex flex-1 items-start gap-3 px-3 py-2 text-left hover:bg-slate-50"
        >
          <span
            aria-hidden
            className={`mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <span
                className={`rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${style.chip}`}
              >
                {el.type}
              </span>
              <span className="font-mono text-xs text-slate-700">
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
              <p className="mt-0.5 truncate text-sm text-slate-800">
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
                <span className="ml-2 text-slate-400">
                  .{el.styles.className.split(/\s+/).slice(0, 3).join(' .')}
                  {el.styles.className.split(/\s+/).length > 3 ? '…' : ''}
                </span>
              )}
            </div>
          </div>
          <span
            aria-hidden
            className="shrink-0 self-center text-xs text-slate-400"
          >
            ↗
          </span>
        </button>
      </div>
      {hasStyleDetails && (
        <details className="border-t border-slate-100 bg-slate-50/50 px-3 py-1">
          <summary className="cursor-pointer text-xs text-slate-600 hover:text-slate-900">
            Styles{' '}
            <span className="text-slate-400">
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
            <dd className="truncate text-slate-800" title={v}>
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
  count,
  active,
  onClick,
  dataAttr,
  chipClass,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  dataAttr: string;
  chipClass?: string;
}) {
  const base = chipClass ?? 'bg-slate-100 text-slate-700 border-slate-200';
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
      <span>{label}</span>
      <span className="rounded-full bg-white/70 px-1.5 text-[10px] font-semibold text-slate-700">
        {count}
      </span>
    </button>
  );
}
