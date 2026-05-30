/**
 * Accessibility rules (WCAG 2.2 mobile-relevant subset).
 *
 * Each rule cites the SC (success criterion) so the dashboard can link out.
 * Severity is calibrated against impact on a screen-reader user:
 *   - critical: blocks the user from operating the control
 *   - warning:  degrades clarity but the control is still usable
 *   - info:     stylistic / best-practice
 */

import { accessibleName, isInteractive, type Rule } from '../RuleEngine';

const GENERIC_LINK_TEXT = /^(click here|here|read more|learn more|more|link)$/i;

export const accessibilityRules: Rule[] = [
  {
    id: 'A11Y-NAME-MISSING',
    category: 'accessibility',
    severity: 'critical',
    description: 'Interactive controls must expose a non-empty accessible name.',
    spec: 'WCAG 2.2 · 4.1.2 Name, Role, Value',
    suggestedFix: {
      summary:
        'Give the control a label via visible text, aria-label, or aria-labelledby.',
      example: {
        bad: '<button><svg aria-hidden="true">…</svg></button>',
        good: '<button aria-label="Close dialog"><svg aria-hidden="true">…</svg></button>',
        language: 'html',
      },
      notes: [
        'Icon-only buttons need aria-label even if the icon looks self-explanatory.',
        'Avoid generic labels like "click here" — describe the action.',
      ],
    },
    check: (el) => {
      if (!isInteractive(el)) return null;
      // Hidden inputs and radio/checkbox groups are exempt (their label lives elsewhere).
      if (el.attrs.type === 'hidden') return null;
      if (accessibleName(el).length > 0) return null;
      return {
        message: `This ${el.type} has no label — screen readers can't tell users what it does.`,
        context: { tagName: el.tagName },
      };
    },
  },
  {
    id: 'A11Y-LINK-PURPOSE',
    category: 'accessibility',
    severity: 'warning',
    description:
      'Link text should describe the destination, not just say "click here".',
    spec: 'WCAG 2.2 · 2.4.4 Link Purpose (In Context)',
    suggestedFix: {
      summary:
        'Replace generic link text with a phrase that conveys the link target.',
      example: {
        bad: '<a href="/pricing">click here</a>',
        good: '<a href="/pricing">See pricing plans</a>',
        language: 'html',
      },
    },
    check: (el) => {
      if (el.type !== 'link') return null;
      const label = accessibleName(el);
      if (!label || !GENERIC_LINK_TEXT.test(label)) return null;
      return {
        message: `Link reads as just "${label}" — describe where it goes so people who tab through links know what to expect.`,
      };
    },
  },
  {
    id: 'A11Y-DIALOG-LABEL',
    category: 'accessibility',
    severity: 'warning',
    description:
      'Dialogs and modals need aria-label or aria-labelledby so the focus shift is announced.',
    spec: 'WAI-ARIA · dialog naming',
    suggestedFix: {
      summary:
        'Name the dialog with aria-labelledby (pointing at its heading) or aria-label.',
      example: {
        bad: '<dialog open>…</dialog>',
        good:
          '<dialog open aria-labelledby="confirm-title">\n  <h2 id="confirm-title">Discard changes?</h2>\n</dialog>',
        language: 'html',
      },
    },
    check: (el) => {
      if (el.type !== 'dialog' && el.type !== 'modal') return null;
      if (
        el.attrs['aria-label'] ||
        el.attrs['aria-labelledby'] ||
        accessibleName(el).length > 0
      )
        return null;
      return {
        message: `This ${el.type} isn't named — screen readers won't announce what just opened.`,
      };
    },
  },
  {
    id: 'A11Y-IMG-INPUT-ALT',
    category: 'accessibility',
    severity: 'critical',
    description: 'Image buttons need alt text describing the action.',
    spec: 'WCAG 2.2 · 1.1.1 Non-text Content',
    suggestedFix: {
      summary:
        'Add alt text describing what the image button does (not what it depicts).',
      example: {
        bad: '<input type="image" src="search.png" />',
        good: '<input type="image" src="search.png" alt="Search products" />',
        language: 'html',
      },
    },
    check: (el) => {
      if (el.type !== 'button') return null;
      if (el.tagName.toLowerCase() !== 'input') return null;
      if ((el.attrs.type ?? '').toLowerCase() !== 'image') return null;
      if (el.attrs.alt && el.attrs.alt.trim().length > 0) return null;
      return {
        message:
          'Image-only button has no alt text — screen-reader users hear nothing about what it does.',
      };
    },
  },
  {
    id: 'A11Y-TABLE-LABEL',
    category: 'accessibility',
    severity: 'info',
    description:
      'Data tables should expose a caption or aria-label so screen readers can announce them.',
    spec: 'WCAG 2.2 · 1.3.1 Info and Relationships',
    suggestedFix: {
      summary:
        'Add a <caption> as the first child, or use aria-label on the <table>.',
      example: {
        bad: '<table><thead>…</thead></table>',
        good:
          '<table>\n  <caption>Q4 sales by region</caption>\n  <thead>…</thead>\n</table>',
        language: 'html',
      },
    },
    check: (el) => {
      if (el.type !== 'table') return null;
      if (accessibleName(el).length > 0) return null;
      return {
        message:
          "Table has no caption or label — screen readers will announce it as just 'table'.",
      };
    },
  },
  {
    id: 'A11Y-FORM-NAME',
    category: 'accessibility',
    severity: 'info',
    description: 'Multi-form pages benefit from aria-label on each form.',
    spec: 'WAI-ARIA Authoring Practices · form labeling',
    suggestedFix: {
      summary:
        'Add aria-label or aria-labelledby so assistive tech can distinguish forms.',
      example: {
        bad: '<form action="/login">…</form>',
        good: '<form aria-label="Sign in" action="/login">…</form>',
        language: 'html',
      },
    },
    check: (el) => {
      if (el.type !== 'form') return null;
      if (accessibleName(el).length > 0) return null;
      return {
        message:
          'Form has no label — when there are several on a page, screen readers can\'t distinguish them.',
      };
    },
  },
];
