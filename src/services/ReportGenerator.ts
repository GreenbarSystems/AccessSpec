/**
 * ReportGenerator
 *
 * Turns an `AuditReport` + a small slice of project metadata into a shareable
 * artifact in one of four formats:
 *
 *   - **JSON** — pretty-printed full dump, suitable for tooling pipelines
 *   - **CSV**  — flat per-finding rows, opens in any spreadsheet
 *   - **HTML** — self-contained printable document (inline styles, no JS)
 *   - **PDF**  — opens the HTML in a popup and triggers the browser's print
 *     dialog. The user picks "Save as PDF" — saves us a heavy js-pdf dep.
 *
 * All four functions are pure (HTML/JSON/CSV) or near-pure (PDF needs a
 * `Window`), so they're trivially testable. The download helper at the
 * bottom is the only DOM-touching code path the UI cares about.
 */

import type { AuditReport } from './AuditService';
import type { Severity } from './RuleEngine';
import { ALL_RULE_DEFS } from './AuditService';

export type ReportFormat = 'json' | 'csv' | 'html' | 'pdf';

export type ReportContext = {
  projectName: string;
  origin: string;
  fileCount: number;
  totalBytes: number;
  audit: AuditReport;
  generatedAt: number;
};

/* ------------------------------------------------------------------ */
/* Formatters                                                          */
/* ------------------------------------------------------------------ */

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function csvEscape(value: string | number | undefined | null): string {
  const s = value === undefined || value === null ? '' : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

/* ------------------------------------------------------------------ */
/* JSON                                                                */
/* ------------------------------------------------------------------ */

export function generateJson(ctx: ReportContext): string {
  const payload = {
    schema: 'accessspec.audit/v1',
    generatedAt: new Date(ctx.generatedAt).toISOString(),
    project: {
      name: ctx.projectName,
      origin: ctx.origin,
      fileCount: ctx.fileCount,
      totalBytes: ctx.totalBytes,
    },
    scores: ctx.audit.scores,
    totalFindings: ctx.audit.findings.length,
    findings: ctx.audit.findings.map((f) => ({
      ruleId: f.ruleId,
      category: f.category,
      severity: f.severity,
      message: f.message,
      context: f.context,
      element: {
        id: f.element.id,
        type: f.element.type,
        role: f.element.role,
        tagName: f.element.tagName,
        text: f.element.text,
        file: f.element.file,
        line: f.element.line,
      },
    })),
    rules: ALL_RULE_DEFS.map((r) => ({
      id: r.id,
      category: r.category,
      severity: r.severity,
      description: r.description,
      spec: r.spec,
      suggestedFix: r.suggestedFix,
    })),
  };
  return JSON.stringify(payload, null, 2);
}

/* ------------------------------------------------------------------ */
/* CSV                                                                 */
/* ------------------------------------------------------------------ */

const CSV_HEADER = [
  'rule_id',
  'severity',
  'category',
  'message',
  'element_type',
  'tag_name',
  'role',
  'text',
  'file',
  'line',
] as const;

export function generateCsv(ctx: ReportContext): string {
  const rows: string[] = [CSV_HEADER.join(',')];
  // Stable order: critical → warning → info, then alpha by file:line.
  const sorted = [...ctx.audit.findings].sort((a, b) => {
    const s = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (s !== 0) return s;
    return (
      a.element.file.localeCompare(b.element.file) ||
      a.element.line - b.element.line
    );
  });
  for (const f of sorted) {
    rows.push(
      [
        csvEscape(f.ruleId),
        csvEscape(f.severity),
        csvEscape(f.category),
        csvEscape(f.message),
        csvEscape(f.element.type),
        csvEscape(f.element.tagName),
        csvEscape(f.element.role),
        csvEscape(f.element.text),
        csvEscape(f.element.file),
        csvEscape(f.element.line),
      ].join(','),
    );
  }
  return rows.join('\n');
}

/* ------------------------------------------------------------------ */
/* HTML                                                                */
/* ------------------------------------------------------------------ */

const PRINT_STYLES = `
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; font-family: -apple-system, system-ui, "Segoe UI", Roboto, sans-serif; color: #0f172a; }
  body { padding: 32px; }
  header { border-bottom: 2px solid #0ea5e9; padding-bottom: 12px; margin-bottom: 24px; }
  header h1 { margin: 0 0 4px; font-size: 24px; }
  header .meta { color: #64748b; font-size: 12px; }
  h2 { font-size: 16px; margin: 24px 0 8px; color: #0c4a6e; }
  .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
  .kpi { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; }
  .kpi .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; }
  .kpi .value { font-size: 28px; font-weight: 700; margin-top: 4px; }
  .good { color: #047857; }
  .warn { color: #b45309; }
  .bad  { color: #b91c1c; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 12px; }
  th, td { border: 1px solid #e2e8f0; padding: 5px 6px; text-align: left; vertical-align: top; }
  th { background: #f1f5f9; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #475569; }
  tr.sev-critical td:first-child { border-left: 3px solid #dc2626; }
  tr.sev-warning  td:first-child { border-left: 3px solid #f59e0b; }
  tr.sev-info     td:first-child { border-left: 3px solid #0ea5e9; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  footer { margin-top: 32px; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; }
  @media print {
    body { padding: 16px; }
    h2 { page-break-after: avoid; }
    tr { page-break-inside: avoid; }
  }
`;

function bandClass(score: number): 'good' | 'warn' | 'bad' {
  if (score >= 90) return 'good';
  if (score >= 70) return 'warn';
  return 'bad';
}

export function generateHtml(ctx: ReportContext): string {
  const { audit, projectName } = ctx;
  const overall = audit.scores.overall;
  const a = audit.scores.byCategory.accessibility;
  const m = audit.scores.byCategory.mobile;
  const p = audit.scores.byCategory.parity;
  const critical = audit.scores.totalCounts.critical;

  const findingsRows = [...audit.findings]
    .sort((x, y) => {
      const s = SEVERITY_RANK[x.severity] - SEVERITY_RANK[y.severity];
      return s !== 0 ? s : x.ruleId.localeCompare(y.ruleId);
    })
    .map(
      (f) => `<tr class="sev-${f.severity}">
  <td class="mono">${escapeHtml(f.ruleId)}</td>
  <td>${f.severity}</td>
  <td>${f.category}</td>
  <td>${escapeHtml(f.message)}</td>
  <td>${escapeHtml(f.element.type)} &lt;${escapeHtml(f.element.tagName)}&gt;</td>
  <td class="mono">${escapeHtml(f.element.file)}:${f.element.line}</td>
</tr>`,
    )
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>AccessSpec audit · ${escapeHtml(projectName)}</title>
<style>${PRINT_STYLES}</style>
</head>
<body>
<header>
  <h1>Accessibility audit · ${escapeHtml(projectName)}</h1>
  <div class="meta">
    Generated ${new Date(ctx.generatedAt).toISOString()} ·
    Origin: ${escapeHtml(ctx.origin)} ·
    ${ctx.fileCount} files (${formatBytes(ctx.totalBytes)})
  </div>
</header>

<h2>Executive summary</h2>
<section class="kpi-row">
  <div class="kpi"><div class="label">Overall</div><div class="value ${bandClass(overall)}">${overall}</div></div>
  <div class="kpi"><div class="label">Accessibility</div><div class="value ${bandClass(a.score)}">${a.score}</div></div>
  <div class="kpi"><div class="label">Mobile</div><div class="value ${bandClass(m.score)}">${m.score}</div></div>
  <div class="kpi"><div class="label">Parity</div><div class="value ${bandClass(p.score)}">${p.score}</div></div>
</section>

<h2>Severity totals</h2>
<table>
  <thead><tr><th>Category</th><th>Score</th><th>Critical</th><th>Warning</th><th>Info</th></tr></thead>
  <tbody>
    <tr><td>Accessibility</td><td class="${bandClass(a.score)}">${a.score}</td><td>${a.counts.critical}</td><td>${a.counts.warning}</td><td>${a.counts.info}</td></tr>
    <tr><td>Mobile usability</td><td class="${bandClass(m.score)}">${m.score}</td><td>${m.counts.critical}</td><td>${m.counts.warning}</td><td>${m.counts.info}</td></tr>
    <tr><td>Platform parity</td><td class="${bandClass(p.score)}">${p.score}</td><td>${p.counts.critical}</td><td>${p.counts.warning}</td><td>${p.counts.info}</td></tr>
    <tr><td><strong>Total</strong></td><td><strong>${overall}</strong></td><td><strong>${critical}</strong></td><td><strong>${audit.scores.totalCounts.warning}</strong></td><td><strong>${audit.scores.totalCounts.info}</strong></td></tr>
  </tbody>
</table>

<h2>Findings (${audit.findings.length})</h2>
${audit.findings.length === 0
  ? '<p>No findings — every detected component passed the active rules.</p>'
  : `<table>
  <thead><tr><th>Rule</th><th>Severity</th><th>Category</th><th>Message</th><th>Element</th><th>Location</th></tr></thead>
  <tbody>
${findingsRows}
  </tbody>
</table>`
}

<footer>
  Generated by AccessSpec · schema accessspec.audit/v1
</footer>
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/* PDF (browser print dialog)                                          */
/* ------------------------------------------------------------------ */

/**
 * Opens the HTML report in a popup window and triggers the browser's print
 * dialog. The user picks "Save as PDF" — the lightest possible PDF export.
 * Returns the popup window for tests; throws if the popup was blocked.
 */
export function openPrintWindow(ctx: ReportContext): Window {
  const html = generateHtml(ctx);
  const w = window.open('', '_blank', 'width=900,height=1200');
  if (!w) {
    throw new Error('Pop-up blocked — allow pop-ups for this site to export PDF.');
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  // Give the layout one frame to settle before firing print.
  w.addEventListener('load', () => setTimeout(() => w.print(), 150), {
    once: true,
  });
  return w;
}

/* ------------------------------------------------------------------ */
/* Download helper                                                     */
/* ------------------------------------------------------------------ */

const MIME: Record<Exclude<ReportFormat, 'pdf'>, string> = {
  json: 'application/json',
  csv: 'text/csv;charset=utf-8',
  html: 'text/html;charset=utf-8',
};

const EXT: Record<Exclude<ReportFormat, 'pdf'>, string> = {
  json: 'json',
  csv: 'csv',
  html: 'html',
};

export type ExportResult =
  | { kind: 'download'; filename: string; bytes: number; format: ReportFormat }
  | { kind: 'print'; format: 'pdf' };

/** Top-level entry — produces the bytes and triggers the download/print. */
export function exportReport(format: ReportFormat, ctx: ReportContext): ExportResult {
  const safeName =
    ctx.projectName.replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '') ||
    'project';
  const stamp = new Date(ctx.generatedAt).toISOString().replace(/[:.]/g, '-');

  if (format === 'pdf') {
    openPrintWindow(ctx);
    return { kind: 'print', format };
  }

  const body =
    format === 'json'
      ? generateJson(ctx)
      : format === 'csv'
        ? generateCsv(ctx)
        : generateHtml(ctx);

  const filename = `accessspec-${safeName}-${stamp}.${EXT[format]}`;
  triggerDownload(filename, body, MIME[format]);
  return { kind: 'download', filename, bytes: new Blob([body]).size, format };
}

function triggerDownload(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
