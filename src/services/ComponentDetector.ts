/**
 * ComponentDetector
 *
 * Walks every loaded SourceFile and emits a `UIElement[]` inventory of the
 * 10 categories the spec calls out:
 *
 *   button · link · input · tab · modal · dialog · card · navigation · table · form
 *
 * Detection rules are deliberately layered so they compose:
 *   1. Explicit ARIA role beats everything (`role="tab"` → tab).
 *   2. HTML semantic tag (`<nav>` → navigation, `<button>` → button).
 *   3. Component name heuristic (`<Modal>`, `<DataGrid>`, `<NavLink>`).
 *   4. ClassName/data-* hints (`.card`, `[data-component="modal"]`).
 *
 * The tokenizer is shared with the search UI so we only have one markup
 * scanner to maintain. CSS/JSON files don't surface visible components,
 * so they're skipped here.
 */

import type { SourceFile } from './FileParser';
import {
  tokenize,
  extractVueTemplates,
  type Token,
} from './markupTokenizer';

export type UIElementType =
  | 'button'
  | 'link'
  | 'input'
  | 'tab'
  | 'modal'
  | 'dialog'
  | 'card'
  | 'navigation'
  | 'table'
  | 'form'
  | 'menu'
  | 'tooltip'
  | 'alert'
  | 'accordion'
  | 'list';

export const UI_TYPES: readonly UIElementType[] = [
  'button',
  'link',
  'input',
  'tab',
  'modal',
  'dialog',
  'card',
  'navigation',
  'table',
  'form',
  'menu',
  'tooltip',
  'alert',
  'accordion',
  'list',
] as const;

/**
 * The interface required by the spec. We carry a few extra fields
 * (`file`, `line`, `tagName`) so the inventory UI can jump back to the
 * source — they don't change the meaning of the required five.
 */
export interface UIElement {
  id: string;
  type: UIElementType;
  role: string;
  text: string;
  styles: ElementStyles;
  // Practical extras used by the UI + rule engine; ignored by the spec interface.
  file: string;
  line: number;
  tagName: string;
  /** Raw attribute map as written in source — rules use it to check ARIA, href, type, etc. */
  attrs: Record<string, string>;
}

export type ElementStyles = {
  className?: string;
  inline?: Record<string, string>;
  /** Raw `style="…"` or `style={…}` value as it appeared in source. */
  raw?: string;
  /**
   * CSS declarations resolved from loaded `.css` files by matching the
   * element's classNames against rule selectors. Populated by `enrichElements`
   * — the raw detector leaves this undefined.
   */
  computed?: Record<string, string>;
};

/* ------------------------------------------------------------------ */
/* Lookup tables                                                       */
/* ------------------------------------------------------------------ */

/** ARIA roles → our taxonomy. */
const ROLE_TO_TYPE: Record<string, UIElementType> = {
  button: 'button',
  link: 'link',
  textbox: 'input',
  searchbox: 'input',
  combobox: 'input',
  spinbutton: 'input',
  slider: 'input',
  switch: 'input',
  checkbox: 'input',
  radio: 'input',
  tab: 'tab',
  tablist: 'tab',
  tabpanel: 'tab',
  dialog: 'dialog',
  alertdialog: 'modal',
  navigation: 'navigation',
  table: 'table',
  grid: 'table',
  treegrid: 'table',
  form: 'form',
  search: 'form',
  menu: 'menu',
  menubar: 'menu',
  menuitem: 'menu',
  menuitemcheckbox: 'menu',
  menuitemradio: 'menu',
  tooltip: 'tooltip',
  alert: 'alert',
  status: 'alert',
  log: 'alert',
  list: 'list',
  listbox: 'list',
  listitem: 'list',
  // No ARIA role for accordion — it's a disclosure pattern. We detect it
  // via the `<details>` tag and the component-name heuristic below.
};

/** HTML element name → implicit ARIA role (subset we care about). */
const TAG_TO_ROLE: Record<string, string> = {
  a: 'link',
  button: 'button',
  input: 'textbox',
  textarea: 'textbox',
  select: 'combobox',
  nav: 'navigation',
  table: 'table',
  form: 'form',
  dialog: 'dialog',
};

/** HTML element name → taxonomy bucket when no explicit role exists. */
const TAG_TO_TYPE: Record<string, UIElementType> = {
  a: 'link',
  button: 'button',
  input: 'input',
  textarea: 'input',
  select: 'input',
  option: 'input',
  nav: 'navigation',
  table: 'table',
  form: 'form',
  dialog: 'dialog',
  fieldset: 'form',
  details: 'accordion',
  menu: 'menu',
};

