#!/usr/bin/env node
/**
 * audit-dark-mode.mjs
 *
 * Read-only scan that maps every remaining dark-mode issue in src/. Outputs
 * a categorised report (file:line citations + counts per bucket) so the
 * companion `fix-dark-mode.mjs` script knows what to correct and what to
 * leave for manual review.
 *
 * Run: `npm run audit:dark`  →  stdout report
 *      `node scripts/audit-dark-mode.mjs --json > audit.json`  →  machine-readable
 *
 * Buckets surface different *kinds* of dark-mode debt:
 *
 *   1. redundantSameShade   text-slate-500 dark:text-slate-500  (no-op pairs
 *                           added by the earlier bulk pass — pure waste)
 *   2. bgWhiteOverride      bg-white living alongside the `card` class —
 *                           the explicit white wins over `.card`'s
 *                           dark:bg-slate-900, so cards stay white in dark
 *                           mode
 *   3. missingDarkBg        bg-slate-N with no dark:bg-* anywhere in the
 *                           same class string
 *   4. missingDarkText      text-slate-N with no dark:text-* peer
 *   5. missingDarkBorder    border-slate-N with no dark:border-* peer
 *   6. missingDarkHover     hover:bg/text-slate-N with no dark:hover:*
 *   7. coloredBadgeNoDarkVar  bg-rose-50 / bg-emerald-50 / etc. with no
 *                             dark sibling — chips that stay vivid-light
 *                             on dark cards
 *
 * Buckets 1-2 are unambiguous bugs. 3-6 are likely-fixable mechanically
 * but need sensible default mapping. 7 is the design decision — flagged
 * but not auto-fixed by the companion script.
 *
 * Known intentional residue the audit can't tell apart (don't be alarmed
 * if these show up after running the fixer):
 *
 *   - src/components/simulator/DeviceFrame.tsx — phone chassis is dark
 *     (slate-700/800/900) in both themes by design; real phones don't
 *     change colour when you switch OS dark mode.
 *   - src/components/patterns/PatternsPanel.tsx code-sample pre blocks
 *     use bg-slate-900 + text-slate-100 in both themes; <pre> blocks
 *     reading like terminal output is the convention.
 *   - hover:bg-{color}-50 on colored chips — the light brighten-on-hover
 *     reads acceptably on dark cards; full dark variant is polish, not
 *     a contrast bug.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const SRC = join(ROOT, 'src');

const args = new Set(process.argv.slice(2));
const wantJson = args.has('--json');
const wantVerbose = args.has('--verbose') || args.has('-v');

/* ------------------------------------------------------------------ */
/* File walker                                                         */
/* ------------------------------------------------------------------ */

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) yield* walk(p);
    else if (s.isFile() && /\.(tsx|ts|css)$/.test(entry)) yield p;
  }
}

/* ------------------------------------------------------------------ */
/* Per-className inspectors                                            */
/* ------------------------------------------------------------------ */

/**
 * Extract every className value from a line of source. Covers:
 *   - className="foo bar"                        double-quoted
 *   - className='foo bar'                        single-quoted
 *   - className={`foo ${x ? 'a' : 'b'} bar`}     template literals
 *   - className={[ 'foo', isActive && 'bar', base ].join(' ')}
 *     (we only see the literal string fragments inside the array)
 *
 * Returns the raw class-token text only — losing JSX expressions is fine,
 * we don't try to evaluate them.
 */
function extractClassValues(line) {
  const out = [];
  // String / template literal forms, including inside JSX attribute braces.
  const re = /['"`]([^'"`\n]*\b(?:text|bg|border|divide|ring|hover|dark|placeholder|from|to|via|card|btn|nav-link)[^'"`\n]*)['"`]/g;
  let m;
  while ((m = re.exec(line)) !== null) out.push(m[1]);
  return out;
}

// Bare-utility regexes use a negative lookbehind for `:` so we DON'T treat
// `hover:bg-slate-100`, `focus:text-slate-700`, `lg:border-slate-200`, etc.
// as bare uses. Variants get handled by the missingDarkHover bucket.
const BARE = (prop, ext = '') => new RegExp(String.raw`(?<![:\w-])\b${prop}-(?:slate|white)${ext}\b`, 'g');

