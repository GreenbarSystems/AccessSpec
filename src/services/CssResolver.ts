/**
 * CssResolver
 *
 * Tiny pure-CSS parser + classname-based rule matcher. We don't aim for full
 * spec compliance — just enough to give the analyzer the actual declared
 * properties for an element whose `className` references a rule in a
 * project-uploaded stylesheet.
 *
 * Scope:
 *   - Selector list (`.btn, .btn-primary { … }`) → one rule per comma part.
 *   - `@media` / `@supports` blocks are flattened (their inner rules count).
 *   - Other at-rules (`@keyframes`, `@font-face`, `@import`) are skipped.
 *   - Pseudo-class/element selectors (`:hover`, `::before`) are dropped from
 *     resolution — only static "base" styles are returned. The WCAG analyzer
 *     can layer states on top later.
 *   - Specificity isn't computed; last-declared wins (mirrors CSS source order
 *     well enough for the inventory).
 *
 * Tailwind utility classes don't appear in uploaded `.css` unless the user
 * shipped a built stylesheet — so a `className="bg-blue-500"` will resolve
 * only if `bg-blue-500` is present in some loaded `.css` file. That's an
 * acknowledged limit; documented in the UI hint.
 */

import type { SourceFile } from './FileParser';
import type { UIElement } from './ComponentDetector';

export type CssRule = {
  selector: string;
  /** Class tokens appearing in the selector, used as the match key. */
  classes: string[];
  declarations: Record<string, string>;
  /** Source file the rule came from — handy for "go to definition" later. */
  source: string;
};

/** Strip /* … *​/ comments without breaking line counts. */
function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, (m) =>
    m.replace(/[^\n]/g, ' '),
  );
}

function parseDeclarations(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const decl of body.split(';')) {
    const idx = decl.indexOf(':');
    if (idx === -1) continue;
    const key = decl.slice(0, idx).trim();
    const value = decl.slice(idx + 1).trim();
    if (!key) continue;
    // Drop "!important" — analyzer only cares about the value.
    out[key.toLowerCase()] = value.replace(/\s*!important\s*$/i, '').trim();
  }
  return out;
}

