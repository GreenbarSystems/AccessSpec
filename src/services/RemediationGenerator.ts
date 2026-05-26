/**
 * RemediationGenerator
 *
 * Reshapes raw `Finding`s into a flat, action-oriented playbook. Each item
 * carries exactly the five fields the spec calls out:
 *
 *   Problem · Severity · WCAG Reference · Code Example · Fix Recommendation
 *
 * Two consumers today:
 *   - the `RemediationPlaybook` UI on the Reports page
 *   - `remediationToMarkdown` which serializes the items for direct paste
 *     into Jira / Linear / GitHub issues
 *
 * The shape is intentionally separate from `Rule` and `Finding` so the
 * playbook can evolve (priority, owner, due date) without leaking back into
 * the audit engine.
 */

import type { Finding, Severity, SuggestedFix } from './RuleEngine';
import { ALL_RULE_DEFS } from './AuditService';

export type RemediationItem = {
  ruleId: string;
  /** Problem statement (rule description). */
  problem: string;
  severity: Severity;
  /** Spec citation; "Unspecified" if the rule doesn't carry one. */
  wcagReference: string;
  /** Optional bad/good code snippets to copy into a PR. */
  codeExample: {
    bad?: string;
    good: string;
    language?: string;
  } | null;
  /** Plain-English fix summary plus any follow-up notes. */
  fixRecommendation: {
    summary: string;
    notes?: string[];
  };
  /** Where the issue lives in the loaded project. */
  affected: {
    file: string;
    line: number;
    tagName: string;
    type: string;
    text: string;
    /** Specific finding message for this element instance. */
    message: string;
  };
};

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'Critical',
  warning: 'Warning',
  info: 'Info',
};

function ruleIndex(): Map<string, { spec?: string; fix: SuggestedFix; description: string }> {
  const map = new Map();
  for (const r of ALL_RULE_DEFS) {
    map.set(r.id, {
      spec: r.spec,
      fix: r.suggestedFix,
      description: r.description,
    });
  }
  return map;
}

export function generateRemediation(findings: Finding[]): RemediationItem[] {
  const idx = ruleIndex();
  const items: RemediationItem[] = [];
  for (const f of findings) {
    const meta = idx.get(f.ruleId);
    if (!meta) continue; // Rule was removed; skip orphaned finding.
    items.push({
      ruleId: f.ruleId,
      problem: meta.description,
      severity: f.severity,
      wcagReference: meta.spec ?? 'Unspecified',
      codeExample: meta.fix.example
        ? {
            bad: meta.fix.example.bad,
            good: meta.fix.example.good,
            language: meta.fix.example.language,
          }
        : null,
      fixRecommendation: {
        summary: meta.fix.summary,
        notes: meta.fix.notes,
      },
      affected: {
        file: f.element.file,
        line: f.element.line,
        tagName: f.element.tagName,
        type: f.element.type,
        text: f.element.text,
        message: f.message,
      },
    });
  }
  return items.sort((a, b) => {
    const s = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (s !== 0) return s;
    return (
      a.affected.file.localeCompare(b.affected.file) ||
      a.affected.line - b.affected.line
    );
  });
}

/* ------------------------------------------------------------------ */
/* Markdown serializer (paste into a ticket as-is)                     */
/* ------------------------------------------------------------------ */

function fence(code: string, language?: string): string {
  const lang = language ?? '';
  return `\`\`\`${lang}\n${code}\n\`\`\``;
}

function itemToMarkdown(item: RemediationItem, index: number): string {
  const parts: string[] = [];
  parts.push(`### ${index + 1}. [${SEVERITY_LABEL[item.severity]}] ${item.problem}`);
  parts.push('');
  parts.push(`- **Rule:** \`${item.ruleId}\``);
  parts.push(`- **WCAG reference:** ${item.wcagReference}`);
  parts.push(
    `- **Affected:** \`${item.affected.file}:${item.affected.line}\` · ${item.affected.type} <${item.affected.tagName}>${
      item.affected.text ? ` · "${item.affected.text}"` : ''
    }`,
  );
  parts.push(`- **Detected message:** ${item.affected.message}`);
  parts.push('');
  parts.push(`**Fix:** ${item.fixRecommendation.summary}`);
  if (item.fixRecommendation.notes?.length) {
    for (const n of item.fixRecommendation.notes) parts.push(`- ${n}`);
  }
  if (item.codeExample) {
    parts.push('');
    if (item.codeExample.bad) {
      parts.push('_Don\'t:_');
      parts.push(fence(item.codeExample.bad, item.codeExample.language));
    }
    parts.push('_Do:_');
    parts.push(fence(item.codeExample.good, item.codeExample.language));
  }
  return parts.join('\n');
}

export function remediationToMarkdown(
  items: RemediationItem[],
  meta: { project: string; generatedAt: number },
): string {
  const header = [
    `# Accessibility remediation playbook · ${meta.project}`,
    '',
    `Generated ${new Date(meta.generatedAt).toISOString()} · ${items.length} item${items.length === 1 ? '' : 's'}`,
    '',
    '---',
    '',
  ].join('\n');
  if (items.length === 0) {
    return header + '_No findings — nothing to remediate._\n';
  }
  return header + items.map((it, i) => itemToMarkdown(it, i)).join('\n\n---\n\n') + '\n';
}
