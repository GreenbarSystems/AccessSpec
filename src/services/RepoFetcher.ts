/**
 * RepoFetcher
 *
 * Provider-agnostic facade over GithubFetcher / GitlabFetcher /
 * BitbucketFetcher. Two responsibilities:
 *
 *   1. **Detect** the provider from the URL string the user pasted.
 *   2. **Dispatch** to the correct fetcher and return a uniform result
 *      shape so the upload UI doesn't have to branch on provider.
 *
 * The bare-shorthand `owner/repo` form (no protocol) is treated as GitHub
 * for backward compatibility — that's the only one with a long-standing
 * convention for that shorthand.
 */

import type { SourceFile } from './FileParser';
import { importGithubRepo, parseGithubUrl } from './GithubFetcher';
import { importGitlabRepo, parseGitlabUrl } from './GitlabFetcher';
import {
  importBitbucketRepo,
  parseBitbucketUrl,
} from './BitbucketFetcher';

export type RepoProvider = 'github' | 'gitlab' | 'bitbucket';

export type ParsedRepo =
  | { provider: 'github'; raw: string; label: string }
  | { provider: 'gitlab'; raw: string; label: string }
  | { provider: 'bitbucket'; raw: string; label: string };

export type RepoImportResult = {
  provider: RepoProvider;
  files: SourceFile[];
  skipped: { path: string; reason: string }[];
  branch: string;
  /** Display-friendly id like "facebook/react@main". */
  label: string;
};

/**
 * Try each provider in order; first match wins. Each provider's parser is
 * strict on hostname so we can ask all three without false positives.
 *
 * Bare-shorthand (`owner/repo`) is checked last so it doesn't shadow a URL
 * with the right host that happens to also pass the shorthand regex.
 */
export function parseRepoUrl(input: string): ParsedRepo | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 1. GitHub (URL with github.com host)
  if (/github\.com/i.test(trimmed)) {
    const t = parseGithubUrl(trimmed);
    if (t) return { provider: 'github', raw: trimmed, label: `${t.owner}/${t.repo}` };
  }
  // 2. GitLab
  if (/gitlab\.com/i.test(trimmed)) {
    const t = parseGitlabUrl(trimmed);
    if (t) return { provider: 'gitlab', raw: trimmed, label: t.fullPath };
  }
  // 3. Bitbucket
  if (/bitbucket\.org/i.test(trimmed)) {
    const t = parseBitbucketUrl(trimmed);
    if (t)
      return { provider: 'bitbucket', raw: trimmed, label: `${t.workspace}/${t.repo}` };
  }

  // 4. Bare shorthand `owner/repo` → GitHub (longstanding convention).
  if (!trimmed.includes('://') && !trimmed.includes(' ')) {
    const t = parseGithubUrl(trimmed);
    if (t) return { provider: 'github', raw: trimmed, label: `${t.owner}/${t.repo}` };
  }

  return null;
}

export async function importRepo(input: string): Promise<RepoImportResult> {
  const parsed = parseRepoUrl(input);
  if (!parsed) {
    throw new Error('Unrecognized repository URL — paste a GitHub, GitLab, or Bitbucket URL');
  }
  switch (parsed.provider) {
    case 'github': {
      const r = await importGithubRepo(parsed.raw);
      return {
        provider: 'github',
        files: r.files,
        skipped: r.skipped,
        branch: r.branch,
        label: `${parsed.label}@${r.branch}`,
      };
    }
    case 'gitlab': {
      const r = await importGitlabRepo(parsed.raw);
      return {
        provider: 'gitlab',
        files: r.files,
        skipped: r.skipped,
        branch: r.branch,
        label: `${parsed.label}@${r.branch}`,
      };
    }
    case 'bitbucket': {
      const r = await importBitbucketRepo(parsed.raw);
      return {
        provider: 'bitbucket',
        files: r.files,
        skipped: r.skipped,
        branch: r.branch,
        label: `${parsed.label}@${r.branch}`,
      };
    }
  }
}