/**
 * Component name heuristic. Matched case-insensitively against the raw
 * JSX/Vue component name; entries earlier in the list win on a tie.
 */
const COMPONENT_NAME_RULES: { pattern: RegExp; type: UIElementType }[] = [
  // React Native primitives — pressable surfaces are buttons by intent.
  { pattern: /^Touchable(Opacity|Highlight|WithoutFeedback|NativeFeedback)$|^Pressable$/i, type: 'button' },
  { pattern: /^TextInput$/i, type: 'input' },
  { pattern: /^(FlatList|SectionList|VirtualizedList|ScrollView)$/i, type: 'list' },
  { pattern: /^Picker$/i, type: 'input' },
  // Web component name heuristics (case-insensitive, anchored).
  { pattern: /^(icon)?button$|button$|togglebutton$|fab$/i, type: 'button' },
  { pattern: /^(nav)?link$|^anchor$/i, type: 'link' },
  { pattern: /^(text)?input$|^textfield$|^textarea$|^searchfield$|^checkbox$|^radio$|^switch$|^slider$|^combobox$|^select$/i, type: 'input' },
  { pattern: /^tabs?$|^tabpanel$|^tablist$/i, type: 'tab' },
  { pattern: /^modal$|^sheet$|^drawer$|^overlay$|^popover$|^bottomsheet$/i, type: 'modal' },
  { pattern: /^dialog$|^alertdialog$|^confirmdialog$/i, type: 'dialog' },
  { pattern: /^card$|^panel$/i, type: 'card' },
  { pattern: /^nav(igation)?$|^sidebar$|^topbar$|^breadcrumbs?$|^tabbar$/i, type: 'navigation' },
  { pattern: /^menu(bar)?$|^dropdown$|^menuitem$|^contextmenu$/i, type: 'menu' },
  { pattern: /^tooltip$|^hint$/i, type: 'tooltip' },
  { pattern: /^alert$|^toast$|^snackbar$|^banner$|^notification$|^flash$/i, type: 'alert' },
  { pattern: /^accordion$|^disclosure$|^collapsible$|^expansionpanel$/i, type: 'accordion' },
  { pattern: /^list(view|item)?$/i, type: 'list' },
  { pattern: /^(data)?table$|^datagrid$|^grid$/i, type: 'table' },
  { pattern: /^form$/i, type: 'form' },
];

/** Class-name substrings that imply a bucket. */
const CLASS_RULES: { pattern: RegExp; type: UIElementType }[] = [
  { pattern: /\bcard\b/i, type: 'card' },
  { pattern: /\bmodal\b/i, type: 'modal' },
  { pattern: /\b(nav|navigation)\b/i, type: 'navigation' },
  { pattern: /\btab(list|panel)?\b/i, type: 'tab' },
  { pattern: /\btooltip\b/i, type: 'tooltip' },
  { pattern: /\b(toast|snackbar|alert|banner)\b/i, type: 'alert' },
  { pattern: /\b(accordion|collapsible|disclosure)\b/i, type: 'accordion' },
  { pattern: /\b(dropdown|menu)\b/i, type: 'menu' },
];

/* ------------------------------------------------------------------ */
/* Style + role helpers                                                */
/* ------------------------------------------------------------------ */

/** Parse a CSS inline-style string into a key/value record. */
function parseInlineStyle(value: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const decl of value.split(';')) {
    const idx = decl.indexOf(':');
    if (idx === -1) continue;
    const key = decl.slice(0, idx).trim();
    const v = decl.slice(idx + 1).trim();
    if (key) out[key] = v;
  }
  return out;
}

function extractStyles(attrs: Record<string, string>): ElementStyles {
  const styles: ElementStyles = {};
  const className = attrs.class ?? attrs.className;
  if (className) styles.className = className;
  const rawStyle = attrs.style;
  if (rawStyle) {
    styles.raw = rawStyle;
    // Inline HTML style strings get parsed; JSX `{{ … }}` is left as raw.
    if (!rawStyle.startsWith('{')) {
      styles.inline = parseInlineStyle(rawStyle);
    }
  }
  return styles;
}

function pickRole(token: Token, fallbackType: UIElementType | null): string {
  if (token.attrs.role) return token.attrs.role.trim();
  const implicit = TAG_TO_ROLE[token.lowerName];
  if (implicit) return implicit;
  // For component names we surface the inferred taxonomy as the role label
  // so the inventory still reads sensibly.
  return fallbackType ?? '';
}

