import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Brain, ChevronDown, Hand, Maximize, Palette, Type } from 'lucide-react';
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
  /**
   * Switches the Analyzer to a sibling tab while preserving the URL filter
   * params, powering the "Run on this filter" handoff. The string mirrors
   * Analyzer.Mode, kept loose here to avoid coupling the panel to the page.
   */
  onSwitchMode?: (mode: string) => void;
};

const VALID_TYPES = new Set<string>(UI_TYPES);

/** Type-guard for URL-supplied ?type values. */
function parseTypeParam(raw: string | null): UIElementType | 'all' {
  if (raw && VALID_TYPES.has(raw)) return raw as UIElementType;
  return 'all';
}

/**
 * Check tabs the handoff strip routes to. Ordered to mirror the Analyzer
 * tab strip so the user's spatial memory of "Contrast is third" carries
 * over. Each entry is `{ mode, label, Icon }` — labels deliberately
 * shortened to keep the strip on one line on a desktop card.
 */
const CHECK_HANDOFFS = [
  { mode: 'targets', label: 'Touch targets', Icon: Hand },
  { mode: 'contrast', label: 'Contrast', Icon: Palette },
  { mode: 'dynamic', label: 'Dynamic type', Icon: Type },
  { mode: 'reflow', label: 'Reflow', Icon: Maximize },
  { mode: 'patterns', label: 'Patterns', Icon: Brain },
] as const;

