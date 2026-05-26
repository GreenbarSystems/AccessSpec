import { useState } from 'react';
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
        className="mb-4 inline-flex rounded-lg bg-slate-100 p-1"
      >
        <TabButton
          active={mode === 'preview'}
          onClick={() => setMode('preview')}
          dataKey="preview"
        >
          📱 Device preview
        </TabButton>
        <TabButton
          active={mode === 'parity'}
          onClick={() => setMode('parity')}
          dataKey="parity"
        >
          ⚖️ Parity report
        </TabButton>
        <TabButton
          active={mode === 'runtime'}
          onClick={() => setMode('runtime')}
          dataKey="runtime"
        >
          🔬 Runtime audit
        </TabButton>
        <TabButton
          active={mode === 'screenshot'}
          onClick={() => setMode('screenshot')}
          dataKey="screenshot"
        >
          🖼️ Screenshot
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
  children,
}: {
  active: boolean;
  onClick: () => void;
  dataKey: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      data-mode={dataKey}
      className={[
        'rounded-md px-3 py-1.5 text-sm font-medium transition',
        active
          ? 'bg-white text-brand-700 shadow-sm'
          : 'text-slate-600 hover:text-slate-900',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