/** A11y-friendly text label for the element. */
function pickText(token: Token): string {
  if (token.attrs['aria-label']) return token.attrs['aria-label'];
  if (token.attrs.title) return token.attrs.title;
  if (token.attrs.placeholder) return token.attrs.placeholder;
  if (token.attrs.alt) return token.attrs.alt;
  if (token.attrs.value && token.lowerName === 'input') return token.attrs.value;
  return token.text;
}

/* ------------------------------------------------------------------ */
/* Classification                                                      */
/* ------------------------------------------------------------------ */

function classify(token: Token): UIElementType | null {
  // 1) Explicit role wins.
  const role = token.attrs.role?.trim().toLowerCase();
  if (role && ROLE_TO_TYPE[role]) return ROLE_TO_TYPE[role];

  // 2) HTML semantic tags.
  const tagBucket = TAG_TO_TYPE[token.lowerName];
  if (tagBucket) {
    // `<a>` only counts as a link when it has an href — otherwise it's just an anchor.
    if (token.lowerName === 'a' && !('href' in token.attrs)) return null;
    // `<input type="button|submit|reset">` is a button, not a generic input.
    if (token.lowerName === 'input') {
      const inputType = (token.attrs.type ?? 'text').toLowerCase();
      if (['button', 'submit', 'reset', 'image'].includes(inputType)) return 'button';
      if (inputType === 'hidden') return null;
    }
    return tagBucket;
  }

  // 3) JSX/Vue component name heuristic (capitalized or dotted).
  if (/^[A-Z]/.test(token.name) || token.name.includes('.')) {
    const head = token.name.split('.').pop() ?? token.name;
    for (const rule of COMPONENT_NAME_RULES) {
      if (rule.pattern.test(head)) return rule.type;
    }
  }

  // 4) Class-name hint as a last resort (so a plain `<div class="card">` counts).
  const className = token.attrs.class ?? token.attrs.className;
  if (className) {
    for (const rule of CLASS_RULES) {
      if (rule.pattern.test(className)) return rule.type;
    }
  }

  // 5) data-component="…" override.
  const explicit = token.attrs['data-component'];
  if (explicit) {
    const lower = explicit.toLowerCase();
    if ((UI_TYPES as readonly string[]).includes(lower)) {
      return lower as UIElementType;
    }
  }

  return null;
}

/* ------------------------------------------------------------------ */
/* Per-file dispatch                                                   */
/* ------------------------------------------------------------------ */

function detectInTokens(
  tokens: Token[],
  file: SourceFile,
  lineOffset = 0,
): UIElement[] {
  const out: UIElement[] = [];
  let i = 0;
  for (const token of tokens) {
    const type = classify(token);
    if (!type) continue;
    const role = pickRole(token, type);
    const styles = extractStyles(token.attrs);
    const line = token.line + lineOffset;
    out.push({
      id: `${file.path}:${line}:${type}:${i++}`,
      type,
      role,
      text: pickText(token).slice(0, 240),
      styles,
      file: file.path,
      line,
      tagName: token.name,
      attrs: { ...token.attrs },
    });
  }
  return out;
}

function detectInHtml(file: SourceFile): UIElement[] {
  return detectInTokens(tokenize(file.content, { jsx: false }), file);
}

function detectInVue(file: SourceFile): UIElement[] {
  const out: UIElement[] = [];
  for (const tmpl of extractVueTemplates(file.content)) {
    const tokens = tokenize(tmpl.content, { jsx: false });
    out.push(...detectInTokens(tokens, file, tmpl.lineOffset));
  }
  return out;
}

function detectInJsx(file: SourceFile): UIElement[] {
  return detectInTokens(tokenize(file.content, { jsx: true }), file);
}

/* ------------------------------------------------------------------ */
/* Public entry points                                                 */
/* ------------------------------------------------------------------ */

export function detectInFile(file: SourceFile): UIElement[] {
  switch (file.ext) {
    case 'html':
      return detectInHtml(file);
    case 'vue':
      return detectInVue(file);
    case 'jsx':
    case 'tsx':
    case 'js':
    case 'ts':
      return detectInJsx(file);
    default:
      return [];
  }
}

export function detectComponents(files: SourceFile[]): UIElement[] {
  const all: UIElement[] = [];
  for (const f of files) all.push(...detectInFile(f));
  return all;
}
