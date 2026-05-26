import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { SourceExplorer } from '../components/explorer/SourceExplorer';
import { ComponentInventoryPanel } from '../components/inventory/ComponentInventoryPanel';
import { TouchTargetsPanel } from '../components/touchTargets/TouchTargetsPanel';
import { ContrastPanel } from '../components/contrast/ContrastPanel';
import { DynamicTextPanel } from '../components/dynamicText/DynamicTextPanel';
import { ReflowPanel } from '../components/reflow/ReflowPanel';
import { PatternsPanel } from '../components/patterns/PatternsPanel';

type Mode =
  | 'source'
  | 'components'
  | 'targets'
  | 'contrast'
  | 'dynamic'
  | 'reflow'
  | 'patterns';
type JumpState = { jump?: { path: string; line: number } };

export default function Analyzer() {
  const [mode, setMode] = useState<Mode>('source');
  const [jumpTo, setJumpTo] = useState<{ path: string; line: number; tick: number } | null>(
    null,
  );

  // Honor `state.jump` set by the scoring dashboard's findings list.
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const incoming = (location.state as JumpState | null)?.jump;
    if (!incoming) return;
    setMode('source');
    setJumpTo({ path: incoming.path, line: incoming.line, tick: Date.now() });
    // Clear so a manual revisit doesn't re-jump.
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  const handleJumpFromInventory = (path: string, line: number) => {
    setMode('source');
    setJumpTo({ path, line, tick: Date.now() });
  };

  return (
    <>
      <PageHeader
        title="Analyzer"
        description="Browse the uploaded project, inspect any file, and review the detected component inventory before running WCAG 2.2 checks."
      />

      <div
        role="tablist"
        aria-label="Analyzer view"
        className="mb-4 inline-flex rounded-lg bg-slate-100 p-1"
      >
        <TabButton
          active={mode === 'source'}
          onClick={() => setMode('source')}
          dataKey="source"
        >
          📂 Source
        </TabButton>
        <TabButton
          active={mode === 'components'}
          onClick={() => setMode('components')}
          dataKey="components"
        >
          🧩 Components
        </TabButton>
        <TabButton
          active={mode === 'targets'}
          onClick={() => setMode('targets')}
          dataKey="targets"
        >
          👆 Touch targets
        </TabButton>
        <TabButton
          active={mode === 'contrast'}
          onClick={() => setMode('contrast')}
          dataKey="contrast"
        >
          🎨 Contrast
        </TabButton>
        <TabButton
          active={mode === 'dynamic'}
          onClick={() => setMode('dynamic')}
          dataKey="dynamic"
        >
          🔤 Dynamic type
        </TabButton>
        <TabButton
          active={mode === 'reflow'}
          onClick={() => setMode('reflow')}
          dataKey="reflow"
        >
          📐 Reflow
        </TabButton>
        <TabButton
          active={mode === 'patterns'}
          onClick={() => setMode('patterns')}
          dataKey="patterns"
        >
          🧠 Patterns
        </TabButton>
      </div>

      {mode === 'source' && <SourceExplorer externalJump={jumpTo} />}
      {mode === 'components' && (
        <ComponentInventoryPanel onJump={handleJumpFromInventory} />
      )}
      {mode === 'targets' && (
        <TouchTargetsPanel onJump={handleJumpFromInventory} />
      )}
      {mode === 'contrast' && (
        <ContrastPanel onJump={handleJumpFromInventory} />
      )}
      {mode === 'dynamic' && (
        <DynamicTextPanel onJump={handleJumpFromInventory} />
      )}
      {mode === 'reflow' && (
        <ReflowPanel onJump={handleJumpFromInventory} />
      )}
      {mode === 'patterns' && (
        <PatternsPanel onJump={handleJumpFromInventory} />
      )}
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
