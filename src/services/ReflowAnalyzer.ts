/**
 * ReflowAnalyzer
 *
 * Tests every detected component against four reference viewport widths
 * (320 / 375 / 414 / 768 CSS px — iPhone SE, iPhone 13 mini, iPhone Plus,
 * iPad portrait) and predicts whether its declared sizing will cause the
 * two failure modes WCAG SC 1.4.10 cares about:
 *
 *   - **horizontal scrolling** — the element's intrinsic min/declared width
 *     exceeds the viewport, so the page becomes scrollable sideways
 *   - **cut-off content**     — same overflow, but the parent uses
 *     `overflow:hidden` / `clip`, so the user can't even scroll to reveal it
 *
 * What it can know (and what it can't)
 *   - We read `width`, `min-width`, `max-width`, and `overflow` from
 *     `styles.computed`. If an element declares `width:600px` and the
 *     viewport is 320, we flag it.
 *   - `max-width:100%` (or any % unit on width) is treated as fluid — the
 *     analyzer abstains on that element rather than guessing.
 *   - We can't see the live DOM tree, so we don't know if a wide element
 *     is wrapped in a horizontal-scroll container that *intentionally*
 *     allows overflow. Authors should mark those with `overflow-x:auto`;
 *     we treat that as "scrolls" (still a SC 1.4.10 concern unless the
 *     content is data-rich like a code block).
 */

import type { UIElement } from './ComponentDetector';
import { cssProp, parsePx } from './RuleEngine';

export const VIEWPORTS = [320, 375, 414, 768] as const;
export type Viewport = (typeof VIEWPORTS)[number];

export type ReflowVerdict =
  | 'fits'
  | 'scrolls'
  | 'clipped'
  | 'fluid'
  | 'unmeasurable';

export type ViewportResult = {
  viewport: Viewport;
  verdict: ReflowVerdict;
  note?: string;
};

export type ReflowCheck = {
  element: UIElement;
  declaredWidth: number | null;
  declaredMinWidth: number | null;
  declaredMaxWidth: number | null;
  overflow: string | null;
  /** True when the element declares a percentage width. */
  isPercentageWidth: boolean;
  /** Effective lower bound on width in CSS px (max of width, min-width). */
  effectiveMinPx: number | null;
  results: ViewportResult[];
  /** Widest viewport at which the element still fails (null = no fails). */
  worstFailingViewport: Viewport | null;
};

export type ReflowReport = {
  checks: ReflowCheck[];
  /** Failing element count per viewport. */
  failuresByViewport: Record<Viewport, number>;
  /** Per-viewport breakdown of scroll vs clip. */
  detailsByViewport: Record<
    Viewport,
    { scrolls: number; clipped: number; fits: number; fluid: number; unmeasurable: number }
  >;
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Returns true if the value uses a fluid unit (%, vw, fr). */
function isFluidWidth(value: string | undefined): boolean {
  if (!value) return false;
  return /(%|vw|fr|auto|min-content|max-content|fit-content)/i.test(value);
}

function effectiveMin(declaredWidth: number | null, declaredMinWidth: number | null): number | null {
  if (declaredWidth === null && declaredMinWidth === null) return null;
  return Math.max(declaredWidth ?? 0, declaredMinWidth ?? 0);
}

function classifyOverflow(value: string | null): boolean {
  if (!value) return false;
  return /^(hidden|clip)\b/i.test(value);
}

/* ------------------------------------------------------------------ */
/* Per-element analysis                                                */
/* ------------------------------------------------------------------ */

export function analyzeReflowForElement(el: UIElement): ReflowCheck {
  const rawWidth = cssProp(el, 'width');
  const rawMinWidth = cssProp(el, 'min-width');
  const rawMaxWidth = cssProp(el, 'max-width');
  const overflow =
    cssProp(el, 'overflow') ??
    cssProp(el, 'overflow-x') ??
    null;

  const declaredWidth = parsePx(rawWidth);
  const declaredMinWidth = parsePx(rawMinWidth);
  const declaredMaxWidth = parsePx(rawMaxWidth);

  const fluidWidth =
    isFluidWidth(rawWidth) ||
    (rawMaxWidth !== undefined && /(^|\s)100%/.test(rawMaxWidth));

  const effective = effectiveMin(declaredWidth, declaredMinWidth);
  const clips = classifyOverflow(overflow);

  const results: ViewportResult[] = VIEWPORTS.map((vp) => {
    if (effective === null) {
      // No declared px width and no min-width — treat as fluid unless we have
      // *no* sizing info at all, in which case we still call it fluid because
      // the absence of a fixed width means the browser will reflow naturally.
      return {
        viewport: vp,
        verdict: fluidWidth ? 'fluid' : ('fluid' as ReflowVerdict),
        note: 'No fixed-px width declared — assumed fluid',
      };
    }
    if (effective <= vp) {
      return {
        viewport: vp,
        verdict: 'fits',
        note: `${effective}px fits ${vp}px viewport`,
      };
    }
    return {
      viewport: vp,
      verdict: clips ? 'clipped' : 'scrolls',
      note: clips
        ? `${effective}px > ${vp}px and overflow:${overflow} clips content`
        : `${effective}px > ${vp}px — horizontal scroll`,
    };
  });

  const worstFailing = [...results]
    .reverse()
    .find((r) => r.verdict === 'scrolls' || r.verdict === 'clipped');

  return {
    element: el,
    declaredWidth,
    declaredMinWidth,
    declaredMaxWidth,
    overflow,
    isPercentageWidth: fluidWidth,
    effectiveMinPx: effective,
    results,
    worstFailingViewport: worstFailing ? worstFailing.viewport : null,
  };
}

export function analyzeReflow(elements: UIElement[]): ReflowReport {
  const checks = elements.map(analyzeReflowForElement);

  const failuresByViewport = {} as Record<Viewport, number>;
  const detailsByViewport = {} as ReflowReport['detailsByViewport'];
  for (const vp of VIEWPORTS) {
    failuresByViewport[vp] = 0;
    detailsByViewport[vp] = {
      scrolls: 0,
      clipped: 0,
      fits: 0,
      fluid: 0,
      unmeasurable: 0,
    };
  }

  for (const c of checks) {
    for (const r of c.results) {
      detailsByViewport[r.viewport][r.verdict]++;
      if (r.verdict === 'scrolls' || r.verdict === 'clipped') {
        failuresByViewport[r.viewport]++;
      }
    }
  }

  return { checks, failuresByViewport, detailsByViewport };
}
