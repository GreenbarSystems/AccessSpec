/**
 * PatternRecognizer
 *
 * One level above ComponentDetector: takes the flat `UIElement[]` inventory
 * and recognizes seven *functional* patterns (date picker, file upload,
 * navigation, modal, toggle, search, tabs). For each instance we also run
 * lightweight a11y heuristic checks so the panel can show pass/fail rows
 * without having to spawn another pipeline.
 *
 * Matching strategy
 *   - Lowercase HTML tag + attribute checks for native widgets
 *     (`<input type="date">`, `<input type="file">`, `<form role="search">`,
 *     `<dialog>`, etc.)
 *   - Component-name regex for JSX/Vue (e.g. `<Modal>`, `<DatePicker>`,
 *     `<Switch>`, `<Tabs>`, `<Dropzone>`)
 *   - Reuse of the taxonomy already applied by ComponentDetector when the
 *     match is already conclusive (e.g. `el.type === 'navigation'`)
 *
 * Each element produces at most one pattern instance. Tab patterns group
 * their child `[role="tab"]` siblings from the same file as the tablist
 * anchor so the UI can show the whole widget at a glance.
 */

import type { UIElement } from './ComponentDetector';

export const PATTERN_KINDS = [
  'date-picker',
  'file-upload',
  'navigation',
  'modal',
  'toggle',
  'search',
  'tabs',
] as const;

export type PatternKind = (typeof PATTERN_KINDS)[number];

export const PATTERN_LABEL: Record<PatternKind, string> = {
  'date-picker': 'Date Picker',
  'file-upload': 'File Upload',
  navigation: 'Navigation',
  modal: 'Modal',
  toggle: 'Toggle',
  search: 'Search',
  tabs: 'Tabs',
};

// PATTERN_ICON moved to src/components/icons/patternIcons.tsx so this file
// stays free of React / lucide imports — it's consumed by the inline
// runtime scanner (vanilla JS) and other React-free callers.

export type PatternCheck = {
  label: string;
  status: 'pass' | 'fail' | 'info';
  detail: string;
};

export type PatternInstance = {
  id: string;
  kind: PatternKind;
  /** Element that anchored the match (file:line lives here). */
  anchor: UIElement;
  /** Additional elements grouped with the anchor (e.g. tabs under a tablist). */
  members: UIElement[];
  /** Short string explaining *why* we classified this element (e.g. "input[type=date]"). */
  evidence: string;
  /** Pattern-specific a11y heuristics. */
  checks: PatternCheck[];
};

export type PatternReport = {
  patterns: PatternInstance[];
  countsByKind: Record<PatternKind, number>;
};

/* ------------------------------------------------------------------ */
/* Matchers                                                            */
/* ------------------------------------------------------------------ */

const DATE_INPUT_TYPES = new Set(['date', 'datetime-local', 'month', 'week', 'time']);
const DATE_COMPONENT_NAMES = /^(date|day|month|year|range)?picker$|^calendar$|^datefield$/i;
const FILE_COMPONENT_NAMES = /^(dropzone|fileupload|file_?picker|uploader|filedrop)$/i;
const TOGGLE_COMPONENT_NAMES = /^(toggle|switch|togglebutton|toggleswitch)$/i;
const SEARCH_COMPONENT_NAMES = /^(search|searchbox|searchbar|searchfield|searchinput)$/i;
const TABS_COMPONENT_NAMES = /^tabs$|^tabset$|^tabpanel$|^tablist$/i;
const MODAL_COMPONENT_NAMES = /^(modal|dialog|alertdialog|sheet|drawer|bottomsheet|overlay)$/i;
const NAV_COMPONENT_NAMES = /^(nav(igation|bar|menu)?|sidebar|topbar|tabbar|breadcrumbs?)$/i;

type Match = { kind: PatternKind; evidence: string };

