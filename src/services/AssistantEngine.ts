/**
 * AssistantEngine
 *
 * A local "AI" Q&A layer over the rule database + audit findings. It's not
 * an LLM — it's a deterministic matcher that turns a natural-language
 * question into the three-section answer the spec asks for:
 *
 *   Explanation · Code fix · Best practice
 *
 * Matching cascade (first hit wins):
 *
 *   1. Exact rule ID in the question (e.g. "What is A11Y-NAME-MISSING?")
 *   2. WCAG SC citation (e.g. "WCAG 2.5.8")
 *   3. Severity keyword ("critical", "warning") → picks top finding of that level
 *   4. Topic keyword ("contrast", "touch target", "modal", "tabs") → curated rule
 *   5. Free-text fuzzy match against rule descriptions
 *   6. Fallback: highest-severity finding in the current audit
 *
 * Why this design: the assistant is **honest** — every answer is sourced
 * from data the user can verify in the Reports inspector, with the matched
 * rule ID visible. No hallucinations possible.
 */

import type { Finding, Rule, Severity } from './RuleEngine';
import { ALL_RULE_DEFS } from './AuditService';

export type AssistantReply = {
  question: string;
  matchedRule?: { id: string; description: string; severity: Severity };
  /** Plain-English explanation of WHY this fails WCAG. */
  explanation: string;
  /** Code snippet pair pulled from the rule's suggestedFix. */
  codeFix: { bad?: string; good: string; language?: string } | null;
  /** Bulleted ongoing best-practice guidance. */
  bestPractice: string[];
  /** Spec citations and external references. */
  references: string[];
  /** Up to 3 element instances of this issue in the current project. */
  affectedElements: { file: string; line: number; tag: string; type: string }[];
  /** Confidence 0..1 — how sure we are the matched rule is what the user meant. */
  confidence: number;
};

/* ------------------------------------------------------------------ */
/* Extended per-rule explainers                                        */
/* ------------------------------------------------------------------ */

/**
 * One sentence beyond the rule description, written for a non-expert.
 * Falls back to the description if the rule isn't in this map.
 */
const RULE_EXPLAINER: Record<string, string> = {
  'A11Y-NAME-MISSING':
    'Screen readers announce controls by their accessible name. Without one the user hears "button" or "link" with no idea what activating it will do, so the control is effectively unusable.',
  'A11Y-LINK-PURPOSE':
    'Screen-reader users often pull a list of every link on the page out of context. "Click here" is meaningless in that list — the link text must describe its destination on its own.',
  'A11Y-DIALOG-LABEL':
    'When a dialog opens, focus moves into it and the screen reader announces its accessible name. Without a label the user lands inside a nameless region with no idea why focus jumped.',
  'A11Y-IMG-INPUT-ALT':
    'An image button has no text — its alt attribute IS the label. Missing alt means the screen reader either says "Submit" (default) or reads the filename, neither of which describes the action.',
  'A11Y-TABLE-LABEL':
    'When you open the Tables rotor in VoiceOver, every data table is listed. Unnamed tables show up as "table" with no context, making them indistinguishable.',
  'A11Y-FORM-NAME':
    'Pages with multiple forms confuse the Landmarks rotor — every form appears as just "form". Naming each one lets users jump directly to the form they want.',
  'MOB-TOUCH-MIN':
    'WCAG 2.5.8 sets 24 × 24 CSS px as the minimum tappable area so users with limited dexterity, tremor, or larger fingers can hit the target reliably. Below that, mis-taps become routine.',
  'MOB-TOUCH-COMFORT':
    'Apple HIG and Material both recommend 44 × 44 (iOS) / 48 × 48 (Material) px tappable areas. Anything smaller works for most users but causes daily friction for one-handed phone use.',
  'MOB-FONT-CRITICAL':
    'Body text below 11 px is illegible for most adults at arm\'s length on a phone. Users with even mild low-vision can\'t read it at all.',
  'MOB-FONT-MIN':
    'iOS and Android default body sizes are 17 / 16 sp; dropping below 14 sp/px puts you outside the platform expectation and most users will struggle.',
  'MOB-FONT-SCALABLE':
    'Hard-coded px font-sizes don\'t respond to iOS Dynamic Type or Android Font Scale. Users who turn up text size in OS settings see no change — the most common a11y accommodation is silently broken.',
  'PAR-BUTTON-NATIVE':
    'A <div onClick> doesn\'t get keyboard focus, ENTER/SPACE activation, the right semantic role, or the platform\'s tap-and-haptic affordance. A native <button> or Pressable gives you all of that for free.',
  'PAR-INPUT-NATIVE':
    'A custom contentEditable can\'t trigger the right mobile keyboard (email, tel, numeric), and won\'t get iOS Password AutoFill or Android Smart Lock. Use the platform input and the OS handles all of it.',
  'PAR-TAB-SELECTED':
    'VoiceOver and TalkBack announce a tab as "selected" or "not selected" only when aria-selected is set. Without it, blind users can\'t tell which tab is active.',
  'PAR-INPUT-AUTOCOMPLETE':
    'The autocomplete attribute tells iOS Password AutoFill, Android Smart Lock, and password managers what kind of value to suggest. Without it, users have to type everything by hand.',
  'PAR-NAV-LABEL':
    'A screen reader lists every <nav> landmark on the page. Without aria-label they all read as just "navigation", forcing the user to enter each one to figure out which is which.',
  'PAR-DIALOG-MODAL':
    'aria-modal="true" tells assistive tech to treat content outside the dialog as inert. Without it, users can swipe past the dialog and interact with the dimmed background, which platforms try to prevent.',
};

