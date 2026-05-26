/**
 * ContrastChecker
 *
 * Implements the WCAG 2.x luminance/contrast formula plus the bits of CSS
 * color parsing we need to feed it from inline styles and resolved
 * stylesheets:
 *
 *   - hex (#rgb, #rrggbb, with optional alpha)
 *   - rgb()/rgba() (comma and modern "/" syntax)
 *   - hsl()/hsla()
 *   - small set of named colors
 *
 * For each detected text-bearing element we pull `color`,
 * `background-color`, and `opacity` from `styles.computed`. Opacity is
 * applied to the foreground alpha; the result is alpha-composited over the
 * background (and a translucent background gets composited over the page
 * background — body/html — or white as a last resort).
 *
 * Thresholds follow WCAG 1.4.3 (AA) and 1.4.6 (AAA), with the large-text
 * carve-out at ≥18pt regular or ≥14pt bold (≈24px / ≈18.66px when bold).
 */

import type { SourceFile } from './FileParser';
import type { UIElement } from './ComponentDetector';
import { parseCss } from './CssResolver';
import { cssProp, parsePx } from './RuleEngine';

export type RGBA = { r: number; g: number; b: number; a: number };
export type RGB = { r: number; g: number; b: number };

export const WHITE: RGBA = { r: 255, g: 255, b: 255, a: 1 };
export const BLACK: RGBA = { r: 0, g: 0, b: 0, a: 1 };

/* ------------------------------------------------------------------ */
/* Color parsing                                                       */
/* ------------------------------------------------------------------ */

