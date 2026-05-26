import { useCallback, useEffect, useState, type RefObject } from 'react';

/**
 * HeatmapOverlay
 *
 * Renders a transparent layer the size of the iframe's viewport and draws
 * one box per interactive control inside the iframe's live DOM. Each box is
 * colored by a quick on-the-spot accessibility verdict so the user can spot
 * issues visually rather than scrolling a table.
 *
 * Coordinate trick: we measure `getBoundingClientRect()` *inside* the iframe's
 * own document. Those rects are already in the iframe's coordinate space, so
 * positioning our boxes absolutely inside a sibling div sized to the iframe
 * lines them up — no extra scale math, even when DeviceFrame applies a fit
 * scale to the whole chassis.
 *
 * Security note: enabling this requires the iframe sandbox to include
 * `allow-same-origin` alongside `allow-scripts`. We accept that combination
 * because the iframe is hosting *the user's own uploaded code*, which they
 * already trust. The DeviceSimulator surfaces this in its info aside.
 */

export type HeatmapStatus = 'pass' | 'warn' | 'fail';

export type HeatmapItem = {
  rect: DOMRect;
  status: HeatmapStatus;
  /** Short label rendered as the tooltip (e.g. "button"). */
  tag: string;
  /** Human-readable reason for the verdict. */
  reason: string;
};

export type HeatmapCounts = Record<HeatmapStatus, number>;

const STATUS_COLOR: Record<HeatmapStatus, { ring: string; fill: string; chip: string }> = {
  pass: {
    ring: '#10b981',
    fill: 'rgba(16, 185, 129, 0.12)',
    chip: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  },
  warn: {
    ring: '#f59e0b',
    fill: 'rgba(245, 158, 11, 0.15)',
    chip: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
  },
  fail: {
    ring: '#ef4444',
    fill: 'rgba(239, 68, 68, 0.18)',
    chip: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  },
};

/* ------------------------------------------------------------------ */
/* Live-DOM analysis                                                   */
/* ------------------------------------------------------------------ */

const INTERACTIVE_SELECTOR = [
  'button',
  'a[href]',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  '[role="button"]',
  '[role="link"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="switch"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="textbox"]',
  '[role="combobox"]',
  '[role="slider"]',
].join(', ');

function accessibleName(el: Element): string {
  const aria = el.getAttribute('aria-label');
  if (aria) return aria.trim();
  const labelledby = el.getAttribute('aria-labelledby');
  if (labelledby) {
    const target = el.ownerDocument.getElementById(labelledby);
    if (target?.textContent) return target.textContent.trim();
  }
  const text = (el.textContent ?? '').trim();
  if (text) return text;
  const title = el.getAttribute('title');
  if (title) return title.trim();
  const placeholder = el.getAttribute('placeholder');
  if (placeholder) return placeholder.trim();
  const value = (el as HTMLInputElement).value;
  if (value) return String(value).trim();
  return '';
}

function classifyControl(el: Element): { status: HeatmapStatus; reason: string } {
  const rect = el.getBoundingClientRect();
  const name = accessibleName(el);
  const dims = `${Math.round(rect.width)}×${Math.round(rect.height)}px`;

  if (!name) {
    return { status: 'fail', reason: `Missing accessible name (${dims})` };
  }

  const minSide = Math.min(rect.width, rect.height);
  if (minSide < 24) {
    return { status: 'fail', reason: `Below 24px touch target (${dims})` };
  }
  if (minSide < 44) {
    return { status: 'warn', reason: `Below 44px comfort target (${dims})` };
  }
  return { status: 'pass', reason: `${dims} — meets 44×44 comfort` };
}

export function analyzeIframeDom(doc: Document): HeatmapItem[] {
  const items: HeatmapItem[] = [];
  for (const el of Array.from(doc.querySelectorAll(INTERACTIVE_SELECTOR))) {
    const rect = el.getBoundingClientRect();
    // Skip elements that aren't laid out (display:none / detached).
    if (rect.width === 0 && rect.height === 0) continue;
    const { status, reason } = classifyControl(el);
    items.push({
      rect,
      status,
      tag: el.tagName.toLowerCase(),
      reason,
    });
  }
  return items;
}

/* ------------------------------------------------------------------ */
/* React component                                                     */
/* ------------------------------------------------------------------ */

type Props = {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  /** Iframe viewport dimensions (used to size the overlay). */
  width: number;
  height: number;
  /** Tick counter that forces re-analysis (e.g. when toggling on). */
  refreshTick?: number;
  /** Called with the latest verdict counts so the parent can render chips. */
  onCounts?: (counts: HeatmapCounts) => void;
};

export function HeatmapOverlay({
  iframeRef,
  width,
  height,
  refreshTick,
  onCounts,
}: Props) {
  const [items, setItems] = useState<HeatmapItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument;
      if (!doc || doc.readyState !== 'complete') return;
      const next = analyzeIframeDom(doc);
      setItems(next);
      setError(null);
      if (onCounts) {
        const counts: HeatmapCounts = { pass: 0, warn: 0, fail: 0 };
        for (const it of next) counts[it.status]++;
        onCounts(counts);
      }
    } catch (e) {
      // Sandbox without allow-same-origin or cross-origin content.
      setError(
        e instanceof Error
          ? e.message
          : 'Cannot read iframe DOM — enable same-origin sandbox',
      );
    }
  }, [iframeRef, onCounts]);

  // Re-run on iframe load and when the caller bumps refreshTick.
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const handle = () => runAnalysis();
    iframe.addEventListener('load', handle);
    // Initial pass in case the iframe is already loaded when we mount.
    runAnalysis();
    return () => iframe.removeEventListener('load', handle);
  }, [iframeRef, runAnalysis, refreshTick]);

  if (error) {
    return (
      <div
        data-testid="heatmap-error"
        className="absolute left-2 top-2 max-w-[14rem] rounded bg-rose-50 px-2 py-1 text-[10px] text-rose-700 ring-1 ring-rose-200"
      >
        Heatmap unavailable: {error}
      </div>
    );
  }

  return (
    <div
      data-testid="heatmap-overlay"
      aria-hidden
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width,
        height,
        pointerEvents: 'none',
      }}
    >
      {items.map((item, i) => {
        const tone = STATUS_COLOR[item.status];
        return (
          <div
            key={i}
            data-status={item.status}
            data-tag={item.tag}
            style={{
              position: 'absolute',
              left: item.rect.left,
              top: item.rect.top,
              width: Math.max(2, item.rect.width),
              height: Math.max(2, item.rect.height),
              boxShadow: `inset 0 0 0 2px ${tone.ring}`,
              backgroundColor: tone.fill,
              borderRadius: 2,
            }}
            title={`${item.tag} — ${item.reason}`}
          />
        );
      })}
    </div>
  );
}

export const HEATMAP_STATUS_STYLES = STATUS_COLOR;
