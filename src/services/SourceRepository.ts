/**
 * SourceRepository
 *
 * In-memory store of the currently loaded project. Pure module (no React
 * imports) so it can be unit-tested and consumed from non-React code. The
 * React glue lives in `useSourceRepository.tsx`.
 *
 * Files are keyed by their normalized path. Re-uploading the same path
 * overwrites the previous entry, which is what users expect when iterating.
 */

import type { SourceFile, SourceOrigin } from './FileParser';

export type Project = {
  id: string;
  name: string;
  origin: SourceOrigin | 'mixed';
  createdAt: number;
  /** Map keyed by normalized path. */
  filesByPath: Map<string, SourceFile>;
};

export type ProjectSummary = {
  fileCount: number;
  totalBytes: number;
  byLanguage: Record<string, number>;
};

type Listener = (project: Project | null) => void;

export class SourceRepository {
  private project: Project | null = null;
  private listeners = new Set<Listener>();

  getProject(): Project | null {
    return this.project;
  }

  getFiles(): SourceFile[] {
    if (!this.project) return [];
    return [...this.project.filesByPath.values()].sort((a, b) =>
      a.path.localeCompare(b.path),
    );
  }

  getFile(path: string): SourceFile | undefined {
    return this.project?.filesByPath.get(path);
  }

  summary(): ProjectSummary {
    const files = this.getFiles();
    const byLanguage: Record<string, number> = {};
    let totalBytes = 0;
    for (const f of files) {
      byLanguage[f.language] = (byLanguage[f.language] ?? 0) + 1;
      totalBytes += f.size;
    }
    return { fileCount: files.length, totalBytes, byLanguage };
  }

  /**
   * Load a fresh batch of files, replacing any existing project. Use
   * `addFiles` to append into the current project instead.
   */
  loadFiles(files: SourceFile[], name: string, origin: Project['origin']): Project {
    const filesByPath = new Map<string, SourceFile>();
    for (const f of files) filesByPath.set(f.path, f);
    this.project = {
      id: `proj_${Date.now().toString(36)}`,
      name,
      origin,
      createdAt: Date.now(),
      filesByPath,
    };
    this.emit();
    return this.project;
  }

  /** Append (or overwrite by path) files into the current project. */
  addFiles(files: SourceFile[], origin?: SourceOrigin): Project {
    if (!this.project) {
      return this.loadFiles(files, defaultProjectName(files), origin ?? 'file');
    }
    for (const f of files) this.project.filesByPath.set(f.path, f);
    // Origin becomes mixed once we accept files from a second source.
    if (origin && this.project.origin !== origin) {
      this.project.origin = 'mixed';
    }
    this.emit();
    return this.project;
  }

  clear(): void {
    this.project = null;
    this.emit();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const l of this.listeners) l(this.project);
  }
}

function defaultProjectName(files: SourceFile[]): string {
  if (files.length === 0) return 'Empty project';
  if (files.length === 1) return files[0].name;
  // Use the deepest common ancestor folder, or "Project" as a fallback.
  const parts = files[0].path.split('/');
  for (let i = parts.length - 1; i >= 1; i--) {
    const prefix = parts.slice(0, i).join('/') + '/';
    if (files.every((f) => f.path.startsWith(prefix))) {
      return parts[i - 1] || 'Project';
    }
  }
  return 'Project';
}

/** Process-wide singleton used by the React hook. */
export const sourceRepository = new SourceRepository();

// NOTE: we used to expose this singleton on `window.__repo` in DEV builds for
// the in-page preview harness. That escape hatch was removed because:
//   (a) it leaked the writable singleton into the global namespace where any
//       script — including iframed user code — could clear/replace project
//       state, and
//   (b) React DevTools + the existing `useSourceRepository` hook already give
//       us read access during development without the global handle.
// If you genuinely need to inspect the store from the DevTools console, set a
// breakpoint inside `useSourceRepository` and grab the reference there.