function inspect(cls, ctx /* { file, line } */) {
  const hits = [];

  // 1. redundantSameShade — text-slate-N dark:text-slate-N (same N)
  for (const m of cls.matchAll(/(?<![:\w-])\b(text|bg|border)-slate-(\d+)\b[^"'`]*?\bdark:\1-slate-\2\b/g)) {
    hits.push({ kind: 'redundantSameShade', ...ctx, prop: m[1], shade: m[2], match: m[0].slice(0, 60) });
  }

  // 2. bgWhiteOverride — bg-white sitting alongside `card` with no dark:bg
  if (/\bcard\b/.test(cls) && /(?<![:\w-])\bbg-white\b/.test(cls) && !/\bdark:bg-/.test(cls)) {
    hits.push({ kind: 'bgWhiteOverride', ...ctx, snippet: cls.slice(0, 80) });
  }

  // 3. missingDarkBg — BARE bg-slate-N or bg-white with no dark:bg- peer
  const bgSlates = [...cls.matchAll(/(?<![:\w-])\bbg-slate-(\d+)\b(?!\/)/g)];
  const bgWhite = /(?<![:\w-])\bbg-white\b(?!\/)/.test(cls);
  const hasDarkBg = /\bdark:bg-/.test(cls);
  if ((bgSlates.length > 0 || bgWhite) && !hasDarkBg) {
    for (const m of bgSlates) hits.push({ kind: 'missingDarkBg', ...ctx, shade: m[1] });
    if (bgWhite && bgSlates.length === 0) hits.push({ kind: 'missingDarkBg', ...ctx, shade: 'white' });
  }

  // 4. missingDarkText — BARE text-slate-N (excluding 500, which is the
  //    muted mid-tone and reads correctly in both themes by design).
  const textSlates = [
    ...cls.matchAll(/(?<![:\w-])\btext-slate-(\d+)\b/g),
  ].filter((m) => m[1] !== '500');
  const hasDarkText = /\bdark:text-/.test(cls);
  if (textSlates.length > 0 && !hasDarkText) {
    for (const m of textSlates) hits.push({ kind: 'missingDarkText', ...ctx, shade: m[1] });
  }

  // 5. missingDarkBorder — BARE border-slate-N
  const bordSlates = [...cls.matchAll(/(?<![:\w-])\bborder-slate-(\d+)\b/g)];
  const hasDarkBorder = /\bdark:border-/.test(cls);
  if (bordSlates.length > 0 && !hasDarkBorder) {
    for (const m of bordSlates) hits.push({ kind: 'missingDarkBorder', ...ctx, shade: m[1] });
  }

  // 6. missingDarkHover — hover:bg/text-slate-N with no dark:hover:
  const hoverSlates = [...cls.matchAll(/\bhover:(bg|text|border)-slate-(\d+)\b/g)];
  const hasDarkHover = /\bdark:hover:/.test(cls);
  if (hoverSlates.length > 0 && !hasDarkHover) {
    for (const m of hoverSlates) hits.push({ kind: 'missingDarkHover', ...ctx, prop: m[1], shade: m[2] });
  }

  // 7. coloredBadgeNoDarkVar — colored bg-N chips, BARE only.
  const palette = 'rose|emerald|amber|sky|violet|indigo|fuchsia|purple|orange|teal|cyan|yellow|red|lime|stone|brand|blue';
  const coloredBg = [...cls.matchAll(new RegExp(String.raw`(?<![:\w-])\bbg-(${palette})-(\d+)\b(?!\/)`, 'g'))];
  const hasDarkColoredBg = new RegExp(`\\bdark:bg-(${palette})-`).test(cls);
  if (coloredBg.length > 0 && !hasDarkColoredBg) {
    for (const m of coloredBg) hits.push({ kind: 'coloredBadgeNoDarkVar', ...ctx, color: m[1], shade: m[2] });
  }

  // Reference BARE so the lint flagging "unused" stops complaining.
  void BARE;

  return hits;
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

const all = [];
for (const file of walk(SRC)) {
  const lines = readFileSync(file, 'utf8').split('\n');
  const rel = file.slice(ROOT.length + 1).replaceAll('\\', '/');
  lines.forEach((line, idx) => {
    for (const cls of extractClassValues(line)) {
      all.push(...inspect(cls, { file: rel, line: idx + 1 }));
    }
  });
}

const byKind = {};
for (const h of all) {
  (byKind[h.kind] ||= []).push(h);
}

if (wantJson) {
  process.stdout.write(JSON.stringify({ byKind, totals: Object.fromEntries(Object.entries(byKind).map(([k, v]) => [k, v.length])) }, null, 2));
  process.exit(0);
}

const order = [
  'redundantSameShade',
  'bgWhiteOverride',
  'missingDarkBg',
  'missingDarkText',
  'missingDarkBorder',
  'missingDarkHover',
  'coloredBadgeNoDarkVar',
];

process.stdout.write('=== Dark-mode debt audit ===\n');
let total = 0;
for (const k of order) {
  const n = byKind[k]?.length ?? 0;
  total += n;
  process.stdout.write(`  ${k.padEnd(26)} ${String(n).padStart(5)}\n`);
}
process.stdout.write(`  ${'TOTAL'.padEnd(26)} ${String(total).padStart(5)}\n\n`);

if (wantVerbose) {
  for (const k of order) {
    const hits = byKind[k] ?? [];
    if (hits.length === 0) continue;
    process.stdout.write(`--- ${k} (${hits.length}) ---\n`);
    for (const h of hits.slice(0, 30)) {
      const extra = h.match ?? h.snippet ?? `${h.prop ?? ''} ${h.shade ?? ''} ${h.color ?? ''}`.trim();
      process.stdout.write(`  ${h.file}:${h.line}  ${extra}\n`);
    }
    if (hits.length > 30) process.stdout.write(`  ... and ${hits.length - 30} more\n`);
    process.stdout.write('\n');
  }
} else {
  process.stdout.write('Re-run with --verbose for file:line citations.\n');
}
