/**
 * DynamicTextSimulator
 *
 * Simulates iOS Dynamic Type / Android Font Scale across five steps
 * (100%, 125%, 150%, 175%, 200%) and predicts whether each scaled text
 * will fit its declared container.
 *
 * Methodology
 *   - Pull base `font-size`, `font-family`, `font-weight`, `line-height`,
 *     `width`/`max-width`, `height`/`max-height`, `white-space`,
 *     `text-overflow`, and `overflow` from the element's resolved CSS.
 *   - Measure each scaled text using a hidden `<canvas>` 2D context — this
 *     mirrors what the browser does for inline text within ±1 px.
 *   - For wrapping text, greedily compute the line count for the given
 *     container width; multiply by line-height for the rendered height.
 *   - Compare against constraints and emit one of:
 *       pass · overflow · clipped · truncated · unmeasurable
 *
 * `unmeasurable` is returned when we don't have enough CSS to predict (no
 * declared width / font-size). The UI surfaces this so users know which
 * components need explicit sizing before the simulator can verify them.
 */

import type { UIElement } from './ComponentDetector';
import { cssProp, parsePx } from './RuleEngine';

export const TEXT_SCALES: readonly number[] = [1.0, 1.25, 1.5, 1.75, 2.0];

export type SimulationVerdict =
  | 'pass'
  | 'overflow'
  | 'clipped'
  | 'truncated'
  | 'unmeasurable';

export type ScaleResult = {
  scale: number;
  /** Pixel font-size after scaling. */
  fontPx: number;
  /** Measured text width at this font-size, in px. Null when unmeasurable. */
  textWidth: number | null;
  /** Lines required at the current container width. Null when unmeasurable. */
  lines: number | null;
  /** Computed rendered height (lines × line-height). */
  renderedHeight: number | null;
  verdict: SimulationVerdict;
  note?: string;
};

export type DynamicTextCheck = {
  element: UIElement;
  baseFontPx: number | null;
  lineHeightPx: number | null;
  containerWidth: number | null;
  containerHeight: number | null;
  whiteSpace: string | null;
  textOverflow: string | null;
  overflow: string | null;
  results: ScaleResult[];
  /** Lowest scale at which a problem first appears (null when always pass). */
  firstFailureScale: number | null;
};

export type DynamicTextReport = {
  checks: DynamicTextCheck[];
  /** Failing element count per scale, plus the "unmeasurable" count. */
  failuresByScale: Record<string, number>;
  unmeasurable: number;
};

/* ------------------------------------------------------------------ */
/* Text measurement (canvas)                                           */
/* ------------------------------------------------------------------ */

let cachedCanvas: HTMLCanvasElement | null = null;
function ctx2d(): CanvasRenderingContext2D {
  if (typeof document === 'undefined') {
    throw new Error('DynamicTextSimulator requires a browser environment');
  }
  if (!cachedCanvas) cachedCanvas = document.createElement('canvas');
  return cachedCanvas.getContext('2d')!;
}

function fontShorthand(fontPx: number, weight: string, family: string): string {
  // CSS font shorthand: `<style> <weight> <size>/<line-height> <family>`.
  return `${weight} ${fontPx}px ${family}`;
}

function measureWidth(text: string, font: string): number {
  const c = ctx2d();
  c.font = font;
  return c.measureText(text).width;
}

/** Greedy word-wrap line count for a given container width. */
function countWrappedLines(text: string, font: string, containerWidth: number): number {
  if (containerWidth <= 0) return 1;
  const c = ctx2d();
  c.font = font;
  // Preserve hard breaks first so a "\n" doesn't get glued.
  let total = 0;
  for (const para of text.split(/\r?\n/)) {
    const words = para.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      total += 1;
      continue;
    }
    let line = '';
    let lines = 1;
    for (const word of words) {
      const trial = line ? `${line} ${word}` : word;
      if (c.measureText(trial).width > containerWidth) {
        // Single word that's wider than the container still counts as one line —
        // the browser would overflow rather than infinitely wrap.
        if (!line) {
          lines += 0;
          line = '';
        } else {
          lines += 1;
          line = word;
        }
      } else {
        line = trial;
      }
    }
    total += lines;
  }
  return Math.max(1, total);
}

