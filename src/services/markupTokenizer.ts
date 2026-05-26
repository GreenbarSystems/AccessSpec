/**
 * markupTokenizer
 *
 * Single hand-rolled scanner that walks HTML, Vue templates, and JSX/TSX
 * source and yields opening-tag tokens. We don't depend on a full parser
 * (no Babel, no parse5) because the detection engine only needs:
 *
 *   - the tag/component name
 *   - flat attribute name → value map
 *   - shallow visible text up to the next `<`
 *   - the 1-based line where the tag opened
 *
 * That's enough to classify a `<button>`, a `<Dialog open>`, or a
 * `<nav role="navigation">` without paying for a full AST. The trade-off:
 * malformed source or exotic JSX (spreads, fragments inside attributes)
 * may be missed — but the detector treats this as best-effort inventory,
 * not a compiler.
 */

export type Token = {
  /** Original tag/component name as written (case preserved for JSX). */
  name: string;
  /** Lowercased name — used for HTML-style lookups. */
  lowerName: string;
  /** Attribute name → raw value (sans quotes; JSX braces preserved). */
  attrs: Record<string, string>;
  /** Children text up to the first nested `<`, with `{…}` expressions stripped. */
  text: string;
  /** 1-based line where the opening tag begins. */
  line: number;
  /** True if `<Tag />`. */
  selfClosing: boolean;
};

/** Tags that never have children (HTML void elements). */
const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

const TAG_NAME_CHARS = /[A-Za-z0-9_.:-]/;
const TAG_START_CHAR = /[A-Za-z]/;
const ATTR_NAME_CHARS = /[A-Za-z0-9_:-]/;

/**
 * Tokenize a string of markup. Caller is responsible for stripping any
 * non-template wrapper first (e.g. `<script>`/`<style>` blocks in a Vue
 * SFC). For JSX we just run it over the whole module and rely on the
 * lexer's awareness of JS string/comment syntax to ignore code.
 */
