import { useMemo, useState } from 'react';
import { importRepo, parseRepoUrl, type RepoProvider } from '../../services/RepoFetcher';
import { sourceRepository } from '../../services/SourceRepository';
import { useToast } from '../toast/ToastHost';
import type { StatusMessage } from './UploadPanel';

type Props = {
  onStatus: (s: StatusMessage | null) => void;
};

const PROVIDER_LABEL: Record<RepoProvider, string> = {
  github: '🐙 GitHub',
  gitlab: '🦊 GitLab',
  bitbucket: '🟦 Bitbucket',
};

const PROVIDER_TONE: Record<RepoProvider, string> = {
  github: 'bg-slate-100 text-slate-800 ring-slate-200',
  gitlab: 'bg-orange-50 text-orange-800 ring-orange-200',
  bitbucket: 'bg-blue-50 text-blue-800 ring-blue-200',
};

export function RepoImport({ onStatus }: Props) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  // Live preview of what provider we'd dispatch to.
  const detected = useMemo(() => parseRepoUrl(url), [url]);

  const handleImport = async () => {
    if (!detected) {
      onStatus({
        tone: 'error',
        text: 'Could not parse that as a GitHub, GitLab, or Bitbucket URL.',
      });
      return;
    }
    setBusy(true);
    onStatus({
      tone: 'info',
      text: `Importing ${detected.label} from ${detected.provider}…`,
    });
    try {
      const result = await importRepo(url);
      if (result.files.length === 0) {
        onStatus({
          tone: 'error',
          text: `No supported files found in ${result.label}.`,
        });
      } else {
        sourceRepository.loadFiles(result.files, result.label, result.provider);
        onStatus({
          tone: 'success',
          text:
            `Imported ${result.files.length} file(s) from ${result.label}.` +
            (result.skipped.length
              ? ` Skipped ${result.skipped.length} entries.`
              : ''),
        });
        toast.success(`Imported ${result.files.length} files from ${result.label}`);
      }
    } catch (err) {
      onStatus({
        tone: 'error',
        text: err instanceof Error ? err.message : 'Import failed.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        Public repos only. We auto-detect the provider from the URL and pull
        the entire tree into the in-memory project. Anonymous API rate limits
        apply — for very large repos, fall back to a ZIP upload.
      </p>
      <div className="flex flex-wrap gap-2">
        <input
          type="url"
          aria-label="Repository URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/owner/repo · https://gitlab.com/group/project · https://bitbucket.org/workspace/repo"
          className="flex-1 min-w-[260px] rounded-md border border-slate-300 px-3 py-2 text-sm font-mono focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          data-testid="repo-url"
        />
        <button
          type="button"
          className="btn-primary"
          onClick={handleImport}
          disabled={busy || !detected}
          data-action="repo-import"
        >
          {busy ? 'Importing…' : 'Import'}
        </button>
      </div>

      {/* Provider detection chip */}
      {url.trim().length > 0 && (
        <div className="text-xs">
          {detected ? (
            <span
              data-detected={detected.provider}
              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium ring-1 ${PROVIDER_TONE[detected.provider]}`}
            >
              {PROVIDER_LABEL[detected.provider]}
              <span className="font-mono text-[11px]">{detected.label}</span>
            </span>
          ) : (
            <span className="text-rose-700">URL not recognized</span>
          )}
        </div>
      )}

      <p className="text-xs text-slate-500">
        Examples:{' '}
        <code className="rounded bg-slate-100 px-1 py-0.5">facebook/react</code>{' '}
        ·{' '}
        <code className="rounded bg-slate-100 px-1 py-0.5">
          https://gitlab.com/gitlab-org/gitlab-foss
        </code>{' '}
        ·{' '}
        <code className="rounded bg-slate-100 px-1 py-0.5">
          https://bitbucket.org/atlassian/atlaskit-mk-2
        </code>
      </p>
    </div>
  );
}
