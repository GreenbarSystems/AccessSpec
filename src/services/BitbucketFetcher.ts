/**
 * BitbucketFetcher
 *
 * Imports a public Bitbucket Cloud repo by URL. Uses REST 2.0
 * (CORS-enabled for anonymous reads on bitbucket.org).
 *
 *   1. /2.0/repositories/{workspace}/{repo}                          → mainbranch.name
 *   2. /2.0/repositories/{workspace}/{repo}/src/{branch}/?max_depth=N → recursive listing
 *      (paginated; we follow `next` URLs until exhaustion)
 *   3. /2.0/repositories/{workspace}/{repo}/src/{branch}/{path}      → file content
 *
 * Notes
 *   - `max_depth` is undocumented but supported; without it Bitbucket only
 *     returns the root directory. We pass `max_depth=20` which is enough
 *     for typical projects.
 *   - File-size info isn't in the listing; we bail on the per-file cap
 *     after fetching.
 *   - Self-managed Bitbucket Server / Data Center isn't covered — only
 *     bitbucket.org.
 */

import {
  LIMITS,
  isSourceFilename,
  toSourceFile,
  type SourceFile,
} from './FileParser';

export type BitbucketTarget = {
  workspace: string;
  repo: string;
  branch?: string;
};

export type BitbucketImportResult = {
  files: SourceFile[];
  skipped: { path: string; reason: string }[];
  branch: string;
};

const CONCURRENT_FETCHES = 4;
const HARD_FILE_CAP = 250;

export function parseBitbucketUrl(input: string): BitbucketTarget | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(
      trimmed.includes('://') ? trimmed : `https://bitbucket.org/${trimmed}`,
    );
  } catch {
    return null;
  }
  if (!/(^|\.)bitbucket\.org$/i.test(url.hostname)) return null;
  const parts = url.pathname.replace(/^\/+/, '').split('/').filter(Boolean);
  if (parts.length < 2) return null;
  const workspace = parts[0];
  const repo = parts[1].replace(/\.git$/i, '');
  // /workspace/repo/src/{branch}/...   or   /workspace/repo/branch/{branch}
  let branch: string | undefined;
  if (parts[2] === 'src' && parts[3]) branch = parts[3];
  else if (parts[2] === 'branch' && parts[3]) branch = parts[3];
  return { workspace, repo, branch };
}

type BBRepo = { mainbranch?: { name?: string } };
type BBSrcValue = {
  path: string;
  type: 'commit_file' | 'commit_directory';
};
type BBSrcPage = { values: BBSrcValue[]; next?: string };

async function jsonOrFail(res: Response, ctx: string): Promise<unknown> {
  if (res.status === 404) throw new Error(`${ctx}: not found`);
  if (res.status === 403)
    throw new Error(`${ctx}: Bitbucket API rate limit — try again later`);
  if (!res.ok) throw new Error(`${ctx}: HTTP ${res.status}`);
  return res.json();
}

async function fetchMainBranch(
  workspace: string,
  repo: string,
): Promise<string> {
  const meta = (await jsonOrFail(
    await fetch(`https://api.bitbucket.org/2.0/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repo)}`),
    'repo lookup',
  )) as BBRepo;
  if (!meta.mainbranch?.name) throw new Error('repo has no main branch');
  return meta.mainbranch.name;
}

async function listAllFiles(
  workspace: string,
  repo: string,
  branch: string,
): Promise<string[]> {
  const seedUrl =
    `https://api.bitbucket.org/2.0/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repo)}` +
    `/src/${encodeURIComponent(branch)}/?max_depth=20&pagelen=100`;
  const paths: string[] = [];
  let next: string | undefined = seedUrl;
  // Cap the page walk so a huge repo doesn't loop forever.
  for (let i = 0; i < 50 && next; i++) {
    const res = await fetch(next);
    if (!res.ok) throw new Error(`src listing: HTTP ${res.status}`);
    const page = (await res.json()) as BBSrcPage;
    for (const v of page.values ?? []) {
      if (v.type === 'commit_file') paths.push(v.path);
    }
    next = page.next;
  }
  return paths;
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

export async function importBitbucketRepo(
  input: string | BitbucketTarget,
): Promise<BitbucketImportResult> {
  const target = typeof input === 'string' ? parseBitbucketUrl(input) : input;
  if (!target) throw new Error('Unrecognized Bitbucket URL');

  const branch = target.branch ?? (await fetchMainBranch(target.workspace, target.repo));
  const allPaths = await listAllFiles(target.workspace, target.repo, branch);

  const skipped: BitbucketImportResult['skipped'] = [];
  const candidates: string[] = [];
  for (const p of allPaths) {
    if (!isSourceFilename(p)) {
      skipped.push({ path: p, reason: 'unsupported extension' });
      continue;
    }
    candidates.push(p);
  }
  if (candidates.length > HARD_FILE_CAP) {
    for (const p of candidates.slice(HARD_FILE_CAP)) {
      skipped.push({ path: p, reason: `import cap (${HARD_FILE_CAP}) reached` });
    }
    candidates.length = HARD_FILE_CAP;
  }

  const raws = await mapWithConcurrency(candidates, CONCURRENT_FETCHES, async (p) => {
    const url =
      `https://api.bitbucket.org/2.0/repositories/${encodeURIComponent(target.workspace)}/${encodeURIComponent(target.repo)}` +
      `/src/${encodeURIComponent(branch)}/${p.split('/').map(encodeURIComponent).join('/')}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${p}: HTTP ${res.status}`);
    return { path: p, text: await res.text() };
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
    files.push(toSourceFile(r.path, r.text, 'bitbucket'));
  }

  return { files, skipped, branch };
}
