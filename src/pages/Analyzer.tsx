import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Brain,
  FolderOpen,
  Hand,
  Maximize,
  Palette,
  Puzzle,
  Type,
  type LucideIcon,
} from 'lucide-react';
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
        section={
          {
            source: 'Source explorer',
            components: 'Components',
            targets: 'Touch targets',
            contrast: 'Contrast',
            dynamic: 'Dynamic type',
            reflow: 'Reflow',
            patterns: 'Patterns',
          }[mode] ?? mode
        }
        description="Browse the uploaded project, inspect any file, and review the detected component inventory before running WCAG 2.2 checks."
      />

      <div
        role="tablist"
        aria-label="Analyzer view"
        className="mb-4 inline-flex flex-wrap rounded-lg bg-slate-100 p-1"
      >
        <TabButton active={mode === 'source'} onClick={() => setMode('source')} dataKey="source" Icon={FolderOpen}>
          Source
        </TabButton>
        <TabButton active={mode === 'components'} onClick={() => setMode('components')} dataKey="components" Icon={Puzzle}>
          Components
        </TabButton>
        <TabButton active={mode === 'targets'} onClick={() => setMode('targets')} dataKey="targets" Icon={Hand}>
          Touch targets
        </TabButton>
        <TabButton active={mode === 'contrast'} onClick={() => setMode('contrast')} dataKey="contrast" Icon={Palette}>
          Contrast
        </TabButton>
        <TabButton active={mode === 'dynamic'} onClick={() => setMode('dynamic')} dataKey="dynamic" Icon={Type}>
          Dynamic type
        </TabButton>
        <TabButton active={mode === 'reflow'} onClick={() => setMode('reflow')} dataKey="reflow" Icon={Maximize}>
          Reflow
        </TabButton>
        <TabButton active={mode === 'patterns'} onClick={() => setMode('patterns')} dataKey="patterns" Icon={Brain}>
          Patterns
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
  Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  dataKey: string;
  Icon: LucideIcon;
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
        'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition',
        active
          ? 'bg-white text-brand-700 shadow-sm'
          : 'text-slate-600 hover:text-slate-900',
      ].join(' ')}
    >
      <Icon aria-hidden className="h-4 w-4" />
      {children}
    </button>
  );
}