export function tokenize(source: string, opts: { jsx?: boolean } = {}): Token[] {
  const out: Token[] = [];
  const isJsx = !!opts.jsx;
  const len = source.length;

  let i = 0;
  let line = 1;

  const advanceLine = (from: number, to: number) => {
    for (let p = from; p < to; p++) if (source.charCodeAt(p) === 10) line++;
  };

  while (i < len) {
    const ch = source[i];

    // -- JS-only: skip string/template/regex/comment to avoid false `<` hits.
    if (isJsx) {
      if (ch === '/' && source[i + 1] === '/') {
        const nl = source.indexOf('\n', i + 2);
        i = nl === -1 ? len : nl;
        continue;
      }
      if (ch === '/' && source[i + 1] === '*') {
        const end = source.indexOf('*/', i + 2);
        const stop = end === -1 ? len : end + 2;
        advanceLine(i, stop);
        i = stop;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === '`') {
        const start = i;
        i = skipJsString(source, i, ch);
        advanceLine(start, i);
        continue;
      }
    }

    // -- HTML comment.
    if (ch === '<' && source.startsWith('!--', i + 1)) {
      const end = source.indexOf('-->', i + 4);
      const stop = end === -1 ? len : end + 3;
      advanceLine(i, stop);
      i = stop;
      continue;
    }

    // -- HTML doctype / CDATA / processing instructions: skip until '>'.
    if (ch === '<' && source[i + 1] === '!') {
      const end = source.indexOf('>', i + 2);
      const stop = end === -1 ? len : end + 1;
      advanceLine(i, stop);
      i = stop;
      continue;
    }

    // -- Closing tag `</…>`: skip, we only care about opens.
    if (ch === '<' && source[i + 1] === '/') {
      const end = source.indexOf('>', i + 2);
      const stop = end === -1 ? len : end + 1;
      advanceLine(i, stop);
      i = stop;
      continue;
    }

    // -- Opening tag candidate.
    if (ch === '<' && TAG_START_CHAR.test(source[i + 1] ?? '')) {
      const tagLine = line;
      let j = i + 1;

      // Read tag name.
      const nameStart = j;
      while (j < len && TAG_NAME_CHARS.test(source[j])) j++;
      const name = source.slice(nameStart, j);

      // Read attributes.
      const attrs: Record<string, string> = {};
      let selfClosing = false;
      let tagClosed = false;
      while (j < len) {
        // Whitespace.
        while (j < len && /\s/.test(source[j])) j++;
        if (j >= len) break;
        if (source[j] === '/' && source[j + 1] === '>') {
          selfClosing = true;
          j += 2;
          tagClosed = true;
          break;
        }
        if (source[j] === '>') {
          j++;
          tagClosed = true;
          break;
        }
        // Attribute name.
        const attrStart = j;
        while (j < len && ATTR_NAME_CHARS.test(source[j])) j++;
        const attrName = source.slice(attrStart, j);
        if (!attrName) {
          // Unknown char inside tag — bail out, treat as non-tag.
          break;
        }
        // Optional value.
        let attrValue = '';
        // Permit whitespace around '='.
        let k = j;
        while (k < len && /\s/.test(source[k])) k++;
        if (source[k] === '=') {
          k++;
          while (k < len && /\s/.test(source[k])) k++;
          if (source[k] === '"' || source[k] === "'") {
            const q = source[k];
            const vStart = k + 1;
            const vEnd = source.indexOf(q, vStart);
            if (vEnd === -1) {
              j = len;
              break;
            }
            attrValue = source.slice(vStart, vEnd);
            k = vEnd + 1;
          } else if (source[k] === '{' && isJsx) {
            // Balanced JSX expression. Track braces, ignoring those inside strings.
            let depth = 1;
            let p = k + 1;
            while (p < len && depth > 0) {
              const c = source[p];
              if (c === '"' || c === "'" || c === '`') {
                p = skipJsString(source, p, c);
                continue;
              }
              if (c === '{') depth++;
              else if (c === '}') {
                depth--;
                if (depth === 0) break;
              }
              p++;
            }
            attrValue = '{' + source.slice(k + 1, p) + '}';
            k = p + 1;
          } else {
            // Unquoted value runs to the next whitespace or `>`/'/>'.
            const vStart = k;
            while (k < len && !/[\s>]/.test(source[k]) && source[k] !== '/') k++;
            attrValue = source.slice(vStart, k);
          }
          j = k;
        } else {
          // Boolean attribute (`disabled`, `open`, …).
          attrValue = '';
          j = k;
        }
        attrs[attrName] = attrValue;
      }

      if (!tagClosed) {
        // Malformed tag — advance past `<` and keep scanning.
        advanceLine(i, i + 1);
        i = i + 1;
        continue;
      }

      // Children text: up to the first `<` we encounter.
      let text = '';
      if (!selfClosing && !VOID_TAGS.has(name.toLowerCase())) {
        const textStart = j;
        let p = j;
        while (p < len && source[p] !== '<') p++;
        text = source.slice(textStart, p);
      }

      // Strip JSX/Vue expressions for readability.
      const cleanedText = text
        .replace(/\{[^}]*\}/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      out.push({
        name,
        lowerName: name.toLowerCase(),
        attrs,
        text: cleanedText,
        line: tagLine,
        selfClosing,
      });

      advanceLine(i, j);
      i = j;
      continue;
    }

    // -- Track newlines outside any of the above states.
    if (ch === '\n') line++;
    i++;
  }

  return out;
}

/**
 * Walk over a JS string/template/regex starting at `start`. `quote` is the
 * opening character (", ', or `). Returns the index just past the closing
 * quote. Handles backslash escapes and template expression nesting.
 */
function skipJsString(src: string, start: number, quote: string): number {
  let i = start + 1;
  const len = src.length;
  while (i < len) {
    const c = src[i];
    if (c === '\\') {
      i += 2;
      continue;
    }
    if (quote === '`' && c === '$' && src[i + 1] === '{') {
      let depth = 1;
      i += 2;
      while (i < len && depth > 0) {
        const cc = src[i];
        if (cc === '"' || cc === "'" || cc === '`') {
          i = skipJsString(src, i, cc);
          continue;
        }
        if (cc === '{') depth++;
        else if (cc === '}') depth--;
        i++;
      }
      continue;
    }
    if (c === quote) return i + 1;
    i++;
  }
  return len;
}

/** Extract `<template>…</template>` block(s) from a Vue SFC. */
export function extractVueTemplates(source: string): { content: string; lineOffset: number }[] {
  const out: { content: string; lineOffset: number }[] = [];
  const re = /<template\b[^>]*>([\s\S]*?)<\/template>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    const lineOffset =
      (source.slice(0, m.index).match(/\n/g)?.length ?? 0) +
      (m[0].slice(0, m[0].indexOf('>') + 1).match(/\n/g)?.length ?? 0);
    out.push({ content: m[1], lineOffset });
  }
  return out;
}
