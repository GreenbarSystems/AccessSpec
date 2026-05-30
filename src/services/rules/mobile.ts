/**
 * Mobile-usability rules.
 *
 * These rely on `styles.computed` populated by CssResolver. If a value isn't
 * declared in any loaded stylesheet, the rule abstains rather than guess —
 * better to miss a real failure than to drown the dashboard in false noise.
 *
 * Thresholds:
 *   - WCAG 2.2 SC 2.5.8 (Target Size Minimum): 24×24 CSS px
 *   - Apple HIG / Material: 44×44 CSS px comfortable target
 *   - WCAG 2.2 SC 1.4.4 (Resize Text): text should remain readable; we flag
 *     hard-coded px font sizes that block user scaling.
 */

import type { UIElement } from '../ComponentDetector';
import { cssProp, isInteractive, parsePx, type Rule } from '../RuleEngine';

const TARGET_MIN_PX = 24;
const TARGET_COMFORT_PX = 44;
const FONT_CRITICAL_PX = 11;
const FONT_MIN_PX = 14;

/**
 * Pick the most authoritative px value for vertical/horizontal extent:
 * `min-height` / `min-width` beats `height` / `width`; either beats nothing.
 */
function effectivePxSize(el: UIElement, dim: 'height' | 'width'): number | null {
  const minProp = dim === 'height' ? 'min-height' : 'min-width';
  return parsePx(cssProp(el, minProp)) ?? parsePx(cssProp(el, dim));
}

export const mobileRules: Rule[] = [
  {
    id: 'MOB-TOUCH-MIN',
    category: 'mobile',
    severity: 'critical',
    description: 'Touch targets below 24 × 24 CSS px fail WCAG 2.2 minimum.',
    spec: 'WCAG 2.2 · 2.5.8 Target Size (Minimum)',
    suggestedFix: {
      summary:
        'Increase the control to at least 24 × 24 CSS px, or add spacing so a 24px circle around it does not intersect another target.',
      example: {
        bad: '.icon-btn { width: 16px; height: 16px; }',
        good: '.icon-btn { min-width: 24px; min-height: 24px; padding: 4px; }',
        language: 'css',
      },
    },
    check: (el) => {
      if (!isInteractive(el) || el.attrs.type === 'hidden') return null;
      const h = effectivePxSize(el, 'height');
      const w = effectivePxSize(el, 'width');
      // Either dim measurable AND below 24 → fail.
      const failingH = h !== null && h < TARGET_MIN_PX;
      const failingW = w !== null && w < TARGET_MIN_PX;
      if (!failingH && !failingW) return null;
      return {
        message: `Tap target is only ${w ?? '?'}×${h ?? '?'}px — fingers need at least 24×24 to hit it reliably.`,
        context: { height: h ?? '?', width: w ?? '?' },
      };
    },
  },
  {
    id: 'MOB-TOUCH-COMFORT',
    category: 'mobile',
    severity: 'warning',
    description: 'Mobile platforms recommend 44 × 44 CSS px comfortable targets.',
    spec: 'Apple HIG · Material 3 · Touch targets',
    suggestedFix: {
      summary:
        'Bump min-width / min-height to 44px (iOS) or 48px (Material) for comfortable thumb hits.',
      example: {
        bad: '.btn { width: 32px; height: 32px; }',
        good: '.btn { min-width: 44px; min-height: 44px; padding: 0 12px; }',
        language: 'css',
      },
    },
    check: (el) => {
      if (!isInteractive(el) || el.attrs.type === 'hidden') return null;
      const h = effectivePxSize(el, 'height');
      const w = effectivePxSize(el, 'width');
      // Only fire if measurable and clearly in the comfort gap (above minimum, below comfort).
      const hOk = h === null || h >= TARGET_COMFORT_PX;
      const wOk = w === null || w >= TARGET_COMFORT_PX;
      if (hOk && wOk) return null;
      // Skip if any dim is already flagged critical (avoid double-counting).
      if ((h !== null && h < TARGET_MIN_PX) || (w !== null && w < TARGET_MIN_PX)) {
        return null;
      }
      return {
        message: `Tap target is ${w ?? '?'}×${h ?? '?'}px — bump to 44×44 for comfortable thumb taps (Apple HIG) or 48×48 (Material).`,
        context: { height: h ?? '?', width: w ?? '?' },
      };
    },
  },
  {
    id: 'MOB-FONT-CRITICAL',
    category: 'mobile',
    severity: 'critical',
    description: `Body text below ${FONT_CRITICAL_PX}px is unreadable for many users.`,
    spec: 'WCAG 2.2 · 1.4.4 Resize Text',
    suggestedFix: {
      summary:
        'Raise body font-size to at least 14px (16px preferred) and prefer rem so the value scales.',
      example: {
        bad: 'body { font-size: 10px; }',
        good: 'body { font-size: 1rem; /* 16px at default root */ }',
        language: 'css',
      },
    },
    check: (el) => {
      const fs = parsePx(cssProp(el, 'font-size'));
      if (fs === null) return null;
      if (fs >= FONT_CRITICAL_PX) return null;
      return {
        message: `Text is ${fs}px — too small to read on a phone. Aim for at least 14px.`,
        context: { fontSize: fs },
      };
    },
  },
  {
    id: 'MOB-FONT-MIN',
    category: 'mobile',
    severity: 'warning',
    description: `Body text should be at least ${FONT_MIN_PX}px on mobile.`,
    spec: 'WCAG 2.2 · 1.4.4 Resize Text',
    suggestedFix: {
      summary:
        'Mobile body copy reads best at ≥ 14px. Reserve smaller sizes for captions / labels.',
      example: {
        bad: '.body-text { font-size: 12px; }',
        good: '.body-text { font-size: 0.875rem; /* 14px */ }',
        language: 'css',
      },
    },
    check: (el) => {
      const fs = parsePx(cssProp(el, 'font-size'));
      if (fs === null) return null;
      if (fs >= FONT_MIN_PX || fs < FONT_CRITICAL_PX) return null;
      return {
        message: `Body text is ${fs}px — readers on phones tend to struggle below ${FONT_MIN_PX}px.`,
        context: { fontSize: fs },
      };
    },
  },
  {
    id: 'MOB-FONT-SCALABLE',
    category: 'mobile',
    severity: 'info',
    description:
      'Use rem / em so users can scale the page; hard-coded px disables Dynamic Type.',
    spec: 'WCAG 2.2 · 1.4.4 Resize Text',
    suggestedFix: {
      summary:
        'Switch px font-sizes to rem so iOS Dynamic Type and Android Font Scale apply.',
      example: {
        bad: 'h1 { font-size: 24px; }',
        good: 'h1 { font-size: 1.5rem; }',
        language: 'css',
      },
    },
    check: (el) => {
      const raw = cssProp(el, 'font-size');
      if (!raw) return null;
      if (!/px\s*$/.test(raw.trim())) return null;
      return {
        message: `Text uses ${raw} so the user's font-size setting won't apply — switch to rem or em.`,
      };
    },
  },
];
