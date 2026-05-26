/**
 * RuleEngine
 *
 * Tiny rule runner. Each `Rule` is `(UIElement) → Finding | null`, plus enough
 * metadata to render a helpful row in the dashboard. Rules are intentionally
 * dumb in isolation — `AuditService` is what composes detect → enrich → run.
 *
 * Three categories feed three scores: accessibility, mobile, parity.
 */

import type { UIElement } from './ComponentDetector';

export type Severity = 'critical' | 'warning' | 'info';
export type Category = 'accessibility' | 'mobile' | 'parity';

export const SEVERITIES: readonly Severity[] = ['critical', 'warning', 'info'];
export const CATEGORIES: readonly Category[] = ['accessibility', 'mobile', 'parity'];

export interface Finding {
  ruleId: string;
  category: Category;
  severity: Severity;
  message: string;
  element: UIElement;
  /** Optional measured values surfaced to the UI (e.g. {minHeight: 12}). */
  context?: Record<string, string | number>;
}

export type SuggestedFix = {
  /** One-sentence remediation summary surfaced in the inspector header. */
  summary: string;
  /** Optional before/after snippet rendered as code blocks. */
  example?: {
    bad?: string;
    good: string;
    /** Hint used for syntax-class on the code block. */
    language?: 'html' | 'css' | 'jsx' | 'ts';
  };
  /** Free-form follow-up notes (one bullet per line break). */
  notes?: string[];
};

export interface Rule {
  id: string;
  category: Category;
  severity: Severity;
  /** Human-readable explanation shown in tooltips / Reports. */
  description: string;
  /** Cite the spec section so users can verify. */
  spec?: string;
  /**
   * Remediation guidance shown in the Interactive Violation Inspector.
   * Required so every rule surfaces an actionable fix, not just a diagnosis.
   */
  suggestedFix: SuggestedFix;
  check: (element: UIElement) => Omit<Finding, 'ruleId' | 'category' | 'severity' | 'element'> | null;
}

/** Run a single rule pack against the element set. */
export function runRules(elements: UIElement[], rules: Rule[]): Finding[] {
  const out: Finding[] = [];
  for (const rule of rules) {
    for (const el of elements) {
      const result = rule.check(el);
      if (!result) continue;
      out.push({
        ruleId: rule.id,
        category: rule.category,
        severity: rule.severity,
        element: el,
        message: result.message,
        context: result.context,
      });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Shared helpers used by rule packs                                   */
/* ------------------------------------------------------------------ */

/** Parse a CSS length value into px when possible. Returns null otherwise. */
export function parsePx(value: string | undefined): number | null {
  if (!value) return null;
  const m = /^(-?\d+(?:\.\d+)?)(px)?$/.exec(value.trim());
  if (!m) return null;
  return parseFloat(m[1]);
}

/** Effective text label considering attrs and text content. */
export function accessibleName(el: UIElement): string {
  return (
    el.attrs['aria-label'] ||
    el.attrs['aria-labelledby'] ||
    el.attrs['title'] ||
    el.attrs['placeholder'] ||
    el.attrs['alt'] ||
    el.text ||
    ''
  ).trim();
}

const INTERACTIVE_TYPES = new Set(['button', 'link', 'input', 'tab', 'menu']);
export function isInteractive(el: UIElement): boolean {
  return INTERACTIVE_TYPES.has(el.type);
}

/** Computed CSS lookup (case-insensitive). */
export function cssProp(el: UIElement, name: string): string | undefined {
  const c = el.styles.computed;
  if (!c) return undefined;
  return c[name.toLowerCase()];
}
