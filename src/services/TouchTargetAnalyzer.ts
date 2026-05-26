/**
 * TouchTargetAnalyzer
 *
 * Per-element width/height/spacing measurement and pass/fail verdicts against
 * three touch-target standards:
 *
 *   - WCAG 2.2 SC 2.5.8 (Target Size Minimum): 24 × 24 CSS px,
 *     with a "spacing exception" — undersized targets pass if a 24 px
 *     diameter circle centered on each one wouldn't intersect another.
 *   - Apple HIG: 44 × 44 pt comfortable tap target (no exception).
 *   - Material 3: 48 × 48 dp comfortable touch target, 8 dp recommended
 *     spacing between adjacent targets.
 *
 * Sources for measurements:
 *   - `width` ← computed `min-width` ?? `width`
 *   - `height` ← computed `min-height` ?? `height`
 *   - `spacing` ← computed `margin` / `margin-right` / `margin-bottom`
 *
 * When a value can't be resolved from the loaded stylesheets the analyzer
 * abstains for that element (no false fails). The UI surfaces "unmeasurable"
 * as a distinct state so you know which gaps need styling work.
 */

import type { UIElement } from './ComponentDetector';
import { cssProp, isInteractive, parsePx } from './RuleEngine';

export type StandardId = 'wcag' | 'apple' | 'android';

export const STANDARDS: readonly StandardId[] = ['wcag', 'apple', 'android'] as const;

export type StandardDef = {
  id: StandardId;
  label: string;
  spec: string;
  minWidth: number;
  minHeight: number;
  /** Minimum spacing between adjacent targets (Material only). */
  minSpacing?: number;
  /** Honor the WCAG 2.5.8 "circle does not intersect" exception. */
  honorsSpacingException: boolean;
};

export const STANDARD_DEFS: Record<StandardId, StandardDef> = {
  wcag: {
    id: 'wcag',
    label: 'WCAG 2.2',
    spec: 'SC 2.5.8 Target Size (Minimum)',
    minWidth: 24,
    minHeight: 24,
    honorsSpacingException: true,
  },
  apple: {
    id: 'apple',
    label: 'Apple HIG',
    spec: 'Comfortable tap target',
    minWidth: 44,
    minHeight: 44,
    honorsSpacingException: false,
  },
  android: {
    id: 'android',
    label: 'Material 3',
    spec: 'Touch target · 8 dp spacing',
    minWidth: 48,
    minHeight: 48,
    minSpacing: 8,
    honorsSpacingException: false,
  },
};

export type VerdictStatus = 'pass' | 'fail' | 'unmeasurable';

export type Verdict = {
  standard: StandardId;
  status: VerdictStatus;
  message: string;
};

export type TouchTargetMeasurement = {
  element: UIElement;
  width: number | null;
  height: number | null;
  spacingTop: number | null;
  spacingRight: number | null;
  spacingBottom: number | null;
  spacingLeft: number | null;
  /** Min spacing across all four sides, used by WCAG exception check. */
  minSpacing: number | null;
  verdicts: Record<StandardId, Verdict>;
  /** True if any standard returned `fail`. */
  hasViolation: boolean;
  /** True if every standard was unmeasurable (no CSS dimensions). */
  fullyUnmeasured: boolean;
};

export type TouchTargetReport = {
  measurements: TouchTargetMeasurement[];
  totalsByStandard: Record<
    StandardId,
    { measured: number; failing: number; unmeasured: number }
  >;
  totalInteractive: number;
};

/* ------------------------------------------------------------------ */
/* CSS parsing helpers                                                 */
/* ------------------------------------------------------------------ */

/** Parse a 1–4 part box shorthand (`margin: 8px 12px`) into TRBL. */
function parseBoxShorthand(value: string | undefined): {
  top: number | null;
  right: number | null;
  bottom: number | null;
  left: number | null;
} {
  if (!value) return { top: null, right: null, bottom: null, left: null };
  const parts = value
    .trim()
    .split(/\s+/)
    .map((p) => parsePx(p));
  switch (parts.length) {
    case 1:
      return { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] };
    case 2:
      return { top: parts[0], right: parts[1], bottom: parts[0], left: parts[1] };
    case 3:
      return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[1] };
    default:
      return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] };
  }
}

function measureDimension(
  el: UIElement,
  dim: 'width' | 'height',
): number | null {
  const minProp = dim === 'width' ? 'min-width' : 'min-height';
  return parsePx(cssProp(el, minProp)) ?? parsePx(cssProp(el, dim));
}

/**
 * Resolve the four margins for an element. Individual-side properties win
 * over the shorthand if both are declared (mirrors CSS cascade).
 */