function classify(el: UIElement): Match | null {
  const tag = el.tagName.toLowerCase();
  const role = (el.attrs.role ?? '').toLowerCase();
  const type = (el.attrs.type ?? '').toLowerCase();

  // 1) Native HTML widgets — most reliable signal.
  if (tag === 'input' && DATE_INPUT_TYPES.has(type)) {
    return { kind: 'date-picker', evidence: `input[type=${type}]` };
  }
  if (tag === 'input' && type === 'file') {
    return { kind: 'file-upload', evidence: 'input[type=file]' };
  }
  if (tag === 'input' && type === 'search') {
    return { kind: 'search', evidence: 'input[type=search]' };
  }
  if (tag === 'form' && role === 'search') {
    return { kind: 'search', evidence: 'form[role=search]' };
  }
  if (tag === 'dialog' || role === 'dialog' || role === 'alertdialog') {
    return {
      kind: 'modal',
      evidence: tag === 'dialog' ? '<dialog>' : `role=${role}`,
    };
  }
  if (tag === 'nav' || role === 'navigation' || role === 'menubar') {
    return {
      kind: 'navigation',
      evidence: tag === 'nav' ? '<nav>' : `role=${role}`,
    };
  }
  if (role === 'switch') {
    return { kind: 'toggle', evidence: 'role=switch' };
  }
  if (role === 'tablist' || role === 'tab' || role === 'tabpanel') {
    return { kind: 'tabs', evidence: `role=${role}` };
  }

  // 2) Component-name heuristics (capitalized JSX / Vue / RN names).
  if (DATE_COMPONENT_NAMES.test(el.tagName)) {
    return { kind: 'date-picker', evidence: `<${el.tagName}>` };
  }
  if (FILE_COMPONENT_NAMES.test(el.tagName)) {
    return { kind: 'file-upload', evidence: `<${el.tagName}>` };
  }
  if (TOGGLE_COMPONENT_NAMES.test(el.tagName)) {
    return { kind: 'toggle', evidence: `<${el.tagName}>` };
  }
  if (SEARCH_COMPONENT_NAMES.test(el.tagName)) {
    return { kind: 'search', evidence: `<${el.tagName}>` };
  }
  if (TABS_COMPONENT_NAMES.test(el.tagName)) {
    return { kind: 'tabs', evidence: `<${el.tagName}>` };
  }
  if (MODAL_COMPONENT_NAMES.test(el.tagName)) {
    return { kind: 'modal', evidence: `<${el.tagName}>` };
  }
  if (NAV_COMPONENT_NAMES.test(el.tagName)) {
    return { kind: 'navigation', evidence: `<${el.tagName}>` };
  }

  // 3) Fall back to the inventory taxonomy (covers e.g. className-detected
  // navigation regions that didn't match the rules above).
  if (el.type === 'navigation') {
    return { kind: 'navigation', evidence: `type=navigation` };
  }
  if (el.type === 'modal' || el.type === 'dialog') {
    return { kind: 'modal', evidence: `type=${el.type}` };
  }
  if (el.type === 'tab') {
    return { kind: 'tabs', evidence: 'type=tab' };
  }

  return null;
}

/* ------------------------------------------------------------------ */
/* Per-pattern a11y heuristics                                         */
/* ------------------------------------------------------------------ */

function nameOf(el: UIElement): string {
  return (
    el.attrs['aria-label'] ||
    el.attrs['aria-labelledby'] ||
    el.attrs.title ||
    el.attrs.placeholder ||
    el.attrs.alt ||
    el.text ||
    ''
  ).trim();
}

function check(
  label: string,
  ok: boolean,
  detail: string,
  failWhen: 'fail' | 'info' = 'fail',
): PatternCheck {
  return { label, status: ok ? 'pass' : failWhen, detail };
}

