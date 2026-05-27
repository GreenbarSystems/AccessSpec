/**
 * statusGlyphs
 *
 * Canonical single-character glyph set for status / severity / verdict
 * indicators across the AccessSpec UI. Lives in one place so panels can
 * agree on what "pass" or "info" looks like instead of each one picking
 * an emoji.
 *
 * Rules of thumb:
 *  - Use these for ANY badge, chip, pill, or empty-state callout that
 *    conveys a pass / fail / unknown / severity meaning.
 *  - Pair the glyph with a text label and the appropriate Tailwind tone
 *    class so colour-blind users still get the signal.
 *  - Decorative "kind" icons (Eye for visibility, Palette for contrast,
 *    Hand for touch, etc., all from lucide-react) are NOT status icons —
 *    keep using them as-is.
 *
 * The glyphs are deliberately monochrome typographic characters (not
 * emoji) so they inherit text colour from the surrounding tone class and
 * render at a consistent baseline across platforms.
 */

export const STATUS_GLYPH = {
  /** Verdict: pass / met / fits / good. */
  pass: '✓',
  /** Verdict: fail / unmet / scrolls / bad. */
  fail: '✗',
  /** Verdict: warning / partial / custom / clipped. */
  warn: '⚠',
  /** Verdict: informational / neutral note. */
  info: 'ⓘ',
  /** Verdict: unmeasurable / not applicable / missing data. */
  unknown: '?',
  /** Verdict: skipped / dismissed. */
  skipped: '—',
} as const;

export type StatusKind = keyof typeof STATUS_GLYPH;

/**
 * Severity → glyph mapping for the rule engine's three-level severity
 * model (critical / warning / info). These mirror the badge tone classes
 * already used by FindingsList, RemediationPlaybook, RefactoringPanel,
 * AssistantPanel, RuntimeAuditPanel, and ScreenshotAnalysisPanel.
 */
export const SEVERITY_GLYPH = {
  critical: STATUS_GLYPH.fail,
  warning: STATUS_GLYPH.warn,
  info: STATUS_GLYPH.info,
} as const;
