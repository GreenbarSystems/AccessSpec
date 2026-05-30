import type { ReactNode } from 'react';

/**
 * Glossary
 *
 * Dep-free, accessibility-friendly tooltip for jargon. Renders as a
 * dotted-underlined inline element that exposes its definition via the
 * `title` attribute (which every browser turns into a hover tooltip and
 * every screen reader announces).
 *
 * Why <abbr>:
 *   - Browsers render the dotted underline natively
 *   - AT (screen readers) announce the title as the expansion
 *   - No JavaScript needed, no portal, no escape-to-close logic
 *   - Mobile users get a long-press affordance for free on most platforms
 *
 * Pair with the canonical GLOSSARY_TERMS table so the definitions live in
 * one place — if WCAG goes to 3.0 we update one string and every wrap
 * inherits.
 */

export type GlossaryTerm = keyof typeof GLOSSARY_TERMS;

/**
 * Canonical, plain-English definitions. Each one fits in a tooltip — keep
 * them short. Surface the longer write-ups in dedicated panels (the
 * Reports → Assistant tab is the best home for in-depth explanation).
 */
export const GLOSSARY_TERMS = {
  WCAG:
    'Web Content Accessibility Guidelines — the international standard for digital accessibility. WCAG 2.2 is the version this dashboard checks against.',
  AA:
    'WCAG conformance level for the general public. Meets most accessibility needs and is the legal target in many jurisdictions.',
  AAA:
    'WCAG conformance level for high-stakes content (medical, government). Stricter than AA — most apps aim for AA, AAA where they can.',
  parity:
    'How closely your component behaves like its native iOS / Android equivalent. A "Save" button styled as a div is parity-failing because it skips system focus, haptics, and keyboard handling.',
  reflow:
    'WCAG 2.2 SC 1.4.10 — content should reflow into a narrow viewport (320 CSS px) without horizontal scrolling. The Analyzer → Reflow tab tests this.',
  'dynamic type':
    'iOS user setting that scales text site-wide. Android calls it Font Scale. Both expect text in rem / sp, not hard-coded px.',
  WCAG22:
    'WCAG 2.2 — the latest version of the Web Content Accessibility Guidelines (October 2023). Adds 9 new success criteria over 2.1, several of them mobile-focused.',
} as const;

type Props = {
  /** Key into GLOSSARY_TERMS. */
  term: GlossaryTerm;
  /** Optional override for what's rendered (defaults to the term itself). */
  children?: ReactNode;
};

export function Glossary({ term, children }: Props) {
  // <abbr> is the right semantic primitive: AT reads the title as the
  // expansion, browsers render a dotted underline, mouse users get a
  // tooltip on hover, touch users get a long-press affordance.
  return (
    <abbr
      title={GLOSSARY_TERMS[term]}
      className="cursor-help underline decoration-dotted decoration-slate-400 underline-offset-2 hover:decoration-slate-700 dark:decoration-slate-500 dark:hover:decoration-slate-300"
      data-glossary={term}
    >
      {children ?? term}
    </abbr>
  );
}