export function ComponentInventoryPanel({ onJump, onSwitchMode }: Props) {
  const report = useAuditReport();
  const elements = report?.elements ?? [];
  const inventory = useMemo(() => buildInventory(elements), [elements]);

  // Count how many elements have computed CSS — surfaced in the orientation
  // band so users can tell at a glance whether stylesheet resolution kicked in.
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

  /**
   * Per-type counts *after the search filter has been applied* (regardless
   * of the active type chip). Drives C2 — "button 2/12" so chip labels
   * stop overpromising when a search is narrowing the visible pool.
   * When `query` is empty this is identical to inventory.totals.byType.
   */
  const chipCountsBySearch = useMemo(() => {
    if (!query) return inventory.totals.byType;
    const q = query.toLowerCase();
    const out: Record<string, number> = {};
    for (const t of UI_TYPES) out[t] = 0;
    for (const el of inventory.elements) {
      if (
        el.text.toLowerCase().includes(q) ||
        el.file.toLowerCase().includes(q) ||
        el.tagName.toLowerCase().includes(q) ||
        el.role.toLowerCase().includes(q)
      ) {
        out[el.type] = (out[el.type] ?? 0) + 1;
      }
    }
    return out as typeof inventory.totals.byType;
  }, [inventory, query]);

  /**
   * Count for the "All" chip after the search filter only (no type filter).
   * When `query` is empty this is just inventory.totals.all.
   */
  const allChipMatchCount = useMemo(() => {
    if (!query) return inventory.totals.all;
    return Object.values(chipCountsBySearch).reduce((a, b) => a + b, 0);
  }, [chipCountsBySearch, inventory.totals.all, query]);

  // Only show chips for types that actually exist in this inventory, sorted
  // by count DESC so the heaviest buckets surface first. Declaration order in
  // UI_TYPES is the tiebreaker so the chip row stays stable across re-renders.
  // We sort by *unfiltered* totals so the chip row doesn't reshuffle as the
  // user types — visual stability beats search-rank ordering here.
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
  const clearSearch = () => updateParam('q', null);
  const clearType = () => updateParam('type', null);
  const clearAll = () => {
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
      {/*
        C1 — orientation band. The "how much am I looking at" sentence used
        to live in 11px text *below* the chip row; now it leads, so users
        know the scope before they touch a filter. Mirrors the pattern in
        Touch Targets / Contrast (summary above controls).
      */}
      <header
        className="card flex flex-wrap items-baseline gap-x-2 gap-y-1 p-3 text-sm text-slate-600 dark:text-slate-400"
        data-testid="inventory-orientation"
      >
        <span>
          Showing{' '}
          <span
            className="text-base font-semibold text-slate-900 dark:text-slate-100"
            data-testid="inventory-visible-count"
          >
            {visible.length}
          </span>{' '}
          of {inventory.totals.all} detected component
          {inventory.totals.all === 1 ? '' : 's'} across{' '}
          {Object.keys(inventory.byFile).length} file
          {Object.keys(inventory.byFile).length === 1 ? '' : 's'}.
        </span>
        {enrichedCount > 0 && (
          <span
            className="text-xs"
            title="We matched these elements to declarations in your uploaded stylesheets."
          >
            <span className="font-semibold text-emerald-700">
              {enrichedCount}
            </span>{' '}
            with resolved styles
          </span>
        )}
      </header>

      <div className="card p-3 space-y-3">
        <div
          role="group"
          aria-label="Filter by component type"
          className="flex flex-wrap items-center gap-1.5"
        >
          <TypeChip
            label="All"
            count={inventory.totals.all}
            matchCount={query ? allChipMatchCount : undefined}
            active={activeType === 'all'}
            onClick={() => setActiveType('all')}
            dataAttr="all"
          />
          {visibleTypeChips.map((t) => {
            const Icon = TYPE_STYLES[t].Icon;
            const total = inventory.totals.byType[t];
            const matched = chipCountsBySearch[t];
            return (
              <TypeChip
                key={t}
                label={t}
                icon={<Icon aria-hidden className="h-3 w-3" />}
                count={total}
                matchCount={query ? matched : undefined}
                active={activeType === t}
                onClick={() => setActiveType(t)}
                dataAttr={t}
                chipClass={TYPE_STYLES[t].chip}
              />
            );
          })}
        </div>

        {/*
          C3 — search + Group-by-file segmented control share one row, so the
          worldview toggle is visible at the same height as the search box
          instead of buried in a footer. The flat / by-file pair behaves as
          a radio group via role="radio" + aria-checked.
        */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[16rem] flex-1">
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
          <SegmentedGroupToggle
            on={groupByFile}
            onChange={setGroupByFile}
          />
        </div>

        {/*
          C5 — handoff strip. Surfaces only when a filter narrows the pool,
          so it doesn't add noise to the default view. Each button flips the
          Analyzer to a sibling tab without disturbing the ?type / ?q
          params — the sibling panel reads them via useInboundComponentFilter
          and applies the same scope.
        */}
        {filtersActive && onSwitchMode && (
          <div
            className="flex flex-wrap items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 dark:border-slate-800 dark:bg-slate-900"
            data-testid="inventory-handoff"
          >
            <span className="px-1 text-xs font-medium text-slate-600 dark:text-slate-400">
              Run on this filter:
            </span>
            {CHECK_HANDOFFS.map((h) => (
              <button
                key={h.mode}
                type="button"
                onClick={() => onSwitchMode(h.mode)}
                data-handoff={h.mode}
                className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-brand-50 hover:text-brand-700 hover:ring-brand-300 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-700"
              >
                <h.Icon aria-hidden className="h-3 w-3" />
                {h.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        {visible.length === 0 ? (
          // C4 — when the user hit an empty result with both dimensions
          // active, offer surgical clears so they can keep the one that
          // narrowed them productively.
          <EmptyResults
            type={activeType}
            query={query}
            onClearType={clearType}
            onClearSearch={clearSearch}
            onClearAll={clearAll}
          />
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

/**
 * Two-button segmented control. Behaves as a radio group: each button is
 * role="radio", the wrapper is role="radiogroup". Active state uses the
 * brand pill style so it reads as the same control family as the type
 * chips above it.
 */
function SegmentedGroupToggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Result grouping"
      className="inline-flex rounded-md border border-slate-300 bg-white p-0.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-900"
      data-testid="inventory-group-toggle"
    >
      <SegButton
        active={!on}
        onClick={() => onChange(false)}
        dataAttr="flat"
        title="Show every component as a single flat list"
      >
        Flat
      </SegButton>
      <SegButton
        active={on}
        onClick={() => onChange(true)}
        dataAttr="by-file"
        title="Group rows by their source file"
      >
        By file
      </SegButton>
    </div>
  );
}

function SegButton({
  active,
  onClick,
  dataAttr,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  dataAttr: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      data-seg={dataAttr}
      title={title}
      className={[
        'rounded px-2 py-1 transition',
        active
          ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-300'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function EmptyResults({
  type,
  query,
  onClearType,
  onClearSearch,
  onClearAll,
}: {
  type: UIElementType | 'all';
  query: string;
  onClearType: () => void;
  onClearSearch: () => void;
  onClearAll: () => void;
}) {
  const hasType = type !== 'all';
  const hasQuery = query.length > 0;
  // Compose a sentence that names what's currently filtering — so the
  // user can decide which dimension to relax without reading the toolbar.
  const phrase = (() => {
    if (hasType && hasQuery)
      return (
        <>
          No <strong>{type}</strong> components match{' '}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">
            "{query}"
          </code>
          .
        </>
      );
    if (hasType) return <>No <strong>{type}</strong> components in this project.</>;
    if (hasQuery)
      return (
        <>
          No components match{' '}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">
            "{query}"
          </code>
          .
        </>
      );
    return <>No components match the current filter.</>;
  })();

  return (
    <div
      className="space-y-3 p-6 text-sm text-slate-600 dark:text-slate-400"
      data-testid="inventory-empty"
    >
      <p>{phrase}</p>
      <div className="flex flex-wrap gap-2">
        {hasQuery && (
          <button
            type="button"
            onClick={onClearSearch}
            className="btn-ghost text-xs"
            data-testid="inventory-empty-clear-search"
          >
            Clear search
          </button>
        )}
        {hasType && (
          <button
            type="button"
            onClick={onClearType}
            className="btn-ghost text-xs"
            data-testid="inventory-empty-clear-type"
          >
            Clear type
          </button>
        )}
        {hasType && hasQuery && (
          <button
            type="button"
            onClick={onClearAll}
            className="btn-ghost text-xs"
            data-testid="inventory-empty-clear-all"
          >
            Clear both
          </button>
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
  const computedCount = computed ? Object.keys(computed).length : 0;
  const inlineCount = inline ? Object.keys(inline).length : 0;
  const hasStyleDetails = computedCount > 0 || inlineCount > 0;

  // C9 — converted from native <details> to useState so the toggle can
  // live as a sibling button in the row's top bar instead of as a strip
  // below the jump button. Avoids the affordance ambiguity of "click row
  // jumps / click details expands" living in the same vertical space.
  const [expanded, setExpanded] = useState(false);

  // C8 — plain-language Styles count. Single label rolls up CSS + inline so
  // users see ONE thing where two competing badges used to live (the
  // standalone `+N CSS` chip in the chip row and the `<details>` summary
  // below). Tooltip explains the source.
  const stylesLabel = (() => {
    if (computedCount > 0 && inlineCount > 0)
      return `Styles · ${computedCount} CSS · ${inlineCount} inline`;
    if (computedCount > 0) return `Styles · ${computedCount}`;
    if (inlineCount > 0) return `Styles · ${inlineCount} inline`;
    return 'Styles';
  })();
  const stylesTitle =
    computedCount > 0 && inlineCount > 0
      ? 'Styles resolved from your stylesheets plus the element\'s inline style attribute.'
      : computedCount > 0
        ? 'Resolved from your stylesheets.'
        : 'From the element\'s inline style attribute.';

  return (
    <li>
      <div
        className="flex items-start gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/40"
        data-row={el.id}
      >
        {/*
          Jump trigger — the chip cluster + text + path. C7 dropped the
          standalone colored dot that used to sit here; the type chip
          already carries the color (border + bg), the icon, and the label,
          so the dot was a third signal for the same fact.
        */}
        <button
          type="button"
          onClick={() => onJump(el.file, el.line)}
          data-jump={`${el.file}:${el.line}`}
          data-type={el.type}
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-2">
              {/*
                C11 — dropped `uppercase tracking-wide` from the type chip.
                The bordered pill + icon + label already differentiates it
                from prose; uppercase added shout-volume that competed with
                the severity badges elsewhere in the app.
              */}
              <span
                className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium ${style.chip}`}
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

        {/*
          C9 — Styles toggle is a SIBLING of the jump button, not a nested
          interactive surface inside it. Two click areas, two intents, both
          unambiguous. The chevron flips to communicate state without
          needing extra ink.
        */}
        {hasStyleDetails && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-controls={`row-styles-${el.id}`}
            data-testid="row-styles-toggle"
            title={stylesTitle}
            className={[
              'inline-flex shrink-0 items-center gap-1 self-start rounded-full px-2 py-0.5 text-[11px] font-medium transition',
              expanded
                ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-100'
                : computedCount > 0
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-800 ring-1 ring-amber-200 hover:bg-amber-100',
            ].join(' ')}
          >
            {stylesLabel}
            <ChevronDown
              aria-hidden
              className={`h-3 w-3 transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          </button>
        )}
      </div>
      {hasStyleDetails && expanded && (
        <div
          id={`row-styles-${el.id}`}
          className="border-t border-slate-100 bg-slate-50/60 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/40"
          data-testid="row-styles-panel"
        >
          {inline && inlineCount > 0 && (
            <StyleTable
              title="inline"
              styles={inline}
              tone="bg-amber-100 text-amber-800"
            />
          )}
          {computed && computedCount > 0 && (
            <StyleTable
              title="resolved from CSS"
              styles={computed}
              tone="bg-emerald-100 text-emerald-800"
            />
          )}
        </div>
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
  matchCount,
  active,
  onClick,
  dataAttr,
  chipClass,
}: {
  label: string;
  icon?: React.ReactNode;
  count: number;
  /**
   * When a search filter is narrowing the pool, this is how many of `count`
   * actually match it. Renders the count as "matched / total" — the type
   * label stops overpromising what clicking the chip will reveal (C2).
   * Omit to render just `count` as before.
   */
  matchCount?: number;
  active: boolean;
  onClick: () => void;
  dataAttr: string;
  chipClass?: string;
}) {
  const base = chipClass ?? 'bg-slate-100 text-slate-700 dark:text-slate-300 border-slate-200 dark:bg-slate-800 dark:border-slate-800';
  // When the search filter zeroes a type out, the chip is technically
  // clickable but the result would be the empty-state card. Dim it so the
  // user reads "no submit matches in dialogs" without trying.
  const dimmedByFilter = matchCount !== undefined && matchCount === 0;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-chip={dataAttr}
      className={[
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition',
        active
          ? 'ring-2 ring-brand-500 ring-offset-1'
          : dimmedByFilter
            ? 'opacity-40 hover:opacity-70'
            : 'opacity-80 hover:opacity-100',
        base,
      ].join(' ')}
    >
      {icon}
      <span>{label}</span>
      <span
        className="rounded-full bg-white/70 px-1.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300"
        data-testid={`chip-count-${dataAttr}`}
      >
        {matchCount !== undefined ? `${matchCount}/${count}` : count}
      </span>
    </button>
  );
}
