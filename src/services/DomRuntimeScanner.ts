/**
 * DomRuntimeScanner
 *
 * Walks a live iframe document and runs accessibility audits using values
 * the browser *actually computed* — bypassing every assumption the static
 * pipeline has to make about default fonts, cascade order, parent
 * backgrounds, or whether a given declaration was even loaded.
 *
 * Inputs : a `Document` from a same-origin iframe
 * Outputs: a `RuntimeReport` with element/interactive counts, findings list,
 *          and per-severity / per-category tallies.
 *
 * Each finding carries a `snapshot` of the element's runtime state
 * (bounding rect, captured computed styles, ARIA attributes) so the UI can
 * show the evidence inline without re-querying the iframe later.
 *
 * Caveats
 *   - Only same-origin iframes work (parent must widen the sandbox).
 *   - `getComputedStyle` is honest about the *rendered* values, but it can't
 *     see :hover / :focus states unless those are currently active.
 */

import {
  calculateContrast,
  composite,
  parseColor,
  type RGB,
} from './ContrastChecker';

export type RuntimeSeverity = 'critical' | 'warning' | 'info';
export type RuntimeCategory = 'touch' | 'a11y' | 'contrast' | 'visibility' | 'text';

export const RUNTIME_SEVERITIES: readonly RuntimeSeverity[] = [
  'critical',
  'warning',
  'info',
];

export const RUNTIME_CATEGORIES: readonly RuntimeCategory[] = [
  'touch',
  'a11y',
  'contrast',
  'visibility',
  'text',
];

export type RuntimeFinding = {
  id: string;
  ruleId: string;
  severity: RuntimeSeverity;
  category: RuntimeCategory;
  message: string;
  selector: string;
  tagName: string;
  text: string;
  snapshot: {
    boundingRect: { x: number; y: number; width: number; height: number };
    computed: Record<string, string>;
    aria: Record<string, string>;
  };
};

export type RuntimeReport = {
  scannedAt: number;
  elementCount: number;
  interactiveCount: number;
  findings: RuntimeFinding[];
  countsBySeverity: Record<RuntimeSeverity, number>;
  countsByCategory: Record<RuntimeCategory, number>;
};

/* ------------------------------------------------------------------ */
/* Capture helpers                                                     */
/* ------------------------------------------------------------------ */

const CAPTURED_STYLE_PROPS = [
  'color',
  'background-color',
  'font-size',
  'font-weight',
  'line-height',
  'width',
  'height',
  'min-width',
  'min-height',
  'padding',
  'margin',
  'display',
  'position',
  'visibility',
  'opacity',
  'overflow',
  'pointer-events',
] as const;

const ARIA_PROPS_OF_INTEREST = [
  'role',
  'aria-label',
  'aria-labelledby',
  'aria-describedby',
  'aria-hidden',
  'aria-disabled',
  'aria-expanded',
  'aria-pressed',
  'aria-checked',
  'aria-selected',
  'aria-current',
  'aria-modal',
  'aria-live',
  'aria-controls',
  'tabindex',
] as const;

function captureComputed(win: Window, el: Element): Record<string, string> {
  const cs = win.getComputedStyle(el);
  const out: Record<string, string> = {};
  for (const k of CAPTURED_STYLE_PROPS) out[k] = cs.getPropertyValue(k);
  return out;
}

function captureAria(el: Element): Record<string, string> {
  const out: Record<string, string> = {};
  for (const attr of ARIA_PROPS_OF_INTEREST) {
    const v = el.getAttribute(attr);
    if (v !== null) out[attr] = v;
  }
  return out;
}

function shortSelector(el: Element): string {
  if (el.id) return `#${CSS.escape(el.id)}`;
  const tag = el.tagName.toLowerCase();
  const cls =
    typeof el.className === 'string'
      ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 2)
      : [];
  const path = `${tag}${cls.length ? '.' + cls.map(CSS.escape).join('.') : ''}`;
  // Append nth-of-type to disambiguate when there are siblings.
  if (el.parentElement) {
    const siblings = Array.from(el.parentElement.children).filter(
      (s) => s.tagName === el.tagName,
    );
    if (siblings.length > 1) {
      return `${path}:nth-of-type(${siblings.indexOf(el) + 1})`;
    }
  }
  return path;
}

function visibleText(el: Element): string {
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 120);
}

