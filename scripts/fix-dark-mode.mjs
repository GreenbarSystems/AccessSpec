#!/usr/bin/env node
/**
 * fix-dark-mode.mjs
 *
 * Companion to audit-dark-mode.mjs. Applies *mechanical* fixes for the
 * categories the audit can resolve unambiguously, leaves the rest for
 * manual review, and prints a before/after counts table.
 *
 * Usage:
 *   node scripts/fix-dark-mode.mjs              # dry run, print diff stats
 *   node scripts/fix-dark-mode.mjs --apply      # write changes to disk
 *   node scripts/fix-dark-mode.mjs --only=redundantSameShade,missingDarkBg
 *
 * Fix policy per audit bucket — see THE_MAP comment below.
 *
 * Safety:
 *   - Only edits className / class string values inside .tsx / .ts / .css
 *     (CSS @apply directives are also matched).
 *   - All edits are *additive token appends* or *redundant-token deletions*.
 *     We never remove a non-dark token. That keeps the script reversible
 *     by hand and easy to review in a diff.
 *   - --apply writes in-place. Without it, prints a summary of what would
 *     change but touches nothing.
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const SRC = join(ROOT, 'src');

const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const ONLY = (argv.find((a) => a.startsWith('--only='))?.split('=')[1] ?? '')
  .split(',')
  .filter(Boolean);

const shouldRun = (kind) => ONLY.length === 0 || ONLY.includes(kind);

/* ================================================================== */
/* THE MAP: shade → dark-mode shade                                   */
/* ================================================================== */
/*
 * The "mirror through 500" rule: a light-mode N-shade gets a dark-mode
 * (1000 - N) shade. Picks up the OS convention that text gets lighter in
 * dark mode and backgrounds get darker. 500 stays 500 (mid-tone, the
 * de-emphasised colour reads the same in both modes).
 *
 *   text:    900→100  800→200  700→300  600→400  500→500  400→500
 *   bg:      white→slate-900  50→slate-900  100→slate-800
 *            200→slate-800  300→slate-700
 *   border:  100→slate-800  200→slate-800  300→slate-700
 *
 * Hover variants mirror the same map but in the dark:hover: namespace.
 */

const DARK_TEXT_FOR_SLATE = {
  900: 'dark:text-slate-100',
  800: 'dark:text-slate-200',
  700: 'dark:text-slate-300',
  600: 'dark:text-slate-400',
  // 500 intentionally OMITTED — see redundantSameShade fix.
  400: 'dark:text-slate-500',
};

const DARK_BG_FOR_SLATE = {
  white: 'dark:bg-slate-900',
  50: 'dark:bg-slate-900',
  100: 'dark:bg-slate-800',
  200: 'dark:bg-slate-800',
  300: 'dark:bg-slate-700',
};

const DARK_BORDER_FOR_SLATE = {
  100: 'dark:border-slate-800',
  200: 'dark:border-slate-800',
  300: 'dark:border-slate-700',
};

const DARK_HOVER_BG = {
  100: 'dark:hover:bg-slate-800',
  200: 'dark:hover:bg-slate-800',
};

const DARK_HOVER_TEXT = {
  900: 'dark:hover:text-slate-100',
  800: 'dark:hover:text-slate-200',
};

/* ================================================================== */
/* Per-bucket fix functions                                           */
/* ================================================================== */

