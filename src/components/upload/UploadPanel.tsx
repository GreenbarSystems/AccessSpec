import { useState, type ReactNode } from 'react';
import {
  Archive,
  Clipboard,
  FileText,
  Globe,
  Layers,
  type LucideIcon,
} from 'lucide-react';
import { PasteSource } from './PasteSource';
import { FilePicker } from './FilePicker';
import { ZipUpload } from './ZipUpload';
import { RepoImport } from './RepoImport';

type Tab = {
  id: string;
  label: string;
  Icon: LucideIcon;
  render: (onStatus: (m: StatusMessage | null) => void) => ReactNode;
};

export type StatusMessage = {
  tone: 'success' | 'error' | 'info';
  text: string;
};

const TABS: Tab[] = [
  {
    id: 'paste',
    label: 'Paste source',
    Icon: Clipboard,
    render: (onStatus) => <PasteSource onStatus={onStatus} />,
  },
  {
    id: 'file',
    label: 'Upload file',
    Icon: FileText,
    render: (onStatus) => <FilePicker mode="single" onStatus={onStatus} />,
  },
  {
    id: 'multi',
    label: 'Upload multiple',
    Icon: Layers,
    render: (onStatus) => <FilePicker mode="multi" onStatus={onStatus} />,
  },
  {
    id: 'zip',
    label: 'Upload ZIP',
    Icon: Archive,
    render: (onStatus) => <ZipUpload onStatus={onStatus} />,
  },
  {
    id: 'repo',
    label: 'Import repo',
    Icon: Globe,
    render: (onStatus) => <RepoImport onStatus={onStatus} />,
  },
];

export function UploadPanel() {
  const [active, setActive] = useState<string>('paste');
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const tab = TABS.find((t) => t.id === active) ?? TABS[0];

  return (
    <div className="card overflow-hidden">
      <div
        role="tablist"
        aria-label="Upload source"
        className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-2"
      >
        {TABS.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              data-tab={t.id}
              onClick={() => {
                setActive(t.id);
                setStatus(null);
              }}
              className={[
                'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition',
                isActive
                  ? 'bg-white text-brand-700 shadow-sm ring-1 ring-slate-200'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-white hover:text-slate-900',
              ].join(' ')}
            >
              <t.Icon aria-hidden className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="p-5">
        {tab.render(setStatus)}
        {status && (
          <div
            role={status.tone === 'error' ? 'alert' : 'status'}
            data-upload-status={status.tone}
            className={[
              'mt-4 rounded-md border px-3 py-2 text-sm',
              status.tone === 'success' &&
                'border-emerald-200 bg-emerald-50 text-emerald-800',
              status.tone === 'error' &&
                'border-rose-200 bg-rose-50 text-rose-800',
              status.tone === 'info' &&
                'border-sky-200 bg-sky-50 text-sky-800',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {status.text}
          </div>
        )}
      </div>
    </div>
  );
}