function accessibleName(el: Element): string {
  const aria = el.getAttribute('aria-label');
  if (aria?.trim()) return aria.trim();
  const labelledby = el.getAttribute('aria-labelledby');
  if (labelledby) {
    const target = el.ownerDocument.getElementById(labelledby);
    if (target?.textContent) return target.textContent.trim();
  }
  const text = visibleText(el);
  if (text) return text;
  const title = el.getAttribute('title');
  if (title?.trim()) return title.trim();
  const placeholder = el.getAttribute('placeholder');
  if (placeholder?.trim()) return placeholder.trim();
  const value = (el as HTMLInputElement).value;
  if (value) return String(value).trim();
  return '';
}

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

function isElementVisible(rect: DOMRect, computed: Record<string, string>): boolean {
  if (computed.display === 'none') return false;
  if (computed.visibility === 'hidden') return false;
  if (parseFloat(computed.opacity) === 0) return false;
  if (rect.width === 0 && rect.height === 0) return false;
  return true;
}

function parsePx(v: string | undefined): number | null {
  if (!v) return null;
  const m = /^(-?\d+(?:\.\d+)?)px$/.exec(v.trim());
  return m ? parseFloat(m[1]) : null;
}

/** Walk up the DOM until a non-transparent background is found. */
function effectiveBackground(win: Window, el: Element): RGB {
  let cur: Element | null = el;
  while (cur) {
    const raw = win.getComputedStyle(cur).backgroundColor;
    const c = parseColor(raw);
    if (c && c.a > 0) {
      if (c.a >= 1) return { r: c.r, g: c.g, b: c.b };
      const under = cur.parentElement
        ? effectiveBackground(win, cur.parentElement)
        : { r: 255, g: 255, b: 255 };
      return composite(c, under);
    }
    cur = cur.parentElement;
  }
  return { r: 255, g: 255, b: 255 };
}

/* ------------------------------------------------------------------ */
/* Audit rules                                                         */
/* ------------------------------------------------------------------ */

const TARGET_MIN_PX = 24;
const TARGET_COMFORT_PX = 44;
const FONT_CRITICAL_PX = 11;
const FONT_MIN_PX = 14;

function pushFinding(
  list: RuntimeFinding[],
  id: string,
  args: Omit<RuntimeFinding, 'id' | 'selector' | 'tagName' | 'text' | 'snapshot'> & {
    el: Element;
    win: Window;
    rect: DOMRect;
  },
): void {
  const { el, win, rect, ...rest } = args;
  list.push({
    id,
    ruleId: rest.ruleId,
    severity: rest.severity,
    category: rest.category,
    message: rest.message,
    selector: shortSelector(el),
    tagName: el.tagName.toLowerCase(),
    text: visibleText(el),
    snapshot: {
      boundingRect: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
      computed: captureComputed(win, el),
      aria: captureAria(el),
    },
  });
}

function emptySeverityCounts(): Record<RuntimeSeverity, number> {
  return { critical: 0, warning: 0, info: 0 };
}

function emptyCategoryCounts(): Record<RuntimeCategory, number> {
  return { touch: 0, a11y: 0, contrast: 0, visibility: 0, text: 0 };
}