function measureSpacing(el: UIElement): {
  top: number | null;
  right: number | null;
  bottom: number | null;
  left: number | null;
} {
  const shorthand = parseBoxShorthand(cssProp(el, 'margin'));
  return {
    top: parsePx(cssProp(el, 'margin-top')) ?? shorthand.top,
    right: parsePx(cssProp(el, 'margin-right')) ?? shorthand.right,
    bottom: parsePx(cssProp(el, 'margin-bottom')) ?? shorthand.bottom,
    left: parsePx(cssProp(el, 'margin-left')) ?? shorthand.left,
  };
}

/* ------------------------------------------------------------------ */
/* Verdict logic                                                       */
/* ------------------------------------------------------------------ */

function verdictFor(
  std: StandardDef,
  width: number | null,
  height: number | null,
  minSpacing: number | null,
): Verdict {
  if (width === null && height === null) {
    return {
      standard: std.id,
      status: 'unmeasurable',
      message: 'No CSS width / height declared',
    };
  }

  const widthFails = width !== null && width < std.minWidth;
  const heightFails = height !== null && height < std.minHeight;
  const spacingFails =
    std.minSpacing !== undefined &&
    minSpacing !== null &&
    minSpacing < std.minSpacing;

  if (!widthFails && !heightFails && !spacingFails) {
    return {
      standard: std.id,
      status: 'pass',
      message: `Meets ${std.minWidth}×${std.minHeight}px minimum`,
    };
  }

  // WCAG spacing exception: an undersized target passes if every side has at
  // least (24 - dim) / 2 px of clear margin so a 24px circle wouldn't
  // intersect another target. Approximated from declared margins.
  if (std.honorsSpacingException && minSpacing !== null) {
    const requiredW = width !== null ? Math.max(0, (std.minWidth - width) / 2) : 0;
    const requiredH =
      height !== null ? Math.max(0, (std.minHeight - height) / 2) : 0;
    const requiredSpacing = Math.max(requiredW, requiredH);
    if (minSpacing >= requiredSpacing) {
      return {
        standard: std.id,
        status: 'pass',
        message: `${width ?? '?'}×${height ?? '?'}px — passes via spacing exception (${minSpacing}px margin)`,
      };
    }
  }

  const parts: string[] = [];
  if (widthFails) parts.push(`width ${width}px < ${std.minWidth}px`);
  if (heightFails) parts.push(`height ${height}px < ${std.minHeight}px`);
  if (spacingFails) parts.push(`spacing ${minSpacing}px < ${std.minSpacing}px`);
  return {
    standard: std.id,
    status: 'fail',
    message: parts.join(', '),
  };
}

/* ------------------------------------------------------------------ */
/* Public entry points                                                 */
/* ------------------------------------------------------------------ */

export function measureElement(el: UIElement): TouchTargetMeasurement {
  const width = measureDimension(el, 'width');
  const height = measureDimension(el, 'height');
  const spacing = measureSpacing(el);
  const sides = [spacing.top, spacing.right, spacing.bottom, spacing.left].filter(
    (v): v is number => v !== null,
  );
  const minSpacing = sides.length ? Math.min(...sides) : null;

  const verdicts = {
    wcag: verdictFor(STANDARD_DEFS.wcag, width, height, minSpacing),
    apple: verdictFor(STANDARD_DEFS.apple, width, height, minSpacing),
    android: verdictFor(STANDARD_DEFS.android, width, height, minSpacing),
  };

  const hasViolation = Object.values(verdicts).some((v) => v.status === 'fail');
  const fullyUnmeasured = Object.values(verdicts).every(
    (v) => v.status === 'unmeasurable',
  );

  return {
    element: el,
    width,
    height,
    spacingTop: spacing.top,
    spacingRight: spacing.right,
    spacingBottom: spacing.bottom,
    spacingLeft: spacing.left,
    minSpacing,
    verdicts,
    hasViolation,
    fullyUnmeasured,
  };
}

export function analyzeTouchTargets(elements: UIElement[]): TouchTargetReport {
  const interactive = elements.filter(
    (e) => isInteractive(e) && e.attrs.type !== 'hidden',
  );

  const measurements = interactive.map(measureElement);

  const totalsByStandard = {} as TouchTargetReport['totalsByStandard'];
  for (const s of STANDARDS) {
    totalsByStandard[s] = { measured: 0, failing: 0, unmeasured: 0 };
    for (const m of measurements) {
      const v = m.verdicts[s];
      if (v.status === 'unmeasurable') totalsByStandard[s].unmeasured++;
      else {
        totalsByStandard[s].measured++;
        if (v.status === 'fail') totalsByStandard[s].failing++;
      }
    }
  }

  return {
    measurements,
    totalsByStandard,
    totalInteractive: interactive.length,
  };
}
