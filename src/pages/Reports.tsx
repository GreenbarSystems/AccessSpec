import { useState } from 'react';
import { Bot, Scissors, Search, Wrench, type LucideIcon } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { ReportExportPanel } from '../components/reports/ReportExportPanel';
import { ViolationInspector } from '../components/inspector/ViolationInspector';
import { RemediationPlaybook } from '../components/remediation/RemediationPlaybook';
import { AssistantPanel } from '../components/assistant/AssistantPanel';
import { RefactoringPanel } from '../components/refactor/RefactoringPanel';

type Mode = 'inspector' | 'playbook' | 'assistant' | 'refactor';

export default function Reports() {
  const [mode, setMode] = useState<Mode>('inspector');
  return (
    <>
      <PageHeader
        title="Reports"
        section={
          {
            inspector: 'Browse by rule',
            playbook: 'Remediation playbook',
            assistant: 'Assistant',
            refactor: 'Code fixes',
          }[mode] ?? mode
        }
        description="Export the audit, browse every rule that fired, and generate a copy-paste-ready remediation playbook for engineering."
      />
      <div className="space-y-6">
        <ReportExportPanel />

        <div
          role="tablist"
          aria-label="Reports view"
          className="inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
        >
          <TabButton active={mode === 'inspector'} onClick={() => setMode('inspector')} dataKey="inspector" Icon={Search}>
            Browse by rule
          </TabButton>
          <TabButton active={mode === 'playbook'} onClick={() => setMode('playbook')} dataKey="playbook" Icon={Wrench}>
            Playbook
          </TabButton>
          <TabButton active={mode === 'assistant'} onClick={() => setMode('assistant')} dataKey="assistant" Icon={Bot}>
            Ask assistant
          </TabButton>
          <TabButton active={mode === 'refactor'} onClick={() => setMode('refactor')} dataKey="refactor" Icon={Scissors}>
            Code fixes
          </TabButton>
        </div>

        {mode === 'inspector' && <ViolationInspector />}
        {mode === 'playbook' && <RemediationPlaybook />}
        {mode === 'assistant' && <AssistantPanel />}
        {mode === 'refactor' && <RefactoringPanel />}
      </div>
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
          ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-900'
          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100',
      ].join(' ')}
    >
      <Icon aria-hidden className="h-4 w-4" />
      {children}
    </button>
  );
}
