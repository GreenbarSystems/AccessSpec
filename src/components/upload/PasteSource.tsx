import { useState } from 'react';
import {
  SUPPORTED_EXTENSIONS,
  parsePastedSource,
} from '../../services/FileParser';
import { sourceRepository } from '../../services/SourceRepository';
import { useToast } from '../toast/ToastHost';
import type { StatusMessage } from './UploadPanel';

type Props = {
  onStatus: (s: StatusMessage | null) => void;
};

const SOURCE_EXTS = SUPPORTED_EXTENSIONS.filter((e) => e !== 'zip');

export function PasteSource({ onStatus }: Props) {
  const [filename, setFilename] = useState('pasted.html');
  const [content, setContent] = useState('');
  const toast = useToast();

  const handleAdd = () => {
    try {
      const file = parsePastedSource(content, filename || 'pasted.html');
      sourceRepository.addFiles([file], 'paste');
      onStatus({
        tone: 'success',
        text: `Added ${file.path} (${file.size} bytes) to the project.`,
      });
      toast.success(`Added ${file.name} to the project`);
      setContent('');
    } catch (err) {
      onStatus({
        tone: 'error',
        text: err instanceof Error ? err.message : 'Failed to parse source.',
      });
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        Paste a single source file. Pick a filename — its extension determines
        how the analyzer treats it.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label
          htmlFor="paste-filename"
          className="text-xs font-medium text-slate-700"
        >
          Filename
        </label>
        <input
          id="paste-filename"
          type="text"
          value={filename}
          onChange={(e) => setFilename(e.target.value)}
          className="flex-1 min-w-[180px] rounded-md border border-slate-300 px-3 py-1.5 text-sm font-mono focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        <span className="text-xs text-slate-500">
          Supported: {SOURCE_EXTS.map((e) => `.${e}`).join(', ')}
        </span>
      </div>
      <textarea
        aria-label="Source code"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        spellCheck={false}
        placeholder="// paste source here…"
        className="h-56 w-full resize-y rounded-md border border-slate-300 bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
      />
      <div className="flex justify-end">
        <button
          type="button"
          className="btn-primary"
          onClick={handleAdd}
          disabled={content.length === 0}
          data-action="paste-add"
        >
          Add to project
        </button>
      </div>
    </div>
  );
}
