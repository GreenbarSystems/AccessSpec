/**
 * AuditService
 *
 * The one place that knows the full pipeline:
 *   detectComponents → enrichElements (CSS) → runRules (3 packs) → scoreAll
 *
 * Components and the scoring dashboard call only this — they don't import
 * detectors or rule packs directly. Keeping the orchestration here means we
 * can swap any stage (e.g. move detection into a Worker) without touching
 * the UI.
 */

import type { SourceFile } from './FileParser';
import {
  detectComponents,
  type UIElement,
} from './ComponentDetector';
import { enrichElements } from './CssResolver';
import { runRules, type Finding } from './RuleEngine';
import { accessibilityRules } from './rules/accessibility';
import { mobileRules } from './rules/mobile';
import { parityRules } from './rules/parity';
import { scoreAll, type ScoreReport } from './Scoring';

export type AuditReport = {
  elements: UIElement[];
  findings: Finding[];
  scores: ScoreReport;
};

const ALL_RULES = [...accessibilityRules, ...mobileRules, ...parityRules];

export function audit(files: SourceFile[]): AuditReport {
  const elements = enrichElements(detectComponents(files), files);
  const findings = runRules(elements, ALL_RULES);
  const scores = scoreAll(findings);
  return { elements, findings, scores };
}

/** Bundled rule list — exposed for documentation surfaces / Reports. */
export const ALL_RULE_DEFS = ALL_RULES;