export function scanRuntime(doc: Document): RuntimeReport {
  const win = doc.defaultView ?? window;
  const all = Array.from(doc.querySelectorAll('*'));
  const interactive = Array.from(doc.querySelectorAll(INTERACTIVE_SELECTOR));

  const findings: RuntimeFinding[] = [];
  let counter = 0;

  /* ---- interactive-only audits ---- */
  for (const el of interactive) {
    const rect = el.getBoundingClientRect();
    const computed = captureComputed(win, el);
    if (!isElementVisible(rect, computed)) continue;
    counter++;

    const name = accessibleName(el);
    if (!name) {
      pushFinding(findings, `f${counter}-name`, {
        el,
        win,
        rect,
        ruleId: 'RT-NAME',
        severity: 'critical',
        category: 'a11y',
        message: `Interactive ${el.tagName.toLowerCase()} has no accessible name`,
      });
    }

    const minSide = Math.min(rect.width, rect.height);
    if (minSide > 0 && minSide < TARGET_MIN_PX) {
      pushFinding(findings, `f${counter}-touch-min`, {
        el,
        win,
        rect,
        ruleId: 'RT-TOUCH-MIN',
        severity: 'critical',
        category: 'touch',
        message: `Touch target ${Math.round(rect.width)}×${Math.round(rect.height)}px below 24×24 WCAG minimum`,
      });
    } else if (minSide < TARGET_COMFORT_PX) {
      pushFinding(findings, `f${counter}-touch-comfort`, {
        el,
        win,
        rect,
        ruleId: 'RT-TOUCH-COMFORT',
        severity: 'warning',
        category: 'touch',
        message: `Touch target ${Math.round(rect.width)}×${Math.round(rect.height)}px below 44×44 comfort threshold`,
      });
    }

    // Disabled focus check: tabindex >= 0 on an offscreen/zero-size element.
    const tabindex = el.getAttribute('tabindex');
    if (tabindex !== null && parseInt(tabindex, 10) >= 0) {
      if (rect.width === 0 || rect.height === 0) {
        pushFinding(findings, `f${counter}-focus-zero`, {
          el,
          win,
          rect,
          ruleId: 'RT-FOCUS-ZERO',
          severity: 'warning',
          category: 'visibility',
          message: 'Focusable element has zero size — keyboard users land on nothing visible',
        });
      }
    }
  }

  /* ---- text + contrast audits across every element ---- */
  for (const el of all) {
    const text = visibleText(el);
    if (!text) continue;
    // Only audit elements that directly contain text (skip wrappers whose
    // children carry the text — avoids double counting).
    const ownsText = Array.from(el.childNodes).some(
      (n) => n.nodeType === 3 && (n.textContent ?? '').trim().length > 0,
    );
    if (!ownsText) continue;

    const rect = el.getBoundingClientRect();
    const computed = captureComputed(win, el);
    if (!isElementVisible(rect, computed)) continue;

    const fs = parsePx(computed['font-size']);
    if (fs !== null && fs < FONT_CRITICAL_PX) {
      pushFinding(findings, `f-text-${counter++}-crit`, {
        el,
        win,
        rect,
        ruleId: 'RT-FONT-CRIT',
        severity: 'critical',
        category: 'text',
        message: `font-size ${fs}px is unreadably small`,
      });
    } else if (fs !== null && fs < FONT_MIN_PX) {
      pushFinding(findings, `f-text-${counter++}-min`, {
        el,
        win,
        rect,
        ruleId: 'RT-FONT-MIN',
        severity: 'warning',
        category: 'text',
        message: `font-size ${fs}px is below 14px mobile minimum`,
      });
    }

    // Contrast: pull foreground from computed.color, background from the
    // nearest opaque ancestor, then run the WCAG ratio.
    const fg = parseColor(computed.color);
    if (!fg) continue;
    const bg = effectiveBackground(win, el);
    const opacity = parseFloat(computed.opacity || '1');
    const ratio = calculateContrast(fg, { ...bg, a: 1 }, opacity, bg);
    const large =
      (fs ?? 0) >= 24 ||
      ((fs ?? 0) >= 18.66 && (parseInt(computed['font-weight'], 10) || 400) >= 700);
    const aaThreshold = large ? 3 : 4.5;
    const aaaThreshold = large ? 4.5 : 7;
    if (ratio + 1e-6 < aaThreshold) {
      pushFinding(findings, `f-contrast-${counter++}`, {
        el,
        win,
        rect,
        ruleId: 'RT-CONTRAST-AA',
        severity: 'warning',
        category: 'contrast',
        message: `Contrast ${ratio.toFixed(2)}:1 fails AA (needs ${aaThreshold}:1)`,
      });
    } else if (ratio + 1e-6 < aaaThreshold) {
      pushFinding(findings, `f-contrast-aaa-${counter++}`, {
        el,
        win,
        rect,
        ruleId: 'RT-CONTRAST-AAA',
        severity: 'info',
        category: 'contrast',
        message: `Contrast ${ratio.toFixed(2)}:1 fails AAA (needs ${aaaThreshold}:1)`,
      });
    }
  }

  /* ---- visibility audit: aria-hidden ancestors over focusables ---- */
  for (const el of interactive) {
    const rect = el.getBoundingClientRect();
    const computed = captureComputed(win, el);
    if (!isElementVisible(rect, computed)) continue;
    let parent: Element | null = el.parentElement;
    while (parent) {
      if (parent.getAttribute('aria-hidden') === 'true') {
        pushFinding(findings, `f-aria-hidden-${counter++}`, {
          el,
          win,
          rect,
          ruleId: 'RT-ARIA-HIDDEN-FOCUSABLE',
          severity: 'critical',
          category: 'a11y',
          message: 'Interactive element is inside an aria-hidden subtree',
        });
        break;
      }
      parent = parent.parentElement;
    }
  }

  /* ---- tallies ---- */
  const countsBySeverity = emptySeverityCounts();
  const countsByCategory = emptyCategoryCounts();
  for (const f of findings) {
    countsBySeverity[f.severity]++;
    countsByCategory[f.category]++;
  }

  return {
    scannedAt: Date.now(),
    elementCount: all.length,
    interactiveCount: interactive.length,
    findings,
    countsBySeverity,
    countsByCategory,
  };
}