/** Most-used CSS named colors; full list is huge and unnecessary here. */
const NAMED_COLORS: Record<string, string> = {
  transparent: 'rgba(0,0,0,0)',
  currentcolor: 'rgba(0,0,0,1)',
  black: '#000000',
  white: '#ffffff',
  red: '#ff0000',
  green: '#008000',
  blue: '#0000ff',
  yellow: '#ffff00',
  cyan: '#00ffff',
  magenta: '#ff00ff',
  silver: '#c0c0c0',
  gray: '#808080',
  grey: '#808080',
  maroon: '#800000',
  olive: '#808000',
  lime: '#00ff00',
  aqua: '#00ffff',
  teal: '#008080',
  navy: '#000080',
  fuchsia: '#ff00ff',
  purple: '#800080',
  orange: '#ffa500',
  pink: '#ffc0cb',
  rebeccapurple: '#663399',
  slategray: '#708090',
  slategrey: '#708090',
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function parseChannel(token: string): number {
  const s = token.trim();
  if (s.endsWith('%')) return Math.round((parseFloat(s) / 100) * 255);
  return clamp(Math.round(parseFloat(s)), 0, 255);
}

function parseAlpha(token: string): number {
  const s = token.trim();
  if (s.endsWith('%')) return clamp(parseFloat(s) / 100, 0, 1);
  return clamp(parseFloat(s), 0, 1);
}

function parsePercent(token: string): number {
  const s = token.trim();
  if (s.endsWith('%')) return parseFloat(s) / 100;
  return parseFloat(s);
}

function hslToRgb(h: number, s: number, l: number): RGB {
  const hh = (((h % 360) + 360) % 360) / 360;
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const toComp = (t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  return {
    r: Math.round(toComp(hh + 1 / 3) * 255),
    g: Math.round(toComp(hh) * 255),
    b: Math.round(toComp(hh - 1 / 3) * 255),
  };
}

/** Parse any CSS color string we care about. Returns null on failure. */
export function parseColor(value: string | null | undefined): RGBA | null {
  if (!value) return null;
  const raw = value.trim().toLowerCase();
  if (!raw) return null;

  // Named.
  if (raw in NAMED_COLORS) {
    return parseColor(NAMED_COLORS[raw]);
  }

  // Hex.
  if (raw[0] === '#') {
    const hex = raw.slice(1);
    if (/^[0-9a-f]+$/.test(hex)) {
      if (hex.length === 3 || hex.length === 4) {
        const r = parseInt(hex[0] + hex[0], 16);
        const g = parseInt(hex[1] + hex[1], 16);
        const b = parseInt(hex[2] + hex[2], 16);
        const a = hex.length === 4 ? parseInt(hex[3] + hex[3], 16) / 255 : 1;
        return { r, g, b, a };
      }
      if (hex.length === 6 || hex.length === 8) {
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
        return { r, g, b, a };
      }
    }
    return null;
  }

  // Functional notation.
  const fn = /^(rgba?|hsla?)\s*\(\s*(.+?)\s*\)\s*$/.exec(raw);
  if (!fn) return null;
  const name = fn[1];
  const body = fn[2];
  const slashIdx = body.indexOf('/');
  const beforeSlash = slashIdx === -1 ? body : body.slice(0, slashIdx);
  const afterSlash = slashIdx === -1 ? null : body.slice(slashIdx + 1).trim();
  const parts = beforeSlash.split(/[\s,]+/).filter(Boolean);
  if (parts.length < 3) return null;

  let alpha = 1;
  if (afterSlash !== null) alpha = parseAlpha(afterSlash);
  else if (parts.length === 4) alpha = parseAlpha(parts[3]);

  if (name.startsWith('rgb')) {
    return {
      r: parseChannel(parts[0]),
      g: parseChannel(parts[1]),
      b: parseChannel(parts[2]),
      a: alpha,
    };
  }
  // hsl / hsla
  const h = parseFloat(parts[0]);
  const s = parsePercent(parts[1]);
  const l = parsePercent(parts[2]);
  const rgb = hslToRgb(h, s, l);
  return { ...rgb, a: alpha };
}

/** Stringify an RGBA back for swatches. */
export function formatRgba(c: RGBA | RGB): string {
  if ('a' in c && c.a < 1) {
    return `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a.toFixed(2)})`;
  }
  return `rgb(${c.r}, ${c.g}, ${c.b})`;
}

/* ------------------------------------------------------------------ */
/* Contrast math                                                       */
/* ------------------------------------------------------------------ */

/** sRGB → relative luminance per WCAG. Takes 0-255 channels. */
export function relativeLuminance({ r, g, b }: RGB): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Alpha-composite a translucent layer over an opaque background. */
export function composite(over: RGBA, under: RGB): RGB {
  const a = clamp(over.a, 0, 1);
  return {
    r: Math.round(over.r * a + under.r * (1 - a)),
    g: Math.round(over.g * a + under.g * (1 - a)),
    b: Math.round(over.b * a + under.b * (1 - a)),
  };
}

/**
 * WCAG contrast ratio between a foreground and background. Both may carry
 * alpha; `elementOpacity` is the inherited `opacity` property which clamps
 * the foreground alpha further. Background alpha < 1 is composited over
 * `pageBg` (defaults to white) to keep the math single-step.
 */
export function calculateContrast(
  fg: RGBA,
  bg: RGBA,
  elementOpacity = 1,
  pageBg: RGB = { r: 255, g: 255, b: 255 },
): number {
  const baseBg: RGB = bg.a >= 1 ? { r: bg.r, g: bg.g, b: bg.b } : composite(bg, pageBg);
  const effectiveFg: RGBA = { ...fg, a: Math.min(fg.a, clamp(elementOpacity, 0, 1)) };
  const finalFg = composite(effectiveFg, baseBg);
  const L1 = relativeLuminance(finalFg);
  const L2 = relativeLuminance(baseBg);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

/* ------------------------------------------------------------------ */
/* Per-element analysis                                                */
/* ------------------------------------------------------------------ */

export type WcagLevel = 'AA' | 'AAA';
export type Verdict = 'pass' | 'fail';

export type ContrastCheck = {
  element: UIElement;
  fgRaw: string | null;
  bgRaw: string | null;
  fgEffective: RGB | null;
  bg: RGB | null;
  ratio: number | null;
  opacity: number;
  fontSizePx: number | null;
  fontWeight: number | null;
  isLargeText: boolean;
  required: { aa: number; aaa: number };
  passes: { aa: Verdict; aaa: Verdict };
  /** Why we couldn't compute (e.g., color unresolved). */
  skipped?: string;
};

export type ContrastReport = {
  pageBackground: RGB;
  checks: ContrastCheck[];
  totals: {
    checked: number;
    skipped: number;
    aaPassing: number;
    aaFailing: number;
    aaaPassing: number;
    aaaFailing: number;
  };
};

const FONT_SIZE_LARGE_PX = 24; // ~18pt
const FONT_SIZE_LARGE_BOLD_PX = 18.66; // ~14pt
const BOLD_WEIGHT = 700;

function isLargeTextFromStyle(fontSize: number | null, fontWeight: number | null): boolean {
  if (fontSize === null) return false;
  if (fontSize >= FONT_SIZE_LARGE_PX) return true;
  if (
    fontWeight !== null &&
    fontWeight >= BOLD_WEIGHT &&
    fontSize >= FONT_SIZE_LARGE_BOLD_PX
  ) {
    return true;
  }
  return false;
}

/** Parse the font-weight CSS value (named or numeric) into a number. */
function parseFontWeight(value: string | undefined): number | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (v === 'normal') return 400;
  if (v === 'bold') return 700;
  if (v === 'lighter') return 300;
  if (v === 'bolder') return 600;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * Try to find the page-level background color by scanning loaded CSS for
 * `body`, `html`, or `:root` rules. Falls back to white.
 */
export function findPageBackground(files: SourceFile[]): RGB {
  for (const f of files) {
    if (f.ext !== 'css') continue;
    for (const rule of parseCss(f.content, f.path)) {
      const sel = rule.selector.toLowerCase().trim();
      if (sel === 'body' || sel === 'html' || sel === ':root') {
        const raw =
          rule.declarations['background-color'] ??
          rule.declarations['background'];
        if (!raw) continue;
        const parsed = parseColor(raw);
        if (parsed) {
          return parsed.a >= 1
            ? { r: parsed.r, g: parsed.g, b: parsed.b }
            : composite(parsed, { r: 255, g: 255, b: 255 });
        }
      }
    }
  }
  return { r: 255, g: 255, b: 255 };
}

function thresholdsFor(isLargeText: boolean): { aa: number; aaa: number } {
  return isLargeText ? { aa: 3, aaa: 4.5 } : { aa: 4.5, aaa: 7 };
}

export function analyzeContrast(
  elements: UIElement[],
  files: SourceFile[],
): ContrastReport {
  const pageBackground = findPageBackground(files);
  const checks: ContrastCheck[] = [];

  for (const el of elements) {
    // Skip elements with no visible text — we have no glyphs to measure.
    if (!el.text) continue;

    const fgRaw = cssProp(el, 'color') ?? null;
    const bgRaw =
      cssProp(el, 'background-color') ??
      cssProp(el, 'background') ??
      null;
    const opacityRaw = cssProp(el, 'opacity');
    const opacity = opacityRaw ? clamp(parseFloat(opacityRaw), 0, 1) : 1;
    const fontSizePx = parsePx(cssProp(el, 'font-size'));
    const fontWeight = parseFontWeight(cssProp(el, 'font-weight'));
    const isLargeText = isLargeTextFromStyle(fontSizePx, fontWeight);
    const required = thresholdsFor(isLargeText);

    if (!fgRaw) {
      checks.push({
        element: el,
        fgRaw,
        bgRaw,
        fgEffective: null,
        bg: null,
        ratio: null,
        opacity,
        fontSizePx,
        fontWeight,
        isLargeText,
        required,
        passes: { aa: 'fail', aaa: 'fail' },
        skipped: 'No color declared',
      });
      continue;
    }

    const fg = parseColor(fgRaw);
    const bg = bgRaw ? parseColor(bgRaw) : { ...pageBackground, a: 1 };
    if (!fg || !bg) {
      checks.push({
        element: el,
        fgRaw,
        bgRaw,
        fgEffective: null,
        bg: null,
        ratio: null,
        opacity,
        fontSizePx,
        fontWeight,
        isLargeText,
        required,
        passes: { aa: 'fail', aaa: 'fail' },
        skipped: 'Unrecognized color syntax',
      });
      continue;
    }

    const ratio = calculateContrast(fg, bg, opacity, pageBackground);
    const finalBg: RGB =
      bg.a >= 1 ? { r: bg.r, g: bg.g, b: bg.b } : composite(bg, pageBackground);
    const finalFg = composite({ ...fg, a: Math.min(fg.a, opacity) }, finalBg);

    checks.push({
      element: el,
      fgRaw,
      bgRaw,
      fgEffective: finalFg,
      bg: finalBg,
      ratio,
      opacity,
      fontSizePx,
      fontWeight,
      isLargeText,
      required,
      passes: {
        aa: ratio + 1e-6 >= required.aa ? 'pass' : 'fail',
        aaa: ratio + 1e-6 >= required.aaa ? 'pass' : 'fail',
      },
    });
  }

  const totals = {
    checked: 0,
    skipped: 0,
    aaPassing: 0,
    aaFailing: 0,
    aaaPassing: 0,
    aaaFailing: 0,
  };
  for (const c of checks) {
    if (c.skipped) {
      totals.skipped++;
      continue;
    }
    totals.checked++;
    if (c.passes.aa === 'pass') totals.aaPassing++;
    else totals.aaFailing++;
    if (c.passes.aaa === 'pass') totals.aaaPassing++;
    else totals.aaaFailing++;
  }

  return { pageBackground, checks, totals };
}