/* ------------------------------------------------------------------ */
/* Container + font resolution                                         */
/* ------------------------------------------------------------------ */

function parseLineHeight(raw: string | undefined, fontPx: number): number {
  if (!raw) return fontPx * 1.2;
  const s = raw.trim();
  if (s === 'normal') return fontPx * 1.2;
  const px = parsePx(s);
  if (px !== null) return px;
  // Unitless multiplier (e.g. `1.5`).
  const n = parseFloat(s);
  if (Number.isFinite(n)) return n * fontPx;
  return fontPx * 1.2;
}

function resolveFontFamily(el: UIElement): string {
  const family = cssProp(el, 'font-family');
  if (!family) return 'system-ui, sans-serif';
  // Strip surrounding whitespace + quotes for the canvas font string.
  return family.replace(/['"]/g, '').trim();
}

function resolveContainerWidth(el: UIElement): number | null {
  return parsePx(cssProp(el, 'width')) ?? parsePx(cssProp(el, 'max-width'));
}

function resolveContainerHeight(el: UIElement): number | null {
  return parsePx(cssProp(el, 'height')) ?? parsePx(cssProp(el, 'max-height'));
}

/* ------------------------------------------------------------------ */
/* Per-element simulation                                              */
/* ------------------------------------------------------------------ */

function verdictAtScale(args: {
  text: string;
  fontPx: number;
  family: string;
  weight: string;
  lineHeightBasePx: number;
  scale: number;
  containerWidth: number | null;
  containerHeight: number | null;
  whiteSpace: string | null;
  textOverflow: string | null;
  overflow: string | null;
}): ScaleResult {
  const {
    text,
    fontPx,
    family,
    weight,
    lineHeightBasePx,
    scale,
    containerWidth,
    containerHeight,
    whiteSpace,
    textOverflow,
    overflow,
  } = args;

  const scaledFont = +(fontPx * scale).toFixed(2);
  if (containerWidth === null) {
    return {
      scale,
      fontPx: scaledFont,
      textWidth: null,
      lines: null,
      renderedHeight: null,
      verdict: 'unmeasurable',
      note: 'No container width declared',
    };
  }

  const font = fontShorthand(scaledFont, weight, family);
  const scaledLineHeight = lineHeightBasePx * scale;
  const isNowrap = whiteSpace === 'nowrap' || whiteSpace === 'pre';
  const isEllipsis = textOverflow === 'ellipsis';
  const overflowsHidden = overflow === 'hidden' || overflow === 'clip';

  if (isNowrap) {
    const textWidth = measureWidth(text, font);
    if (textWidth <= containerWidth) {
      return {
        scale,
        fontPx: scaledFont,
        textWidth,
        lines: 1,
        renderedHeight: scaledLineHeight,
        verdict: 'pass',
      };
    }
    if (isEllipsis) {
      return {
        scale,
        fontPx: scaledFont,
        textWidth,
        lines: 1,
        renderedHeight: scaledLineHeight,
        verdict: 'truncated',
        note: `${Math.round(textWidth)}px > ${containerWidth}px — text-overflow:ellipsis trims`,
      };
    }
    if (overflowsHidden) {
      return {
        scale,
        fontPx: scaledFont,
        textWidth,
        lines: 1,
        renderedHeight: scaledLineHeight,
        verdict: 'clipped',
        note: `${Math.round(textWidth)}px > ${containerWidth}px — overflow:hidden clips`,
      };
    }
    return {
      scale,
      fontPx: scaledFont,
      textWidth,
      lines: 1,
      renderedHeight: scaledLineHeight,
      verdict: 'overflow',
      note: `${Math.round(textWidth)}px > ${containerWidth}px — text spills horizontally`,
    };
  }

  const lines = countWrappedLines(text, font, containerWidth);
  const renderedHeight = lines * scaledLineHeight;
  const textWidth = measureWidth(text, font); // single-line equivalent for context

  if (containerHeight === null) {
    return {
      scale,
      fontPx: scaledFont,
      textWidth,
      lines,
      renderedHeight,
      verdict: 'pass',
      note: 'No height constraint — wraps freely',
    };
  }

  if (renderedHeight <= containerHeight) {
    return {
      scale,
      fontPx: scaledFont,
      textWidth,
      lines,
      renderedHeight,
      verdict: 'pass',
    };
  }

  if (overflowsHidden) {
    return {
      scale,
      fontPx: scaledFont,
      textWidth,
      lines,
      renderedHeight,
      verdict: 'clipped',
      note: `${lines} line${lines === 1 ? '' : 's'} → ${Math.round(renderedHeight)}px > ${containerHeight}px — clipped`,
    };
  }
  return {
    scale,
    fontPx: scaledFont,
    textWidth,
    lines,
    renderedHeight,
    verdict: 'overflow',
    note: `${lines} line${lines === 1 ? '' : 's'} → ${Math.round(renderedHeight)}px > ${containerHeight}px — pushes layout`,
  };
}

export function simulateElement(el: UIElement): DynamicTextCheck {
  const baseFontPx = parsePx(cssProp(el, 'font-size'));
  const family = resolveFontFamily(el);
  const weight = cssProp(el, 'font-weight') ?? '400';
  const containerWidth = resolveContainerWidth(el);
  const containerHeight = resolveContainerHeight(el);
  const whiteSpace = (cssProp(el, 'white-space') ?? null) as string | null;
  const textOverflow = (cssProp(el, 'text-overflow') ?? null) as string | null;
  const overflow =
    cssProp(el, 'overflow') ??
    cssProp(el, 'overflow-x') ??
    cssProp(el, 'overflow-y') ??
    null;
  const lineHeightBase =
    baseFontPx === null ? null : parseLineHeight(cssProp(el, 'line-height'), baseFontPx);

  if (baseFontPx === null || !el.text) {
    return {
      element: el,
      baseFontPx,
      lineHeightPx: lineHeightBase,
      containerWidth,
      containerHeight,
      whiteSpace,
      textOverflow,
      overflow,
      results: TEXT_SCALES.map((s) => ({
        scale: s,
        fontPx: 0,
        textWidth: null,
        lines: null,
        renderedHeight: null,
        verdict: 'unmeasurable',
        note: !el.text ? 'No visible text' : 'No font-size declared',
      })),
      firstFailureScale: null,
    };
  }

  const results = TEXT_SCALES.map((scale) =>
    verdictAtScale({
      text: el.text,
      fontPx: baseFontPx,
      family,
      weight,
      lineHeightBasePx: lineHeightBase!,
      scale,
      containerWidth,
      containerHeight,
      whiteSpace,
      textOverflow,
      overflow,
    }),
  );

  const firstFail = results.find(
    (r) => r.verdict !== 'pass' && r.verdict !== 'unmeasurable',
  );
  return {
    element: el,
    baseFontPx,
    lineHeightPx: lineHeightBase,
    containerWidth,
    containerHeight,
    whiteSpace,
    textOverflow,
    overflow,
    results,
    firstFailureScale: firstFail?.scale ?? null,
  };
}

export function simulateDynamicText(elements: UIElement[]): DynamicTextReport {
  const checks = elements
    .filter((el) => el.text && el.text.trim().length > 0)
    .map(simulateElement);

  const failuresByScale: Record<string, number> = {};
  for (const s of TEXT_SCALES) failuresByScale[String(s)] = 0;
  let unmeasurable = 0;

  for (const c of checks) {
    const anyUnmeasured = c.results.every((r) => r.verdict === 'unmeasurable');
    if (anyUnmeasured) unmeasurable++;
    for (const r of c.results) {
      if (r.verdict !== 'pass' && r.verdict !== 'unmeasurable') {
        failuresByScale[String(r.scale)]++;
      }
    }
  }

  return { checks, failuresByScale, unmeasurable };
}
