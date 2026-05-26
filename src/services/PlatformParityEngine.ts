/**
 * PlatformParityEngine
 *
 * Pulls together everything the other three engines already know:
 *
 *   PatternRecognizer  → "this DIV is a Modal"
 *   IOSPatterns        → "iOS map: UIViewController.present + .sheet"
 *   AndroidPatterns    → "Android map: BottomSheetDialogFragment + ModalBottomSheet"
 *
 * …and turns the trio into a per-component **parity report**: how close is
 * the user's *current* implementation to what each platform would actually
 * use? The report drives a three-column UI (Current / iOS / Android) with
 * gap callouts the reviewer can act on.
 *
 * Verdicts
 *   - `native`  — current implementation uses the canonical web semantic
 *     (`<dialog>`, `<input type="date">`, `role="switch"`, …). Native APIs
 *     come along for free; the gaps section just maps it to UIKit/Compose.
 *   - `custom`  — current implementation is a JSX/Vue component (capitalized
 *     name like `<Modal>`, `<Dropzone>`). It *could* wrap the native API
 *     correctly, but we don't know — flagged as "verify".
 *   - `generic` — current implementation is a plain `<div>` / `<span>` with
 *     a className or `data-component` hint. Definitely needs work to ship
 *     native parity on both platforms.
 */

import type { UIElement } from './ComponentDetector';
import {
  recognizePatterns,
  type PatternInstance,
  type PatternKind,
} from './PatternRecognizer';
import { iosMappingFor, type IOSMapping } from './IOSPatterns';
import { androidMappingFor, type AndroidMapping } from './AndroidPatterns';

export type ParityVerdict = 'native' | 'custom' | 'generic';

export type ParityRow = {
  id: string;
  kind: PatternKind;
  pattern: PatternInstance;
  current: {
    tagName: string;
    role: string;
    file: string;
    line: number;
    text: string;
    verdict: ParityVerdict;
    /** One-line explanation behind the verdict. */
    note: string;
  };
  ios: IOSMapping;
  android: AndroidMapping;
  /** Cross-platform actions the reviewer should take. */
  gaps: string[];
};

export type ParityReport = {
  rows: ParityRow[];
  countsByKind: Record<PatternKind, number>;
  verdictCounts: Record<ParityVerdict, number>;
};

/* ------------------------------------------------------------------ */
/* Verdict logic                                                       */
/* ------------------------------------------------------------------ */

/**
 * Tags that count as the canonical native-web semantic for a given pattern.
 * Empty array means there's no native HTML element and the verdict relies on
 * ARIA role hints.
 */
const NATIVE_TAGS: Record<PatternKind, readonly string[]> = {
  'date-picker': ['input'],
  'file-upload': ['input'],
  navigation: ['nav'],
  modal: ['dialog'],
  toggle: [],
  search: ['input', 'form'],
  tabs: [],
};

/** Roles that, when explicit, count as native semantics for a pattern. */
const NATIVE_ROLES: Record<PatternKind, readonly string[]> = {
  'date-picker': [],
  'file-upload': [],
  navigation: ['navigation', 'menubar'],
  modal: ['dialog', 'alertdialog'],
  toggle: ['switch'],
  search: ['search'],
  tabs: ['tablist', 'tab', 'tabpanel'],
};

function classifyCurrent(p: PatternInstance): {
  verdict: ParityVerdict;
  note: string;
} {
  const tag = p.anchor.tagName.toLowerCase();
  const role = (p.anchor.attrs.role ?? '').toLowerCase();
  const type = (p.anchor.attrs.type ?? '').toLowerCase();

  // Native HTML semantic wins outright. For <input>-based patterns we also
  // require the matching `type=` so a plain text input isn't called "native"
  // for date / file / search.
  if (NATIVE_TAGS[p.kind].includes(tag)) {
    const typed =
      tag !== 'input' ||
      (p.kind === 'date-picker' && /^(date|datetime-local|month|week|time)$/.test(type)) ||
      (p.kind === 'file-upload' && type === 'file') ||
      (p.kind === 'search' && type === 'search');
    if (typed || tag !== 'input') {
      return {
        verdict: 'native',
        note: `Native HTML semantic <${tag}${tag === 'input' && type ? ` type="${type}"` : ''}>`,
      };
    }
  }

  if (role && NATIVE_ROLES[p.kind].includes(role)) {
    return { verdict: 'native', note: `Uses ARIA role="${role}"` };
  }

  // Capitalized → JSX/Vue named component. Treat as "custom" — the component
  // *may* delegate to a native API, but we can't see inside it.
  if (/^[A-Z]/.test(p.anchor.tagName) || p.anchor.tagName.includes('.')) {
    return {
      verdict: 'custom',
      note: `Custom component <${p.anchor.tagName}> — verify it wraps a native primitive`,
    };
  }

  return {
    verdict: 'generic',
    note: `Generic <${tag}> — no platform-aligned semantic`,
  };
}

function buildGaps(
  verdict: ParityVerdict,
  ios: IOSMapping,
  android: AndroidMapping,
): string[] {
  switch (verdict) {
    case 'native':
      return [
        `iOS · render as ${ios.swiftui} (UIKit: ${ios.uikit})`,
        `Android · render as ${android.compose} (Views: ${android.views})`,
      ];
    case 'custom':
      return [
        `Verify the wrapped iOS implementation uses ${ios.swiftui}`,
        `Verify the wrapped Android implementation uses ${android.compose}`,
      ];
    case 'generic':
      return [
        `Replace with a semantic native primitive`,
        `iOS gap · adopt ${ios.uikit} / ${ios.swiftui}`,
        `Android gap · adopt ${android.views} / ${android.compose}`,
      ];
  }
}

/* ------------------------------------------------------------------ */
/* Public entry point                                                  */
/* ------------------------------------------------------------------ */

function emptyKindCounts(): Record<PatternKind, number> {
  return {
    'date-picker': 0,
    'file-upload': 0,
    navigation: 0,
    modal: 0,
    toggle: 0,
    search: 0,
    tabs: 0,
  };
}

function emptyVerdictCounts(): Record<ParityVerdict, number> {
  return { native: 0, custom: 0, generic: 0 };
}

export function analyzeParity(elements: UIElement[]): ParityReport {
  const { patterns } = recognizePatterns(elements);
  const rows: ParityRow[] = [];
  const countsByKind = emptyKindCounts();
  const verdictCounts = emptyVerdictCounts();

  for (const pattern of patterns) {
    const ios = iosMappingFor(pattern.kind);
    const android = androidMappingFor(pattern.kind);
    const current = classifyCurrent(pattern);
    rows.push({
      id: `${pattern.id}:parity`,
      kind: pattern.kind,
      pattern,
      current: {
        tagName: pattern.anchor.tagName,
        role: pattern.anchor.attrs.role ?? '',
        file: pattern.anchor.file,
        line: pattern.anchor.line,
        text: pattern.anchor.text,
        verdict: current.verdict,
        note: current.note,
      },
      ios,
      android,
      gaps: buildGaps(current.verdict, ios, android),
    });
    countsByKind[pattern.kind]++;
    verdictCounts[current.verdict]++;
  }

  return { rows, countsByKind, verdictCounts };
}
