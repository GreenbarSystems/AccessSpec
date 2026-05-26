/**
 * RefactoringGenerator
 *
 * Where the Remediation Playbook says "fix this idea", this service says
 * "here's the literal diff." For each finding we look up a per-rule
 * generator that produces a concrete `RefactorSuggestion`:
 *
 *   { before, after, category, rationale, location, autoApplicable }
 *
 * Categories match the four buckets the spec calls out:
 *
 *   html         · semantic element / text content changes
 *   css          · stylesheet declarations (font-size, scalable units)
 *   aria         · ARIA attribute additions (aria-label, aria-modal, …)
 *   touch-target · CSS sizing specifically for tap-target rules
 *
 * Inline HTML/ARIA edits operate on the actual source line (pulled from
 * SourceRepository) so the "before" is verbatim. CSS-side edits don't
 * touch source — they synthesize a paste-ready rule snippet keyed on the
 * element's className, because the original CSS may live across multiple
 * files and we don't have rule-level source mapping yet.
 *
 * `autoApplicable` is `true` only when no placeholder text remains; today
 * that's the small set of attribute defaults like `aria-modal="true"` or
 * `autocomplete="off"`.
 */

import type { Finding, Severity } from './RuleEngine';
import type { SourceFile } from './FileParser';
import { ALL_RULE_DEFS } from './AuditService';

export type RefactorCategory = 'html' | 'css' | 'aria' | 'touch-target';

export type RefactorSuggestion = {
  id: string;
  ruleId: string;
  category: RefactorCategory;
  severity: Severity;
  /** File + line we'd modify. */
  location: { file: string; line: number };
  /** Source language hint for the code blocks. */
  language: 'html' | 'jsx' | 'css' | 'vue';
  /** Verbatim source line (or synthesized snippet when source isn't on hand). */
  before: string;
  /** Proposed replacement; may contain `__PLACEHOLDER__` tokens for the developer to fill in. */
  after: string;
  /** One-line explanation of the change. */
  rationale: string;
  /** True only when the change is mechanical with no judgment needed. */
  autoApplicable: boolean;
};

export type RefactorReport = {
  suggestions: RefactorSuggestion[];
  byCategory: Record<RefactorCategory, RefactorSuggestion[]>;
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function getSourceLine(file: string, line: number, files: SourceFile[]): string {
  const sf = files.find((f) => f.path === file);
  if (!sf) return '';
  const lines = sf.content.split('\n');
  return lines[line - 1] ?? '';
}

function languageFor(file: string): RefactorSuggestion['language'] {
  if (/\.vue$/i.test(file)) return 'vue';
  if (/\.(jsx|tsx)$/i.test(file)) return 'jsx';
  if (/\.(html?)$/i.test(file)) return 'html';
  if (/\.css$/i.test(file)) return 'css';
  return 'html';
}

/**
 * Inject `attr="value"` into the first opening tag whose name matches `tag`
 * within the supplied line. Returns the line unchanged when no opening tag
 * is found — caller falls back to a synthesized snippet in that case.
 */
function addAttr(
  line: string,
  tag: string,
  attr: string,
  value: string,
): string | null {
  // Match `<Tag …attrs…>` or `<Tag …attrs… />`. JSX preserves case so we use
  // case-insensitive only when the tag is all lowercase (HTML).
  const tagPattern = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`<${tagPattern}\\b([^>]*?)(\\s*/?>)`);
  if (!re.test(line)) return null;
  // Don't double-add an attribute that's already present.
  if (new RegExp(`\\b${attr}\\b`).test(line)) return null;
  return line.replace(re, (_, attrs, close) => {
    const sep = attrs && !/\s$/.test(attrs) ? ' ' : '';
    return `<${tag}${attrs}${sep}${attr}="${value}"${close}`;
  });
}

function classListOf(el: Finding['element']): string[] {
  const c = el.styles.className;
  if (!c) return [];
  return c.split(/\s+/).filter(Boolean);
}