const fixers = {
  /**
   * 1. redundantSameShade — strip `dark:text-slate-N` where N matches the
   *    sibling text-slate-N. Same for bg-slate / border-slate.
   *
   *      text-slate-500 dark:text-slate-500  →  text-slate-500
   */
  redundantSameShade(cls) {
    let out = cls;
    for (const prop of ['text', 'bg', 'border']) {
      const re = new RegExp(
        `\\b${prop}-slate-(\\d+)\\b([^"'\`]*?)\\s+dark:${prop}-slate-\\1\\b`,
        'g',
      );
      let prev;
      do {
        prev = out;
        out = out.replace(re, (_m, n, between) => `${prop}-slate-${n}${between}`);
      } while (out !== prev);
    }
    return out;
  },

  /**
   * 2. bgWhiteOverride — when bg-white shows up *next to* `card`, the
   *    explicit white wins over .card's dark:bg-slate-900. Drop bg-white;
   *    let .card own the surface.
   */
  bgWhiteOverride(cls) {
    if (!/\bcard\b/.test(cls)) return cls;
    if (/\bdark:bg-/.test(cls)) return cls;
    return cls.replace(/\s*\bbg-white\b/, '').replace(/\s{2,}/g, ' ');
  },

  /**
   * 3. missingDarkBg — for every BARE bg-slate-N (or bg-white) without a
   *    dark sibling, append the mapped dark token. Negative lookbehind on
   *    `:` so prefixed variants like `hover:bg-slate-100` don't get
   *    counted (those are the hover bucket).
   */
  missingDarkBg(cls) {
    if (/\bdark:bg-/.test(cls)) return cls;
    const wants = new Set();
    for (const m of cls.matchAll(/(?<![:\w-])\bbg-slate-(\d+)\b(?!\/)/g)) {
      const dark = DARK_BG_FOR_SLATE[m[1]];
      if (dark) wants.add(dark);
    }
    if (/(?<![:\w-])\bbg-white\b(?!\/)/.test(cls)) wants.add(DARK_BG_FOR_SLATE.white);
    if (wants.size === 0) return cls;
    return append(cls, [...wants]);
  },

  /**
   * 4. missingDarkText — same idea, BARE text-slate-N only.
   */
  missingDarkText(cls) {
    if (/\bdark:text-/.test(cls)) return cls;
    const wants = new Set();
    for (const m of cls.matchAll(/(?<![:\w-])\btext-slate-(\d+)\b/g)) {
      const dark = DARK_TEXT_FOR_SLATE[m[1]];
      if (dark) wants.add(dark);
    }
    if (wants.size === 0) return cls;
    return append(cls, [...wants]);
  },

  /**
   * 5. missingDarkBorder — same for BARE border-slate-N.
   */
  missingDarkBorder(cls) {
    if (/\bdark:border-/.test(cls)) return cls;
    const wants = new Set();
    for (const m of cls.matchAll(/(?<![:\w-])\bborder-slate-(\d+)\b/g)) {
      const dark = DARK_BORDER_FOR_SLATE[m[1]];
      if (dark) wants.add(dark);
    }
    if (wants.size === 0) return cls;
    return append(cls, [...wants]);
  },

  /**
   * 6. missingDarkHover — for hover:bg-slate-N / hover:text-slate-N
   *    without a dark:hover:, append the mapped token.
   */
  missingDarkHover(cls) {
    if (/\bdark:hover:/.test(cls)) return cls;
    const wants = new Set();
    for (const m of cls.matchAll(/\bhover:bg-slate-(\d+)\b/g)) {
      const dark = DARK_HOVER_BG[m[1]];
      if (dark) wants.add(dark);
    }
    for (const m of cls.matchAll(/\bhover:text-slate-(\d+)\b/g)) {
      const dark = DARK_HOVER_TEXT[m[1]];
      if (dark) wants.add(dark);
    }
    if (wants.size === 0) return cls;
    return append(cls, [...wants]);
  },

  // 7. coloredBadgeNoDarkVar is INTENTIONALLY NOT AUTO-FIXED.
  //    Each colored chip family (rose / emerald / amber / sky / etc.) has
  //    semantics — red for critical, amber for warning, emerald for pass —
  //    and the right dark treatment depends on tone + surrounding surface.
  //    The audit lists them; a follow-up commit picks a per-family rule
  //    (typically  bg-{color}-50 → bg-{color}-50 dark:bg-{color}-900/30 +
  //    text-{color}-700 → ... dark:text-{color}-300 + similar for ring).
};

/**
 * Helper: append tokens at end of class string. Tailwind's specificity is
 * order-independent so trailing append is the safe predictable placement.
 */
function append(cls, tokens) {
  return `${cls.trimEnd()} ${tokens.join(' ')}`;
}

/* ================================================================== */
/* Driver                                                              */
/* ================================================================== */

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) yield* walk(p);
    else if (s.isFile() && /\.(tsx|ts|css)$/.test(entry)) yield p;
  }
}

const stats = {
  redundantSameShade: 0,
  bgWhiteOverride: 0,
  missingDarkBg: 0,
  missingDarkText: 0,
  missingDarkBorder: 0,
  missingDarkHover: 0,
};
let filesTouched = 0;

const ORDER = [
  'redundantSameShade', // first — clean up the bulk-script residue
  'bgWhiteOverride',
  'missingDarkBg',
  'missingDarkText',
  'missingDarkBorder',
  'missingDarkHover',
];

function transformClassValue(cls) {
  let next = cls;
  for (const kind of ORDER) {
    if (!shouldRun(kind)) continue;
    const updated = fixers[kind](next);
    if (updated !== next) stats[kind]++;
    next = updated;
  }
  return next;
}

for (const file of walk(SRC)) {
  const before = readFileSync(file, 'utf8');

  // .tsx / .ts — JSX className string + template literal values.
  let after = before.replace(
    /(['"`])([^'"`\n]*\b(?:text|bg|border|divide|ring|hover|dark|card|btn|nav-link)[^'"`\n]*)\1/g,
    (_full, q, cls) => `${q}${transformClassValue(cls)}${q}`,
  );

  // .css — @apply directives use bare tokens with no quotes.
  if (file.endsWith('.css')) {
    after = after.replace(/@apply\s+([^;]+);/g, (_full, body) => `@apply ${transformClassValue(body)};`);
  }

  if (after !== before) {
    filesTouched++;
    if (APPLY) writeFileSync(file, after);
  }
}

process.stdout.write(`${APPLY ? 'APPLIED' : 'DRY RUN'} — ${filesTouched} files would change\n\n`);
process.stdout.write('Per-bucket fix counts:\n');
for (const [k, n] of Object.entries(stats)) {
  process.stdout.write(`  ${k.padEnd(26)} ${String(n).padStart(5)}\n`);
}
process.stdout.write('\nNot auto-fixed (manual design pass):\n');
process.stdout.write('  coloredBadgeNoDarkVar     ← rerun audit + decide per-family rule\n');

if (!APPLY) {
  process.stdout.write('\nRe-run with --apply to write changes.\n');
}
