import { useRef, useState } from 'react';
import { Archive } from 'lucide-react';
import { extractZip } from '../../services/ZipExtractor';
import { sourceRepository } from '../../services/SourceRepository';
import { useToast } from '../toast/ToastHost';
import type { StatusMessage } from './UploadPanel';

type Props = {
  onStatus: (s: StatusMessage | null) => void;
};

export function ZipUpload({ onStatus }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/\.zip$/i.test(file.name)) {
      onStatus({ tone: 'error', text: 'Expected a .zip archive.' });
      return;
    }
    setBusy(true);
    onStatus({ tone: 'info', text: `Extracting ${file.name}…` });
    try {
      const { files, skipped } = await extractZip(file);
      if (files.length === 0) {
        onStatus({
          tone: 'error',
          text: `Archive contained no supported files. ${
            skipped.length ? `Skipped ${skipped.length} entries.` : ''
          }`,
        });
      } else {
        const baseName = file.name.replace(/\.zip$/i, '');
        if (sourceRepository.getProject()) {
          sourceRepository.addFiles(files, 'zip');
        } else {
          sourceRepository.loadFiles(files, baseName, 'zip');
        }
        onStatus({
          tone: 'success',
          text:
            `Loaded ${files.length} file(s) from ${file.name}.` +
            (skipped.length ? ` Skipped ${skipped.length} unsupported entries.` : ''),
        });
        toast.success(
          `Loaded ${files.length} file${files.length === 1 ? '' : 's'} from ${file.name}`,
        );
      }
    } catch (err) {
      onStatus({
        tone: 'error',
        text: err instanceof Error ? err.message : 'Failed to read archive.',
      });
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        Upload a ZIP archive of a project. Supported source files are extracted
        and added to the in-memory repository; binaries and metadata are
        skipped.
      </p>
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center hover:border-brand-400 hover:bg-brand-50/30">
        <Archive aria-hidden className="h-7 w-7 text-slate-400" />
        <span className="text-sm font-medium text-slate-700">
          Click to choose a .zip
        </span>
        <span className="text-xs text-slate-500">
          Sources inside the archive are filtered to supported extensions.
        </span>
        <input
          ref={ref}
          type="file"
          accept=".zip,application/zip"
          onChange={handleChange}
          disabled={busy}
          data-testid="file-input-zip"
          className="sr-only"
        />
      </label>
      {busy && <p className="text-sm text-slate-500">Extracting…</p>}
    </div>
  );
}
