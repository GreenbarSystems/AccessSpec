/**
 * DevicePreview
 *
 * Catalog of phone / tablet frames and the helper that turns the uploaded
 * project into a self-contained HTML document the iframe can render.
 *
 * Strategy
 *   1. Find an entry: prefer `index.html`, fall back to the first `.html`.
 *   2. Inline every `<link rel="stylesheet" href="…">` whose href resolves
 *      to a project CSS file. Hrefs are matched flexibly so paths like
 *      "./styles/main.css" or "/styles/main.css" still resolve.
 *   3. Hand the result back as a single string the iframe sets via `srcdoc`.
 *
 * Limitations: we don't bundle JS — `<script src=…>` to a local file is
 * removed (broken cross-origin in srcdoc anyway). Inline `<script>` blocks
 * pass through and run inside the sandboxed iframe.
 */

import type { SourceFile } from './FileParser';

export type DeviceCategory = 'phone' | 'tablet';
export type DeviceNotch = 'none' | 'home' | 'notch' | 'island' | 'hole';

export type Device = {
  id: string;
  name: string;
  category: DeviceCategory;
  /** Logical viewport width in CSS px (portrait). */
  width: number;
  /** Logical viewport height in CSS px (portrait). */
  height: number;
  /** Device-pixel ratio — surfaced for the info panel; not applied to the iframe. */
  dpr: number;
  /** Body radius (px) of the chassis. */
  radius: number;
  /** What's at the top of the screen. */
  topMark: DeviceNotch;
  /** Whether the device has a bottom home button (iPhone SE only). */
  hasHomeButton: boolean;
  /** Short marketing-style line shown under the picker. */
  blurb: string;
};

export const DEVICES: readonly Device[] = [
  {
    id: 'iphone-se',
    name: 'iPhone SE',
    category: 'phone',
    width: 375,
    height: 667,
    dpr: 2,
    radius: 22,
    topMark: 'none',
    hasHomeButton: true,
    blurb: 'iOS · 4.7" · Touch ID',
  },
  {
    id: 'iphone-15',
    name: 'iPhone 15',
    category: 'phone',
    width: 393,
    height: 852,
    dpr: 3,
    radius: 48,
    topMark: 'island',
    hasHomeButton: false,
    blurb: 'iOS · 6.1" · Dynamic Island',
  },
  {
    id: 'pixel-8',
    name: 'Pixel 8',
    category: 'phone',
    width: 412,
    height: 915,
    dpr: 2.625,
    radius: 36,
    topMark: 'hole',
    hasHomeButton: false,
    blurb: 'Android · 6.2" · centered hole',
  },
  {
    id: 'galaxy-s24',
    name: 'Galaxy S24',
    category: 'phone',
    width: 360,
    height: 800,
    dpr: 3,
    radius: 32,
    topMark: 'hole',
    hasHomeButton: false,
    blurb: 'Android · 6.2" · One UI',
  },
  {
    id: 'ipad',
    name: 'iPad (portrait)',
    category: 'tablet',
    width: 768,
    height: 1024,
    dpr: 2,
    radius: 28,
    topMark: 'none',
    hasHomeButton: false,
    blurb: 'iPadOS · 10.9" · Magic Keyboard',
  },
] as const;

export const DEFAULT_DEVICE_ID = 'iphone-15';

/* ------------------------------------------------------------------ */
/* Project → preview document                                          */
/* ------------------------------------------------------------------ */

function findEntryHtml(files: SourceFile[]): SourceFile | null {
  const htmls = files.filter((f) => f.ext === 'html');
  if (htmls.length === 0) return null;
  return (
    htmls.find((f) => f.name.toLowerCase() === 'index.html') ??
    htmls.find((f) => /index\.html$/i.test(f.path)) ??
    htmls[0]
  );
}

/**
 * Match an HTML `href` (e.g. "./styles/main.css") against the loaded CSS
 * file paths. We don't fully resolve URLs — basenames and suffix matches
 * cover almost every real-world layout without pulling in a URL parser.
 */