function primaryClass(el: Finding['element']): string {
  return classListOf(el)[0] ?? el.tagName.toLowerCase();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const CAT_LABEL: Record<RefactorCategory, string> = {
  html: 'HTML fixes',
  css: 'CSS fixes',
  aria: 'ARIA fixes',
  'touch-target': 'Touch target fixes',
};
export { CAT_LABEL };

/* ------------------------------------------------------------------ */
/* Per-rule generators                                                 */
/* ------------------------------------------------------------------ */

type Ctx = { finding: Finding; lineText: string; files: SourceFile[] };
type GeneratorOutput = Pick<
  RefactorSuggestion,
  'category' | 'before' | 'after' | 'rationale' | 'autoApplicable'
>;
type Generator = (ctx: Ctx) => GeneratorOutput | null;

const RULE_GENERATORS: Record<string, Generator> = {
  /* ---- ARIA: missing names ---- */
  'A11Y-NAME-MISSING': ({ finding, lineText }) => {
    const tag = finding.element.tagName;
    const placeholder = `__${finding.element.type.toUpperCase()}_LABEL__`;
    const before =
      lineText.trim() || `<${tag}>…</${tag}>`;
    const after =
      addAttr(before, tag, 'aria-label', placeholder) ??
      `<${tag} aria-label="${placeholder}">…</${tag}>`;
    return {
      category: 'aria',
      before,
      after,
      rationale:
        'Adds an accessible name so VoiceOver/TalkBack can identify the control.',
      autoApplicable: false,
    };
  },

  'A11Y-DIALOG-LABEL': ({ finding, lineText }) => {
    const tag = finding.element.tagName;
    const before = lineText.trim() || `<${tag}>…</${tag}>`;
    const after =
      addAttr(before, tag, 'aria-labelledby', '__DIALOG_TITLE_ID__') ??
      `<${tag} aria-labelledby="__DIALOG_TITLE_ID__">…</${tag}>`;
    return {
      category: 'aria',
      before,
      after,
      rationale:
        'Point aria-labelledby at the dialog heading so focus shifts are announced with context.',
      autoApplicable: false,
    };
  },

  'A11Y-FORM-NAME': ({ finding, lineText }) => {
    const before = lineText.trim() || `<form>…</form>`;
    const after =
      addAttr(before, 'form', 'aria-label', '__FORM_PURPOSE__') ??
      `<form aria-label="__FORM_PURPOSE__">…</form>`;
    return {
      category: 'aria',
      before,
      after,
      rationale: 'Disambiguate multiple forms on the page for landmark rotors.',
      autoApplicable: false,
    };
  },

  'A11Y-TABLE-LABEL': ({ lineText }) => {
    const before = lineText.trim() || `<table>…</table>`;
    const after = before.replace(
      /(<table\b[^>]*>)/i,
      '$1\n  <caption>__TABLE_PURPOSE__</caption>',
    );
    return {
      category: 'html',
      before,
      after,
      rationale: 'Add a <caption> as the first child so tables announce a name.',
      autoApplicable: false,
    };
  },

  'A11Y-LINK-PURPOSE': ({ finding, lineText }) => {
    const before = lineText.trim() || `<a href="...">click here</a>`;
    const after = before.replace(
      />\s*(click here|here|read more|learn more|more|link)\s*</i,
      '>__LINK_DESTINATION__<',
    );
    return {
      category: 'html',
      before,
      after,
      rationale:
        'Rewrite generic link text so it makes sense out of context (screen-reader link rotor).',
      autoApplicable: false,
    };
  },

  'A11Y-IMG-INPUT-ALT': ({ lineText }) => {
    const before = lineText.trim() || `<input type="image" src="…" />`;
    const after =
      addAttr(before, 'input', 'alt', '__IMAGE_ACTION__') ??
      `<input type="image" src="…" alt="__IMAGE_ACTION__" />`;
    return {
      category: 'html',
      before,
      after,
      rationale:
        'Image buttons need alt text describing what they do, not what they depict.',
      autoApplicable: false,
    };
  },

  /* ---- Touch-target CSS ---- */
  'MOB-TOUCH-MIN': ({ finding }) => {
    const cls = primaryClass(finding.element);
    return {
      category: 'touch-target',
      before: `.${cls} { /* current sizing below WCAG 2.5.8 floor */ }`,
      after: `.${cls} {
  min-width: 24px;
  min-height: 24px;
  /* or add 24px of clear margin so a 24px circle around it
     doesn't intersect another target */
}`,
      rationale: 'Bump declared min-width/min-height to 24px to meet WCAG 2.5.8.',
      autoApplicable: false,
    };
  },

  'MOB-TOUCH-COMFORT': ({ finding }) => {
    const cls = primaryClass(finding.element);
    return {
      category: 'touch-target',
      before: `.${cls} { /* current sizing below 44 / 48 platform comfort */ }`,
      after: `.${cls} {
  min-width: 44px;   /* iOS HIG; use 48px to match Material 3 */
  min-height: 44px;
  padding: 0 12px;
}`,
      rationale: 'Raise to 44 × 44 px (iOS) / 48 × 48 px (Material) for comfortable taps.',
      autoApplicable: false,
    };
  },

  /* ---- CSS: text sizing ---- */
  'MOB-FONT-CRITICAL': ({ finding }) => {
    const cls = primaryClass(finding.element);
    return {
      category: 'css',
      before: `.${cls} { font-size: < ${11}px; }`,
      after: `.${cls} { font-size: 1rem; /* 16px at default root, user-scalable */ }`,
      rationale: 'Raise body text to at least 14 px and use rem so OS scaling applies.',
      autoApplicable: false,
    };
  },

  'MOB-FONT-MIN': ({ finding }) => {
    const cls = primaryClass(finding.element);
    return {
      category: 'css',
      before: `.${cls} { font-size: < 14px; }`,
      after: `.${cls} { font-size: 0.875rem; /* 14px */ }`,
      rationale: 'Mobile body copy reads best at ≥14 px.',
      autoApplicable: false,
    };
  },

  'MOB-FONT-SCALABLE': ({ finding }) => {
    const cls = primaryClass(finding.element);
    const declared = finding.element.styles.computed?.['font-size'] ?? '16px';
    const px = parseFloat(declared);
    const rem = Number.isFinite(px) ? `${(px / 16).toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}rem` : '1rem';
    return {
      category: 'css',
      before: `.${cls} { font-size: ${declared}; }`,
      after: `.${cls} { font-size: ${rem}; }`,
      rationale: 'Switch px to rem so iOS Dynamic Type and Android Font Scale apply.',
      autoApplicable: true,
    };
  },

  /* ---- Parity: platform-native elements ---- */
  'PAR-BUTTON-NATIVE': ({ finding, lineText }) => {
    const tag = finding.element.tagName;
    const before = lineText.trim() || `<${tag} onClick={…}>…</${tag}>`;
    // Replace just the opening + closing element name with `button`.
    const after = before
      .replace(new RegExp(`<${escapeRegex(tag)}\\b`, 'g'), '<button type="button"')
      .replace(new RegExp(`</${escapeRegex(tag)}>`, 'g'), '</button>');
    return {
      category: 'html',
      before,
      after,
      rationale:
        'Use a native <button> so keyboard focus, ENTER/SPACE activation, and platform haptics work for free.',
      autoApplicable: false,
    };
  },

  'PAR-INPUT-NATIVE': ({ finding, lineText }) => {
    const tag = finding.element.tagName;
    const before = lineText.trim() || `<${tag} contentEditable>…</${tag}>`;
    const after = `<input type="text" name="__FIELD_NAME__" />`;
    return {
      category: 'html',
      before,
      after,
      rationale:
        'Native <input> gives you the right keyboard, autofill, and platform validation.',
      autoApplicable: false,
    };
  },

  'PAR-TAB-SELECTED': ({ finding, lineText }) => {
    const tag = finding.element.tagName;
    const before = lineText.trim() || `<${tag} role="tab">…</${tag}>`;
    const after =
      addAttr(before, tag, 'aria-selected', '{isActive}') ??
      `<${tag} role="tab" aria-selected={isActive}>…</${tag}>`;
    return {
      category: 'aria',
      before,
      after,
      rationale:
        'Toggle aria-selected on each tab so VoiceOver/TalkBack announce the active one.',
      autoApplicable: false,
    };
  },

  'PAR-INPUT-AUTOCOMPLETE': ({ finding, lineText }) => {
    const before = lineText.trim() || `<input name="email" />`;
    const after =
      addAttr(before, 'input', 'autocomplete', '__TOKEN__') ??
      `<input name="email" autocomplete="email" />`;
    return {
      category: 'html',
      before,
      after,
      rationale:
        'Pick the right autocomplete token (email, tel, current-password, name, …) so OS autofill works.',
      autoApplicable: false,
    };
  },

  'PAR-NAV-LABEL': ({ lineText }) => {
    const before = lineText.trim() || `<nav>…</nav>`;
    const after =
      addAttr(before, 'nav', 'aria-label', '__NAV_PURPOSE__') ??
      `<nav aria-label="__NAV_PURPOSE__">…</nav>`;
    return {
      category: 'aria',
      before,
      after,
      rationale: 'Distinguish multiple <nav> landmarks in the rotor.',
      autoApplicable: false,
    };
  },

  'PAR-DIALOG-MODAL': ({ finding, lineText }) => {
    const tag = finding.element.tagName;
    const before = lineText.trim() || `<${tag} role="dialog">…</${tag}>`;
    const after =
      addAttr(before, tag, 'aria-modal', 'true') ??
      `<${tag} role="dialog" aria-modal="true">…</${tag}>`;
    return {
      category: 'aria',
      before,
      after,
      rationale:
        'aria-modal="true" tells assistive tech the rest of the page is inert.',
      autoApplicable: true,
    };
  },
};

/* ------------------------------------------------------------------ */
/* Public entry                                                        */
/* ------------------------------------------------------------------ */

export function generateRefactors(
  findings: Finding[],
  files: SourceFile[],
): RefactorReport {
  const suggestions: RefactorSuggestion[] = [];
  // Dedupe per (rule, file:line) — a single line may produce one suggestion
  // even if multiple findings target it.
  const seen = new Set<string>();
  let counter = 0;
  for (const f of findings) {
    const key = `${f.ruleId}:${f.element.file}:${f.element.line}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const gen = RULE_GENERATORS[f.ruleId];
    if (!gen) continue;
    const lineText = getSourceLine(f.element.file, f.element.line, files);
    const out = gen({ finding: f, lineText, files });
    if (!out) continue;
    counter++;
    suggestions.push({
      id: `refactor-${counter}`,
      ruleId: f.ruleId,
      category: out.category,
      severity: f.severity,
      location: { file: f.element.file, line: f.element.line },
      language: languageFor(f.element.file),
      before: out.before,
      after: out.after,
      rationale: out.rationale,
      autoApplicable: out.autoApplicable,
    });
  }
  // Order suggestions by category to make the grouped UI cheap.
  suggestions.sort((a, b) => a.category.localeCompare(b.category));

  const byCategory: RefactorReport['byCategory'] = {
    html: [],
    css: [],
    aria: [],
    'touch-target': [],
  };
  for (const s of suggestions) byCategory[s.category].push(s);

  return { suggestions, byCategory };
}

/** Sanity: every rule that has a generator must be in our ALL_RULE_DEFS. */
export function _coverage(): { covered: string[]; uncovered: string[] } {
  const ids = ALL_RULE_DEFS.map((r) => r.id);
  const covered = ids.filter((id) => id in RULE_GENERATORS);
  const uncovered = ids.filter((id) => !(id in RULE_GENERATORS));
  return { covered, uncovered };
}
