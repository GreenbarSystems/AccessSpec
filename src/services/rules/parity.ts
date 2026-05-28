/**
 * Platform-parity rules.
 *
 * These flag patterns that drift from what a native iOS or Android user
 * expects — typically because the dev rolled their own component instead of
 * using the platform primitive. The Simulator page deepens this comparison;
 * here we just spot the divergences worth surfacing in the score.
 */

import { accessibleName, type Rule } from '../RuleEngine';

const NATIVE_BUTTON_NAMES = new Set([
  'button',
  'input',
  'touchableopacity',
  'touchablehighlight',
  'touchablewithoutfeedback',
  'touchablenativefeedback',
  'pressable',
]);

const NATIVE_INPUT_NAMES = new Set([
  'input',
  'textarea',
  'select',
  'option',
  'textinput',
  'switch',
  'slider',
  'picker',
]);

export const parityRules: Rule[] = [
  {
    id: 'PAR-BUTTON-NATIVE',
    category: 'parity',
    severity: 'warning',
    description:
      'Buttons should use a native button element so platform focus, haptics, and shortcuts work.',
    spec: 'Apple HIG · Buttons · Material 3 · Buttons',
    suggestedFix: {
      summary:
        'Use <button> on the web, Pressable / TouchableOpacity in React Native, instead of div/span+onClick.',
      example: {
        bad: '<span onClick={save}>Save</span>',
        good: '<button type="button" onClick={save}>Save</button>',
        language: 'jsx',
      },
    },
    check: (el) => {
      if (el.type !== 'button') return null;
      const tag = el.tagName.toLowerCase();
      if (NATIVE_BUTTON_NAMES.has(tag)) return null;
      // Component names ending in Button (e.g. IconButton) get a pass.
      if (/button$/i.test(el.tagName)) return null;
      return {
        message: `<${el.tagName}> styled as a button — use native button / Pressable`,
        context: { tagName: el.tagName },
      };
    },
  },
  {
    id: 'PAR-INPUT-NATIVE',
    category: 'parity',
    severity: 'warning',
    description:
      'Custom text inputs miss platform features like autofill and inline keyboards.',
    spec: 'Apple HIG · Text fields · Material 3 · Text fields',
    suggestedFix: {
      summary:
        'Use <input> / <textarea> / <select> on the web or React Native TextInput so the keyboard and autofill arrive for free.',
      example: {
        bad: '<div contentEditable role="textbox">…</div>',
        good: '<input type="email" name="email" autoComplete="email" />',
        language: 'jsx',
      },
    },
    check: (el) => {
      if (el.type !== 'input') return null;
      const tag = el.tagName.toLowerCase();
      if (NATIVE_INPUT_NAMES.has(tag)) return null;
      if (/(input|textfield|textarea|select|combobox|switch|slider)$/i.test(el.tagName)) {
        return null;
      }
      return {
        message: `<${el.tagName}> acting as an input — use native input or TextInput`,
      };
    },
  },
  {
    id: 'PAR-TAB-SELECTED',
    category: 'parity',
    severity: 'warning',
    description:
      'Tabs must expose aria-selected so platform a11y APIs report the active tab.',
    spec: 'WAI-ARIA APG · Tabs',
    suggestedFix: {
      summary:
        'Toggle aria-selected on each tab; VoiceOver and TalkBack announce the active one.',
      example: {
        bad: '<button role="tab">Inbox</button>',
        good: '<button role="tab" aria-selected={isActive}>Inbox</button>',
        language: 'jsx',
      },
    },
    check: (el) => {
      if (el.type !== 'tab') return null;
      // Skip the tablist container — the rule targets individual tab items.
      const role = (el.attrs.role ?? '').toLowerCase();
      if (role !== 'tab' && !/tab$/i.test(el.tagName)) return null;
      if ('aria-selected' in el.attrs) return null;
      return { message: 'Tab is missing aria-selected' };
    },
  },
  {
    id: 'PAR-INPUT-AUTOCOMPLETE',
    category: 'parity',
    severity: 'info',
    description: 'Form inputs should hint at iOS / Android autofill via autocomplete.',
    spec: 'WCAG 2.2 · 1.3.5 Identify Input Purpose',
    suggestedFix: {
      summary:
        'Add the appropriate autocomplete token so iOS Password AutoFill and Android Smart Lock can populate the field.',
      example: {
        bad: '<input type="email" name="email" />',
        good: '<input type="email" name="email" autocomplete="email" />',
        language: 'html',
      },
      notes: [
        'See HTML Living Standard for the full token list (current-password, name, tel, etc.).',
      ],
    },
    check: (el) => {
      if (el.type !== 'input') return null;
      const tag = el.tagName.toLowerCase();
      const typeAttr = (el.attrs.type ?? '').toLowerCase();
      if (typeAttr === 'hidden' || typeAttr === 'submit' || typeAttr === 'button') return null;
      if (tag !== 'input' && tag !== 'textinput') return null;
      if (el.attrs.autocomplete || el.attrs.autoComplete) return null;
      return { message: 'Input lacks autocomplete hint (no platform autofill)' };
    },
  },
  {
    id: 'PAR-NAV-LABEL',
    category: 'parity',
    severity: 'info',
    description:
      'Multiple navigation landmarks on one screen confuse VoiceOver and TalkBack without labels.',
    spec: 'WAI-ARIA APG · Landmark Regions',
    suggestedFix: {
      summary:
        'Give each <nav> an aria-label so screen-reader landmark menus list distinct entries.',
      example: {
        bad: '<nav>…</nav>',
        good: '<nav aria-label="Primary">…</nav>',
        language: 'html',
      },
    },
    check: (el) => {
      if (el.type !== 'navigation') return null;
      if (accessibleName(el).length > 0) return null;
      return { message: 'Navigation has no aria-label' };
    },
  },
  {
    id: 'PAR-DIALOG-MODAL',
    category: 'parity',
    severity: 'info',
    description:
      'Native modals trap focus; web modals should declare aria-modal so platforms match.',
    spec: 'WAI-ARIA APG · Modal Dialog',
    suggestedFix: {
      summary:
        'Add aria-modal="true" so assistive tech and platforms know the dialog is modal.',
      example: {
        bad: '<div role="dialog">…</div>',
        good: '<div role="dialog" aria-modal="true" aria-labelledby="title">…</div>',
        language: 'html',
      },
    },
    check: (el) => {
      if (el.type !== 'dialog' && el.type !== 'modal') return null;
      if ('aria-modal' in el.attrs) return null;
      return { message: `${el.type} is missing aria-modal` };
    },
  },
];