/** Find the index of the `{` that matches the `{` at position `open`. */
function findMatchingBrace(text: string, open: number): number {
  let depth = 1;
  for (let i = open + 1; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** Extract class tokens from a single selector (e.g. `.btn.lg:hover` → ['btn','lg']). */
function classesIn(selector: string): string[] {
  const out: string[] = [];
  const re = /\.([A-Za-z_][\w-]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(selector))) out.push(m[1]);
  return out;
}

/**
 * Parse a CSS string into a flat rule list. `source` is propagated onto each
 * rule for later attribution.
 */
export function parseCss(input: string, source = '(inline)'): CssRule[] {
  const text = stripComments(input);
  return parseBlock(text, source);
}

function parseBlock(text: string, source: string): CssRule[] {
  const out: CssRule[] = [];
  let i = 0;
  const len = text.length;
  while (i < len) {
    // Skip whitespace + stray semicolons.
    while (i < len && /[\s;]/.test(text[i])) i++;
    if (i >= len) break;

    const braceOpen = text.indexOf('{', i);
    if (braceOpen === -1) break;
    const braceClose = findMatchingBrace(text, braceOpen);
    if (braceClose === -1) break;

    const prelude = text.slice(i, braceOpen).trim();
    const body = text.slice(braceOpen + 1, braceClose);

    if (prelude.startsWith('@media') || prelude.startsWith('@supports')) {
      // Flatten — caller doesn't care about the condition.
      out.push(...parseBlock(body, source));
    } else if (prelude.startsWith('@')) {
      // @keyframes / @font-face / @page / @import — ignore.
    } else {
      const declarations = parseDeclarations(body);
      if (Object.keys(declarations).length > 0) {
        for (const sel of prelude.split(',')) {
          const trimmed = sel.trim();
          if (!trimmed) continue;
          out.push({
            selector: trimmed,
            classes: classesIn(trimmed),
            declarations,
            source,
          });
        }
      }
    }
    i = braceClose + 1;
  }
  return out;
}

/** Build a class-indexed lookup so resolution per element is O(classes). */
type RuleIndex = Map<string, CssRule[]>;

function indexRules(rules: CssRule[]): RuleIndex {
  const index: RuleIndex = new Map();
  for (const rule of rules) {
    // Skip pseudo-state rules so the "base" snapshot stays clean.
    if (/[:]/.test(rule.selector) && !rule.selector.includes('::')) {
      // Permit ::before/::after? Drop them too — they're presentation, not the element.
      continue;
    }
    if (rule.classes.length === 0) continue;
    for (const cls of rule.classes) {
      const list = index.get(cls) ?? [];
      list.push(rule);
      index.set(cls, list);
    }
  }
  return index;
}

/** Resolve declarations for a className string, honoring source order. */
export function resolveStyles(
  className: string | undefined,
  index: RuleIndex,
): Record<string, string> {
  if (!className) return {};
  const tokens = className.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return {};
  const seenRules = new Set<CssRule>();
  const computed: Record<string, string> = {};
  for (const t of tokens) {
    const rules = index.get(t);
    if (!rules) continue;
    for (const rule of rules) {
      if (seenRules.has(rule)) continue;
      seenRules.add(rule);
      // Only apply rules whose every class in the selector is on the element.
      // (Cheap approximation of selector matching — drops `.btn.large` when
      // the element only has `btn`.)
      if (!rule.classes.every((c) => tokens.includes(c))) continue;
      Object.assign(computed, rule.declarations);
    }
  }
  return computed;
}

/**
 * Extract <style> blocks from an HTML / Vue / JSX source file. Each block's
 * body is concatenated with a synthetic source label so attribution still
 * works in dev tools. We don't bother filtering scoped Vue styles, etc. —
 * an over-broad match is fine because the unmatched selectors just won't
 * key into the index later.
 */
function extractInlineStyleBlocks(file: SourceFile): string[] {
  // We only mine markup formats that actually embed <style>. Svelte uses
  // the same pattern but isn't in the SupportedExt union yet — when it
  // joins, extend the guard.
  if (file.ext !== 'html' && file.ext !== 'vue') return [];
  const out: string[] = [];
  const re = /<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi;
  let m;
  while ((m = re.exec(file.content)) !== null) {
    out.push(m[1]);
  }
  return out;
}

/**
 * Top-level helper: take detected elements + loaded source files, and attach
 * `styles.computed` to any element whose styles can be resolved.
 *
 * Three sources fold into `computed`, in browser-correct precedence order:
 *
 *   1. `<style>` blocks inside HTML / Vue / Svelte source (lowest precedence)
 *   2. Standalone `.css` files matched by classname
 *   3. Inline `style="…"` declarations on the element itself (highest)
 *
 * Without #1 we'd miss whole-doc demo HTML where every style lives in a
 * single inline <style> at the top. Without #3 the rules engine would
 * register 100/100 on a project full of inline-styled tiny buttons —
 * which is what made the bundled sample look like the tool was broken.
 */
export function enrichElements(
  elements: UIElement[],
  files: SourceFile[],
): UIElement[] {
  const rules: CssRule[] = [];
  for (const f of files) {
    if (f.ext === 'css') {
      rules.push(...parseCss(f.content, f.path));
    } else {
      const blocks = extractInlineStyleBlocks(f);
      for (let i = 0; i < blocks.length; i++) {
        rules.push(...parseCss(blocks[i], `${f.path}#style[${i}]`));
      }
    }
  }
  const index = indexRules(rules);
  return elements.map((el) => {
    const fromCss = resolveStyles(el.styles.className, index);
    const fromInline = el.styles.inline ?? {};
    // Browser order: external CSS sets the base; inline overrides.
    const computed = { ...fromCss, ...fromInline };
    if (Object.keys(computed).length === 0) return el;
    return { ...el, styles: { ...el.styles, computed } };
  });
}
