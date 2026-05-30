import { useState } from 'react';
import {
  Image,
  Microscope,
  Scale,
  Smartphone,
  type LucideIcon,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { DeviceSimulator } from '../components/simulator/DeviceSimulator';
import { PlatformParityPanel } from '../components/parity/PlatformParityPanel';
import { RuntimeAuditPanel } from '../components/runtime/RuntimeAuditPanel';
import { ScreenshotAnalysisPanel } from '../components/screenshot/ScreenshotAnalysisPanel';

type Mode = 'preview' | 'parity' | 'runtime' | 'screenshot';

export default function Simulator() {
  const [mode, setMode] = useState<Mode>('preview');
  return (
    <>
      <PageHeader
        title="Simulator"
        section={
          {
            preview: 'Device preview',
            parity: 'Parity report',
            runtime: 'Runtime audit',
            screenshot: 'Screenshot analysis',
          }[mode] ?? mode
        }
        description="Render the uploaded app inside device frames and compare every detected pattern to its iOS and Android native equivalents."
      />

      <div
        role="tablist"
        aria-label="Simulator view"
        className="mb-4 inline-flex flex-wrap rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
      >
        <TabButton active={mode === 'preview'} onClick={() => setMode('preview')} dataKey="preview" Icon={Smartphone} hint="Render your HTML inside iPhone / Pixel / Galaxy / iPad chassis at correct CSS px dimensions.">
          Device preview
        </TabButton>
        <TabButton active={mode === 'parity'} onClick={() => setMode('parity')} dataKey="parity" Icon={Scale} hint="Side-by-side: your component vs the native iOS and Android primitive it should map to.">
          Parity report
        </TabButton>
        <TabButton active={mode === 'runtime'} onClick={() => setMode('runtime')} dataKey="runtime" Icon={Microscope} hint="Walks the rendered DOM with computed styles — catches issues the static parser can't see.">
          Runtime audit
        </TabButton>
        <TabButton active={mode === 'screenshot'} onClick={() => setMode('screenshot')} dataKey="screenshot" Icon={Image} hint="Upload PNG/JPEG screenshots; measures pixel contrast and simulates colour-blindness.">
          Screenshot
        </TabButton>
      </div>

      {mode === 'preview' && <DeviceSimulator />}
      {mode === 'parity' && <PlatformParityPanel />}
      {mode === 'runtime' && <RuntimeAuditPanel />}
      {mode === 'screenshot' && <ScreenshotAnalysisPanel />}
    </>
  );
}

function TabButton({
  active,
  onClick,
  dataKey,
  Icon,
  hint,
  children,
}: {
  active: boolean;
  onClick: () => void;
  dataKey: string;
  Icon: LucideIcon;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      data-mode={dataKey}
      title={hint}
      className={[
        'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition',
        active
          ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-900'
          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100',
      ].join(' ')}
    >
      <Icon aria-hidden className="h-4 w-4" />
      {children}
    </button>
  );
}