/* ------------------------------------------------------------------ */
/* Topic-keyword routing                                               */
/* ------------------------------------------------------------------ */

const KEYWORD_ROUTES: { keywords: RegExp; ruleId: string }[] = [
  { keywords: /\b(touch[- ]?target|tap[- ]?target|thumb)\b/i, ruleId: 'MOB-TOUCH-MIN' },
  { keywords: /\b(small button|comfort|44 ?px|48 ?dp)\b/i, ruleId: 'MOB-TOUCH-COMFORT' },
  { keywords: /\b(contrast|color contrast|ratio)\b/i, ruleId: 'MOB-FONT-MIN' },
  { keywords: /\b(font|font[- ]?size|tiny text|small text)\b/i, ruleId: 'MOB-FONT-MIN' },
  { keywords: /\b(dynamic type|font scaling|scalable text)\b/i, ruleId: 'MOB-FONT-SCALABLE' },
  { keywords: /\b(unreadable|too small)\b/i, ruleId: 'MOB-FONT-CRITICAL' },
  { keywords: /\b(accessible name|aria[- ]?label|icon button|label)\b/i, ruleId: 'A11Y-NAME-MISSING' },
  { keywords: /\b(click here|link text|generic link)\b/i, ruleId: 'A11Y-LINK-PURPOSE' },
  { keywords: /\b(dialog|modal)\b/i, ruleId: 'A11Y-DIALOG-LABEL' },
  { keywords: /\baria[- ]?modal\b/i, ruleId: 'PAR-DIALOG-MODAL' },
  { keywords: /\b(image button|input.*image|alt)\b/i, ruleId: 'A11Y-IMG-INPUT-ALT' },
  { keywords: /\btable\b/i, ruleId: 'A11Y-TABLE-LABEL' },
  { keywords: /\bform\b/i, ruleId: 'A11Y-FORM-NAME' },
  { keywords: /\b(div[- ]?button|span[- ]?button|fake button|custom button)\b/i, ruleId: 'PAR-BUTTON-NATIVE' },
  { keywords: /\b(custom input|fake input|content[- ]?editable)\b/i, ruleId: 'PAR-INPUT-NATIVE' },
  { keywords: /\b(tab|tabs|tablist)\b/i, ruleId: 'PAR-TAB-SELECTED' },
  { keywords: /\b(autocomplete|autofill|password)\b/i, ruleId: 'PAR-INPUT-AUTOCOMPLETE' },
  { keywords: /\b(nav|navigation|landmark)\b/i, ruleId: 'PAR-NAV-LABEL' },
];

/* ------------------------------------------------------------------ */
/* Matching                                                            */
/* ------------------------------------------------------------------ */

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

function ruleById(id: string): Rule | undefined {
  return ALL_RULE_DEFS.find((r) => r.id === id);
}

function topFindingForRule(ruleId: string, findings: Finding[]): Finding | undefined {
  return findings.find((f) => f.ruleId === ruleId);
}

function topFinding(findings: Finding[]): Finding | undefined {
  return [...findings].sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity],
  )[0];
}

type Match = { rule: Rule; finding?: Finding; confidence: number };

