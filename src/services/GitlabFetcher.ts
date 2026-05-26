/**
 * GitlabFetcher
 *
 * Imports a public GitLab project by URL. Uses GitLab REST v4 (CORS-enabled
 * for anonymous reads on gitlab.com).
 *
 *   1. /api/v4/projects/{url-encoded path}             → default_branch + id
 *   2. /api/v4/projects/{id}/repository/tree           → recursive listing
 *      (paginated, per_page=100; we loop until empty)
 *   3. /api/v4/projects/{id}/repository/files/{enc}/raw → file content
 *
 * Notes
 *   - GitLab tree entries don't carry file sizes; we discover sizes by
 *     fetching, and bail on the per-file cap in FileParser.LIMITS.
 *   - Sub-groups are supported (e.g. `group/sub/project`). The path is URL
 *     -encoded as one segment.
 *   - Self-managed GitLab instances aren't covered here — only gitlab.com.
 *     Adding `host` to RepoTarget would extend it.
 */

import {
  LIMITS,
  isSourceFilename,
  toSourceFile,
  type SourceFile,
} from './FileParser';

export type GitlabTarget = {
  /** "group/sub/project" — the project's path-with-namespace. */
  fullPath: string;
  branch?: string;
};

export type GitlabImportResult = {
  files: SourceFile[];
  skipped: { path: string; reason: string }[];
  branch: string;
};

const CONCURRENT_FETCHES = 4;
const HARD_FILE_CAP = 250;

export function parseGitlabUrl(input: string): GitlabTarget | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(
      trimmed.includes('://') ? trimmed : `https://gitlab.com/${trimmed}`,
    );
  } catch {
    return null;
  }
  if (!/(^|\.)gitlab\.com$/i.test(url.hostname)) return null;
  const parts = url.pathname.replace(/^\/+/, '').split('/').filter(Boolean);
  if (parts.length < 2) return null;

  // /group/sub/project/-/tree/branch  →  pathParts ends at "-"
  const dashIdx = parts.indexOf('-');
  let pathParts: string[];
  let branch: string | undefined;
  if (dashIdx > 0) {
    pathParts = parts.slice(0, dashIdx);
    const after = parts.slice(dashIdx + 1);
    // /-/tree/{branch}/...   or   /-/blob/{branch}/...
    if ((after[0] === 'tree' || after[0] === 'blob') && after[1]) {
      branch = after[1];
    }
  } else {
    pathParts = parts;
  }
  const last = pathParts[pathParts.length - 1].replace(/\.git$/i, '');
  pathParts[pathParts.length - 1] = last;
  return { fullPath: pathParts.join('/'), branch };
}

type GitlabProject = { id: number; default_branch: string };
type GitlabTreeEntry = { path: string; type: 'tree' | 'blob' };

async function jsonOrFail(res: Response, ctx: string): Promise<unknown> {
  if (res.status === 404) throw new Error(`${ctx}: not found`);
  if (res.status === 403)
    throw new Error(`${ctx}: GitLab API rate limit — try again later`);
  if (!res.ok) throw new Error(`${ctx}: HTTP ${res.status}`);
  return res.json();
}

async function fetchProject(fullPath: string): Promise<GitlabProject> {
  const encoded = encodeURIComponent(fullPath);
  const meta = (await jsonOrFail(
    await fetch(`https://gitlab.com/api/v4/projects/${encoded}`),
    'project lookup',
  )) as GitlabProject;
  if (!meta?.id || !meta?.default_branch) {
    throw new Error('project missing id or default_branch');
  }
  return meta;
}

async function fetchTree(
  id: number,
  branch: string,
): Promise<GitlabTreeEntry[]> {
  const out: GitlabTreeEntry[] = [];
  let page = 1;
  // Cap pages to avoid runaway loops on enormous monorepos.
  for (let i = 0; i < 50; i++) {
    const url = `https://gitlab.com/api/v4/projects/${id}/repository/tree?ref=${encodeURIComponent(
      branch,
    )}&recursive=true&per_page=100&page=${page}`;
    const res = await fetch(url);
    if (res.status === 404) throw new Error('tree: ref not found');
    if (!res.ok) throw new Error(`tree: HTTP ${res.status}`);
    const batch = (await res.json()) as GitlabTreeEntry[];
    if (batch.length === 0) break;
    out.push(...batch);
    const next = res.headers.get('x-next-page');
    if (!next || next === '') break;
    page = parseInt(next, 10);
    if (!Number.isFinite(page) || page <= 0) break;
  }
  return out;
}

async function mapWithConcurrency<T, U>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<U>,
): Promise<U[]> {
  const out: U[] = new Array(items.length);
  let cursor = 0;
  const runners = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (true) {
        const i = cursor++;
        if (i >= items.length) return;
        out[i] = await worker(items[i]);
      }
    },
  );
  await Promise.all(runners);
  return out;
}

export async function importGitlabRepo(
  input: string | GitlabTarget,
): Promise<GitlabImportResult> {
  const target = typeof input === 'string' ? parseGitlabUrl(input) : input;
  if (!target) throw new Error('Unrecognized GitLab URL');

  const project = await fetchProject(target.fullPath);
  const branch = target.branch ?? project.default_branch;
  const entries = await fetchTree(project.id, branch);

  const skipped: GitlabImportResult['skipped'] = [];
  const candidates: GitlabTreeEntry[] = [];
  for (const e of entries) {
    if (e.type !== 'blob') continue;
    if (!isSourceFilename(e.path)) {
      skipped.push({ path: e.path, reason: 'unsupported extension' });
      continue;
    }
    candidates.push(e);
  }
  if (candidates.length > HARD_FILE_CAP) {
    for (const e of candidates.slice(HARD_FILE_CAP)) {
      skipped.push({ path: e.path, reason: `import cap (${HARD_FILE_CAP}) reached` });
    }
    candidates.length = HARD_FILE_CAP;
  }

  const raws = await mapWithConcurrency(candidates, CONCURRENT_FETCHES, async (e) => {
    const url = `https://gitlab.com/api/v4/projects/${project.id}/repository/files/${encodeURIComponent(
      e.path,
    )}/raw?ref=${encodeURIComponent(branch)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${e.path}: HTTP ${res.status}`);
    return { path: e.path, text: await res.text() };
  });

  let totalBytes = 0;
  const files: SourceFile[] = [];
  for (const r of raws) {
    const len = new Blob([r.text]).size;
    if (len > LIMITS.maxFileBytes) {
      skipped.push({
        path: r.path,
        reason: `exceeds ${LIMITS.maxFileBytes / 1024 / 1024} MB per-file limit`,
      });
      continue;
    }
    if (totalBytes + len > LIMITS.maxTotalBytes) {
      skipped.push({
        path: r.path,
        reason: `would exceed ${LIMITS.maxTotalBytes / 1024 / 1024} MB project cap`,
      });
      continue;
    }
    totalBytes += len;
    files.push(toSourceFile(r.path, r.text, 'gitlab'));
  }

  return { files, skipped, branch };
}
