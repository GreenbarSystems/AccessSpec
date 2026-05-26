/**
 * GithubFetcher
 *
 * Resolves a GitHub repo URL into a list of supported `SourceFile`s using
 * GitHub's CORS-enabled public API:
 *   1. /repos/{owner}/{repo}            → default_branch
 *   2. /repos/{owner}/{repo}/git/trees/{branch}?recursive=1
 *   3. raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}
 *
 * Anonymous requests are rate-limited (~60/hour/IP); we keep the file cap
 * low and fail loudly on 403/404 so the UI can show useful errors.
 */

import {
  LIMITS,
  isSourceFilename,
  toSourceFile,
  type SourceFile,
} from './FileParser';

export type GithubTarget = { owner: string; repo: string; branch?: string };

export type GithubImportResult = {
  files: SourceFile[];
  skipped: { path: string; reason: string }[];
  branch: string;
};

/** Cap concurrent raw-content fetches so we don't hammer the API. */
const CONCURRENT_FETCHES = 6;
/** Hard cap on files imported from GitHub — anonymous rate limit is tight. */
const GH_MAX_FILES = 250;

export function parseGithubUrl(input: string): GithubTarget | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Accept "owner/repo" shorthand.
  const shorthand = /^([\w.-]+)\/([\w.-]+?)(?:\.git)?$/i.exec(trimmed);
  if (shorthand && !trimmed.includes('://')) {
    return { owner: shorthand[1], repo: shorthand[2] };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (!/(^|\.)github\.com$/i.test(url.hostname)) return null;

  const parts = url.pathname.replace(/^\/+/, '').split('/').filter(Boolean);
  if (parts.length < 2) return null;

  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/i, '');
  // /tree/{branch}/...  or  /blob/{branch}/...
  if ((parts[2] === 'tree' || parts[2] === 'blob') && parts[3]) {
    return { owner, repo, branch: parts[3] };
  }
  return { owner, repo };
}

async function jsonOrFail(res: Response, context: string): Promise<unknown> {
  if (res.status === 404) throw new Error(`${context}: not found`);
  if (res.status === 403) {
    throw new Error(
      `${context}: GitHub rate limit hit — try again later or sign in to a token-aware proxy`,
    );
  }
  if (!res.ok) throw new Error(`${context}: HTTP ${res.status}`);
  return res.json();
}

async function resolveDefaultBranch(target: GithubTarget): Promise<string> {
  if (target.branch) return target.branch;
  const meta = (await jsonOrFail(
    await fetch(`https://api.github.com/repos/${target.owner}/${target.repo}`),
    'repo lookup',
  )) as { default_branch?: string };
  if (!meta.default_branch) throw new Error('repo has no default branch');
  return meta.default_branch;
}

type TreeEntry = { path: string; type: 'blob' | 'tree'; size?: number };

async function fetchTree(
  target: GithubTarget,
  branch: string,
): Promise<{ entries: TreeEntry[]; truncated: boolean }> {
  const tree = (await jsonOrFail(
    await fetch(
      `https://api.github.com/repos/${target.owner}/${target.repo}/git/trees/${branch}?recursive=1`,
    ),
    'tree fetch',
  )) as { tree?: TreeEntry[]; truncated?: boolean };
  return { entries: tree.tree ?? [], truncated: !!tree.truncated };
}

async function mapWithConcurrency<T, U>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<U>,
): Promise<U[]> {
  const out: U[] = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      out[i] = await worker(items[i]);
    }
  });
  await Promise.all(runners);
  return out;
}

export async function importGithubRepo(
  input: string | GithubTarget,
): Promise<GithubImportResult> {
  const target = typeof input === 'string' ? parseGithubUrl(input) : input;
  if (!target) throw new Error('Unrecognized GitHub URL');

  const branch = await resolveDefaultBranch(target);
  const { entries, truncated } = await fetchTree(target, branch);

  const skipped: GithubImportResult['skipped'] = [];
  const candidates: TreeEntry[] = [];
  for (const entry of entries) {
    if (entry.type !== 'blob') continue;
    if (!isSourceFilename(entry.path)) {
      skipped.push({ path: entry.path, reason: 'unsupported extension' });
      continue;
    }
    if ((entry.size ?? 0) > LIMITS.maxFileBytes) {
      skipped.push({
        path: entry.path,
        reason: `exceeds ${LIMITS.maxFileBytes / 1024 / 1024} MB per-file limit`,
      });
      continue;
    }
    candidates.push(entry);
  }
  if (truncated) {
    skipped.push({
      path: '(repo)',
      reason: 'GitHub returned a truncated tree — large repos require local download',
    });
  }
  if (candidates.length > GH_MAX_FILES) {
    for (const e of candidates.slice(GH_MAX_FILES)) {
      skipped.push({ path: e.path, reason: `import cap (${GH_MAX_FILES}) reached` });
    }
    candidates.length = GH_MAX_FILES;
  }

  let totalBytes = 0;
  const raws = await mapWithConcurrency(candidates, CONCURRENT_FETCHES, async (entry) => {
    const res = await fetch(
      `https://raw.githubusercontent.com/${target.owner}/${target.repo}/${branch}/${entry.path}`,
    );
    if (!res.ok) throw new Error(`${entry.path}: HTTP ${res.status}`);
    return { path: entry.path, text: await res.text() };
  });

  const files: SourceFile[] = [];
  for (const r of raws) {
    const byteLen = new Blob([r.text]).size;
    if (totalBytes + byteLen > LIMITS.maxTotalBytes) {
      skipped.push({
        path: r.path,
        reason: `would exceed ${LIMITS.maxTotalBytes / 1024 / 1024} MB project cap`,
      });
      continue;
    }
    totalBytes += byteLen;
    files.push(toSourceFile(r.path, r.text, 'github'));
  }

  return { files, skipped, branch };
}