function findCssMatch(href: string, css: SourceFile[]): SourceFile | undefined {
  const cleaned = href.replace(/^\.\//, '').replace(/^\/+/, '').toLowerCase();
  // Exact or path-suffix match wins.
  const exact = css.find(
    (f) =>
      f.path.toLowerCase() === cleaned ||
      f.path.toLowerCase().endsWith('/' + cleaned),
  );
  if (exact) return exact;
  // Fall back to basename match (last resort, may pick wrong file in projects
  // with duplicate names — acceptable for V1).
  const base = cleaned.split('/').pop()!;
  return css.find((f) => f.name.toLowerCase() === base);
}

function inlineStylesheets(html: string, files: SourceFile[]): string {
  const cssFiles = files.filter((f) => f.ext === 'css');
  return html.replace(
    /<link\b[^>]*?\brel\s*=\s*["']stylesheet["'][^>]*?>/gi,
    (match) => {
      const href = /href\s*=\s*["']([^"']+)["']/i.exec(match)?.[1];
      if (!href) return match;
      const file = findCssMatch(href, cssFiles);
      if (!file) {
        // Leave a HTML comment so a user inspecting the iframe knows why a
        // stylesheet didn't apply.
        return `<!-- accessspec: could not resolve "${href}" against project -->`;
      }
      return `<style data-from="${file.path}">${file.content}</style>`;
    },
  );
}

/** Drop external `<script src=…>` tags — they can't load from srcdoc origin. */
function stripExternalScripts(html: string): string {
  return html.replace(
    /<script\b[^>]*?\bsrc\s*=\s*["'][^"']+["'][^>]*>\s*<\/script>/gi,
    '<!-- accessspec: external script removed in preview -->',
  );
}

/**
 * If the entry doesn't already wrap content in a full document, give it one
 * so the iframe gets a sensible viewport meta + reset.
 */
function ensureDocumentShell(html: string): string {
  if (/<html[\s>]/i.test(html)) return html;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>html, body { margin: 0; font-family: -apple-system, system-ui, sans-serif; }</style>
</head>
<body>
${html}
</body>
</html>`;
}

export type PreviewBuild = {
  html: string | null;
  entryPath?: string;
  inlinedCss: string[];
  reason?: string;
};

export type PreviewOptions = {
  /**
   * Optional `<script>` body to inject just before `</body>`. Used by the
   * RuntimeAuditPanel to embed its sandbox-side scanner so the iframe can
   * stay locked to sandbox="allow-scripts" (no allow-same-origin handle
   * back to the parent).
   */
  injectScript?: string;
};

export function buildPreviewDocument(
  files: SourceFile[],
  options: PreviewOptions = {},
): PreviewBuild {
  if (files.length === 0) {
    return { html: null, inlinedCss: [], reason: 'No project loaded.' };
  }
  const entry = findEntryHtml(files);
  if (!entry) {
    return {
      html: null,
      inlinedCss: [],
      reason:
        'No HTML entry found. The preview needs an index.html (or any .html file) to render.',
    };
  }
  const inlinedCss: string[] = [];
  const withCss = entry.content.replace(
    /<link\b[^>]*?\brel\s*=\s*["']stylesheet["'][^>]*?>/gi,
    (match) => {
      const href = /href\s*=\s*["']([^"']+)["']/i.exec(match)?.[1];
      if (!href) return match;
      const file = findCssMatch(
        href,
        files.filter((f) => f.ext === 'css'),
      );
      if (!file) {
        return `<!-- accessspec: could not resolve "${href}" -->`;
      }
      inlinedCss.push(file.path);
      return `<style data-from="${file.path}">${file.content}</style>`;
    },
  );
  // If the entry uses no <link>s but the project ships CSS, inject every
  // stylesheet so even a barebones HTML body picks them up.
  let withFallback = withCss;
  if (inlinedCss.length === 0) {
    const all = files.filter((f) => f.ext === 'css');
    if (all.length > 0) {
      const blob = all
        .map((f) => `<style data-from="${f.path}">${f.content}</style>`)
        .join('\n');
      inlinedCss.push(...all.map((f) => f.path));
      withFallback = /<\/head>/i.test(withCss)
        ? withCss.replace(/<\/head>/i, `${blob}\n</head>`)
        : `${blob}\n${withCss}`;
    }
  }
  const cleaned = stripExternalScripts(withFallback);
  let shell = ensureDocumentShell(cleaned);
  if (options.injectScript) {
    // Wrap in a unique script tag right before </body>. If the document has
    // no </body> (some hand-rolled fragments don't), append at the end.
    const tag = `<script data-accessspec-injected="true">\n${options.injectScript}\n</script>`;
    shell = /<\/body>/i.test(shell)
      ? shell.replace(/<\/body>/i, `${tag}\n</body>`)
      : `${shell}\n${tag}`;
  }
  return {
    html: shell,
    entryPath: entry.path,
    inlinedCss,
  };
}

// Reuse helper internally; export for tests.
export const _internal = { inlineStylesheets, findEntryHtml };
