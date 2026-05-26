/**
 * Scoring
 *
 * Turns a finding list into 0–100 scores. Pure functions — the orchestrator
 * (AuditService) and the dashboard consume them without knowing the formula.
 *
 * Formula per category:
 *   penalty = min(40, critical * 4)
 *           + min(30, warning  * 1)
 *           + min(10, info     * 0.25)
 *   score   = max(0, round(100 - penalty))
 *
 * The per-severity caps prevent a single category (say, lots of `info`)
 * from running away with the score. Floor at 0; ceiling at 100.
 *
 * The overall score is a plain average of the three category scores so the
 * dashboard's headline number always agrees with what the user sees in the
 * three rings.
 */

import type { Category, Finding, Severity } from './RuleEngine';
import { CATEGORIES, SEVERITIES } from './RuleEngine';

export type SeverityCounts = Record<Severity, number>;

export type CategoryScore = {
  category: Category;
  /** 0 – 100, rounded. */
  score: number;
  counts: SeverityCounts;
};

export type ScoreReport = {
  overall: number;
  byCategory: Record<Category, CategoryScore>;
  totalCounts: SeverityCounts;
};

const PENALTY_PER_SEVERITY: Record<Severity, number> = {
  critical: 4,
  warning: 1,
  info: 0.25,
};

const PENALTY_CAP_PER_SEVERITY: Record<Severity, number> = {
  critical: 40,
  warning: 30,
  info: 10,
};

function emptyCounts(): SeverityCounts {
  const out = {} as SeverityCounts;
  for (const s of SEVERITIES) out[s] = 0;
  return out;
}

export function scoreCategory(category: Category, findings: Finding[]): CategoryScore {
  const counts = emptyCounts();
  for (const f of findings) {
    if (f.category !== category) continue;
    counts[f.severity]++;
  }
  let penalty = 0;
  for (const s of SEVERITIES) {
    penalty += Math.min(PENALTY_CAP_PER_SEVERITY[s], counts[s] * PENALTY_PER_SEVERITY[s]);
  }
  const score = Math.max(0, Math.min(100, Math.round(100 - penalty)));
  return { category, score, counts };
}

export function scoreAll(findings: Finding[]): ScoreReport {
  const byCategory = {} as Record<Category, CategoryScore>;
  const totalCounts = emptyCounts();
  let sum = 0;
  for (const c of CATEGORIES) {
    const cat = scoreCategory(c, findings);
    byCategory[c] = cat;
    sum += cat.score;
    for (const s of SEVERITIES) totalCounts[s] += cat.counts[s];
  }
  const overall = Math.round(sum / CATEGORIES.length);
  return { overall, byCategory, totalCounts };
}

/** Band threshold colors used by the rings. */
export type ScoreBand = 'good' | 'warn' | 'bad';
export function bandOf(score: number): ScoreBand {
  if (score >= 90) return 'good';
  if (score >= 70) return 'warn';
  return 'bad';
}