function runChecks(kind: PatternKind, anchor: UIElement, members: UIElement[]): PatternCheck[] {
  switch (kind) {
    case 'date-picker': {
      const named = nameOf(anchor).length > 0;
      return [
        check('Has accessible name', named, named ? `"${nameOf(anchor)}"` : 'No label, aria-label, or placeholder'),
      ];
    }
    case 'file-upload': {
      const named = nameOf(anchor).length > 0;
      const accept = anchor.attrs.accept;
      return [
        check('Has accessible name', named, named ? `"${nameOf(anchor)}"` : 'Add aria-label or visible label'),
        check(
          'Restricts file types',
          !!accept,
          accept ? `accept="${accept}"` : 'No accept attribute — anything goes',
          'info',
        ),
      ];
    }
    case 'navigation': {
      const named = !!anchor.attrs['aria-label'] || !!anchor.attrs['aria-labelledby'];
      return [
        check(
          'Landmark is labeled',
          named,
          named
            ? `aria-label="${anchor.attrs['aria-label'] ?? anchor.attrs['aria-labelledby']}"`
            : 'Two navs without aria-label confuse screen readers',
          'info',
        ),
      ];
    }
    case 'modal': {
      const hasAriaModal = anchor.attrs['aria-modal'] === 'true';
      const hasName =
        !!anchor.attrs['aria-label'] || !!anchor.attrs['aria-labelledby'];
      return [
        check('aria-modal="true"', hasAriaModal, hasAriaModal ? 'set' : 'Missing — focus may leak'),
        check(
          'Has accessible name',
          hasName,
          hasName
            ? 'aria-label / aria-labelledby present'
            : 'Set aria-labelledby pointing at the dialog title',
        ),
      ];
    }
    case 'toggle': {
      const isSwitch =
        anchor.attrs.role === 'switch' || /^(switch|toggle)/i.test(anchor.tagName);
      const hasState =
        'aria-checked' in anchor.attrs ||
        'checked' in anchor.attrs ||
        anchor.tagName.toLowerCase() === 'input';
      const named = nameOf(anchor).length > 0;
      return [
        check('Uses switch role / native control', isSwitch, isSwitch ? 'role=switch or Switch component' : 'Use role="switch"'),
        check('Exposes on/off state', hasState, hasState ? 'aria-checked / checked present' : 'Add aria-checked to mirror state'),
        check('Has accessible name', named, named ? `"${nameOf(anchor)}"` : 'Add a label or aria-label'),
      ];
    }
    case 'search': {
      const named = nameOf(anchor).length > 0;
      const isLandmark =
        anchor.tagName.toLowerCase() === 'form' &&
        (anchor.attrs.role ?? '').toLowerCase() === 'search';
      return [
        check('Has accessible name', named, named ? `"${nameOf(anchor)}"` : 'Add label / aria-label'),
        check(
          'Wrapped in search landmark',
          isLandmark,
          isLandmark ? 'form[role=search]' : 'Wrap in <form role="search"> for landmark navigation',
          'info',
        ),
      ];
    }
    case 'tabs': {
      const tabs = members.filter(
        (m) => (m.attrs.role ?? '').toLowerCase() === 'tab' || /^tab$/i.test(m.tagName),
      );
      const hasTabs = tabs.length > 0;
      const allSelected = tabs.every((t) => 'aria-selected' in t.attrs);
      return [
        check('tablist has tab children', hasTabs, hasTabs ? `${tabs.length} tab(s) grouped` : 'No tabs found in the same file'),
        check(
          'All tabs expose aria-selected',
          tabs.length === 0 ? true : allSelected,
          allSelected ? 'every tab has aria-selected' : 'Some tabs are missing aria-selected',
        ),
      ];
    }
  }
}

/* ------------------------------------------------------------------ */
/* Public entry point                                                  */
/* ------------------------------------------------------------------ */

function emptyCounts(): Record<PatternKind, number> {
  const out = {} as Record<PatternKind, number>;
  for (const k of PATTERN_KINDS) out[k] = 0;
  return out;
}

export function recognizePatterns(elements: UIElement[]): PatternReport {
  // First pass — classify each element.
  const matches = elements
    .map((el) => ({ el, match: classify(el) }))
    .filter((m): m is { el: UIElement; match: Match } => m.match !== null);

  // For tabs we want one instance per tablist anchor that bundles its tab
  // children from the same file (or per Tabs component if no tablist exists).
  const tablistAnchors = matches.filter(
    (m) =>
      m.match.kind === 'tabs' &&
      ((m.el.attrs.role ?? '').toLowerCase() === 'tablist' ||
        /^tabs$|^tablist$/i.test(m.el.tagName)),
  );

  const instances: PatternInstance[] = [];
  const tabsHandled = new Set<UIElement>();

  for (const { el, match } of tablistAnchors) {
    const tabsInFile = matches
      .filter(
        (m) =>
          m.match.kind === 'tabs' &&
          m.el !== el &&
          m.el.file === el.file &&
          ((m.el.attrs.role ?? '').toLowerCase() === 'tab' ||
            /^tab$/i.test(m.el.tagName) ||
            (m.el.attrs.role ?? '').toLowerCase() === 'tabpanel'),
      )
      .map((m) => m.el);
    const members = tabsInFile;
    members.forEach((t) => tabsHandled.add(t));
    instances.push({
      id: `${el.id}:tabs`,
      kind: 'tabs',
      anchor: el,
      members,
      evidence: match.evidence,
      checks: runChecks('tabs', el, members),
    });
    tabsHandled.add(el);
  }

  for (const { el, match } of matches) {
    if (match.kind === 'tabs' && tabsHandled.has(el)) continue;
    instances.push({
      id: `${el.id}:${match.kind}`,
      kind: match.kind,
      anchor: el,
      members: [],
      evidence: match.evidence,
      checks: runChecks(match.kind, el, []),
    });
  }

  const countsByKind = emptyCounts();
  for (const inst of instances) countsByKind[inst.kind]++;

  return { patterns: instances, countsByKind };
}