function matchQuestion(question: string, findings: Finding[]): Match | null {
  const q = question.trim();
  if (!q) return null;

  // 1. Exact rule ID — pattern like `A11Y-NAME-MISSING`, `MOB-TOUCH-MIN`,
  //    `PAR-INPUT-NATIVE`. The first segment can mix uppercase letters and
  //    digits (so "A11Y" works), the rest are letter/digit/hyphen.
  const ruleIdMatch = /\b([A-Z][A-Z0-9]*-[A-Z][A-Z0-9-]*)\b/.exec(q);
  if (ruleIdMatch) {
    const rule = ruleById(ruleIdMatch[1]);
    if (rule) {
      return { rule, finding: topFindingForRule(rule.id, findings), confidence: 1 };
    }
  }

  // 2. WCAG SC citation (e.g. "WCAG 2.5.8" or "1.4.3").
  const scMatch = /\b\d\.\d\.\d{1,2}\b/.exec(q);
  if (scMatch) {
    const rule = ALL_RULE_DEFS.find((r) => r.spec?.includes(scMatch[0]));
    if (rule) {
      return { rule, finding: topFindingForRule(rule.id, findings), confidence: 0.9 };
    }
  }

  // 3. Severity keyword → top finding of that severity.
  const sevMatch = /\b(critical|warning|info)\b/i.exec(q);
  if (sevMatch) {
    const sev = sevMatch[1].toLowerCase() as Severity;
    const finding = findings.find((f) => f.severity === sev);
    if (finding) {
      const rule = ruleById(finding.ruleId);
      if (rule) return { rule, finding, confidence: 0.75 };
    }
  }

  // 4. Topic keyword routing.
  for (const { keywords, ruleId } of KEYWORD_ROUTES) {
    if (keywords.test(q)) {
      const rule = ruleById(ruleId);
      if (rule) return { rule, finding: topFindingForRule(rule.id, findings), confidence: 0.7 };
    }
  }

  // 5. Fuzzy match against rule descriptions.
  const tokens = q.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  if (tokens.length > 0) {
    const scored = ALL_RULE_DEFS.map((r) => {
      const desc = r.description.toLowerCase();
      let hits = 0;
      for (const t of tokens) if (desc.includes(t)) hits++;
      return { rule: r, hits };
    });
    const best = scored.sort((a, b) => b.hits - a.hits)[0];
    if (best.hits > 0) {
      return {
        rule: best.rule,
        finding: topFindingForRule(best.rule.id, findings),
        confidence: Math.min(0.6, 0.2 + best.hits * 0.15),
      };
    }
  }

  // 6. Fallback: highest-severity finding in the current audit.
  const fallback = topFinding(findings);
  if (fallback) {
    const rule = ruleById(fallback.ruleId);
    if (rule) return { rule, finding: fallback, confidence: 0.3 };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Reply assembly                                                      */
/* ------------------------------------------------------------------ */

function buildReply(question: string, match: Match | null, findings: Finding[]): AssistantReply {
  if (!match) {
    return {
      question,
      explanation:
        'I couldn\'t match your question to a known rule or finding. Try mentioning a rule ID (e.g. MOB-TOUCH-MIN), a WCAG SC (1.4.3), or a topic like "contrast", "touch target", "modal", or "tabs". If no project is loaded, upload one on the Dashboard first.',
      codeFix: null,
      bestPractice: [],
      references: [],
      affectedElements: [],
      confidence: 0,
    };
  }
  const { rule, finding, confidence } = match;
  const allMatching = findings.filter((f) => f.ruleId === rule.id);
  const extended = RULE_EXPLAINER[rule.id] ?? rule.description;
  const occurrence =
    allMatching.length === 0
      ? 'Your current project has no findings against this rule.'
      : allMatching.length === 1
        ? '**1 element in your project currently fails this rule.**'
        : `**${allMatching.length} elements in your project currently fail this rule.**`;
  const explanation = `${extended}\n\n${occurrence}`;
  const bestPractice = [
    rule.suggestedFix.summary,
    ...(rule.suggestedFix.notes ?? []),
  ];
  const references = rule.spec ? [rule.spec] : [];

  return {
    question,
    matchedRule: { id: rule.id, description: rule.description, severity: rule.severity },
    explanation,
    codeFix: rule.suggestedFix.example
      ? {
          bad: rule.suggestedFix.example.bad,
          good: rule.suggestedFix.example.good,
          language: rule.suggestedFix.example.language,
        }
      : null,
    bestPractice,
    references,
    affectedElements: allMatching.slice(0, 3).map((f) => ({
      file: f.element.file,
      line: f.element.line,
      tag: f.element.tagName,
      type: f.element.type,
    })),
    confidence: finding ? Math.min(1, confidence + 0.1) : confidence,
  };
}

export function ask(question: string, findings: Finding[] = []): AssistantReply {
  const match = matchQuestion(question, findings);
  return buildReply(question, match, findings);
}

/* ------------------------------------------------------------------ */
/* Suggested prompts shown above the input                             */
/* ------------------------------------------------------------------ */

export const SUGGESTED_PROMPTS: readonly string[] = [
  'Why did this fail WCAG?',
  'Explain my top critical issue',
  'How do I fix touch targets?',
  'What does WCAG 2.5.8 mean?',
  'Why is my modal failing accessibility?',
  'Show me a contrast fix',
] as const;
