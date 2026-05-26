import { useRef, useState } from 'react';
import {
  SOURCE_EXTENSIONS,
  isSourceFilename,
  readBrowserFile,
} from '../../services/FileParser';
import { sourceRepository } from '../../services/SourceRepository';
import { useToast } from '../toast/ToastHost';
import type { StatusMessage } from './UploadPanel';

type Props = {
  mode: 'single' | 'multi';
  onStatus: (s: StatusMessage | null) => void;
};

const ACCEPT_ATTR = SOURCE_EXTENSIONS.map((e) => `.${e}`).join(',');

export function FilePicker({ mode, onStatus }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list || list.length === 0) return;
    setBusy(true);
    onStatus({ tone: 'info', text: `Reading ${list.length} file(s)…` });

    const added: string[] = [];
    const skipped: string[] = [];
    for (const file of Array.from(list)) {
      if (!isSourceFilename(file.name)) {
        skipped.push(`${file.name} (unsupported extension)`);
        continue;
      }
      try {
        const sf = await readBrowserFile(file, 'file');
        sourceRepository.addFiles([sf], 'file');
        added.push(sf.path);
      } catch (err) {
        skipped.push(
          `${file.name} (${err instanceof Error ? err.message : 'read failed'})`,
        );
      }
    }

    setBusy(false);
    if (ref.current) ref.current.value = '';
    if (added.length === 0) {
      onStatus({
        tone: 'error',
        text: `Nothing added. ${skipped.join('; ') || 'Empty selection.'}`,
      });
    } else {
      const summary = `Added ${added.length} file${added.length === 1 ? '' : 's'}`;
      onStatus({
        tone: 'success',
        text: summary + (skipped.length ? `. Skipped: ${skipped.join('; ')}` : '.'),
      });
      toast.success(summary + (skipped.length ? ` (${skipped.length} skipped)` : ''));
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        {mode === 'single'
          ? 'Upload a single source file from your machine.'
          : 'Select multiple source files. Folder structure is preserved when you drag a folder in.'}
      </p>
      <label
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center hover:border-brand-400 hover:bg-brand-50/30"
        data-mode={mode}
      >
        <span aria-hidden className="text-2xl">
          {mode === 'single' ? '📄' : '🗂️'}
        </span>
        <span className="text-sm font-medium text-slate-700">
          Click to choose {mode === 'single' ? 'a file' : 'files'}
        </span>
        <span className="text-xs text-slate-500">
          Accepts {SOURCE_EXTENSIONS.map((e) => `.${e}`).join(', ')}
        </span>
        <input
          ref={ref}
          type="file"
          accept={ACCEPT_ATTR}
          multiple={mode === 'multi'}
          onChange={handleChange}
          disabled={busy}
          data-testid={mode === 'single' ? 'file-input-single' : 'file-input-multi'}
          className="sr-only"
        />
      </label>
      {busy && <p className="text-sm text-slate-500">Reading…</p>}
    </div>
  );
}
