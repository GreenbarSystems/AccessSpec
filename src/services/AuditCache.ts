/**
 * AuditCache
 *
 * Shared `AuditReport` store keyed on `Project.id`. Solves the perf problem
 * where 13 panels each called `audit(files)` independently — opening the
 * Patterns / Parity / Inspector / Playbook / Refactor / … panels each
 * tokenized, enriched, ruled, and scored the entire project from scratch.
 *
 * Mechanics
 *   - Cache is a `Map<projectId, AuditReport>` at module scope.
 *   - We subscribe to the `SourceRepository` once at import time. Every
 *     emit (clear / loadFiles / addFiles) deletes the entry for the
 *     current project id, so the next `getAuditReport` call recomputes.
 *   - When the project becomes null, we clear the whole cache.
 *   - Consumers go through the `useAuditReport()` hook which subscribes to
 *     the same store via `useSyncExternalStore` so they re-render on
 *     mutation.
 *
 * The hook returns `AuditReport | null`. Panels that previously did:
 *   const elements = enrichElements(detectComponents(files), files);
 * become:
 *   const report = useAuditReport();
 *   const elements = report?.elements ?? [];
 */

import { useSyncExternalStore } from 'react';
import { audit, type AuditReport } from './AuditService';
import { sourceRepository, type Project } from './SourceRepository';

const cache = new Map<string, AuditReport>();

function compute(project: Project): AuditReport {
  return audit([...project.filesByPath.values()]);
}

export function getAuditReport(project: Project | null): AuditReport | null {
  if (!project) return null;
  const cached = cache.get(project.id);
  if (cached) return cached;
  const fresh = compute(project);
  cache.set(project.id, fresh);
  return fresh;
}

// Invalidate on every store emit. Mutations like `addFiles` keep the same
// `project.id` but change the file map; we must drop the stale entry so
// the next call recomputes.
sourceRepository.subscribe((project) => {
  if (!project) {
    cache.clear();
    return;
  }
  cache.delete(project.id);
});

/**
 * React hook: subscribes to SourceRepository, returns the cached audit
 * report for the current project (or null when no project is loaded).
 * Computes synchronously on cache miss — for typical project sizes the
 * audit is fast enough; for very large projects swap `compute()` for a
 * worker-based version without changing the hook signature.
 */
export function useAuditReport(): AuditReport | null {
  const project = useSyncExternalStore(
    (cb) => sourceRepository.subscribe(cb),
    () => sourceRepository.getProject(),
    () => sourceRepository.getProject(),
  );
  return getAuditReport(project);
}

/** Dev-only: peek at cache size. Used by tests. */
export function _cacheSize(): number {
  return cache.size;
}
