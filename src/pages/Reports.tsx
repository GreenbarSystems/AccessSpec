import { useState } from 'react';
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
        description="Export the audit, inspect every rule violation, and generate a copy-paste-ready remediation playbook for engineering."
      />
      <div className="space-y-6">
        <ReportExportPanel />

        <div
          role="tablist"
          aria-label="Reports view"
          className="inline-flex rounded-lg bg-slate-100 p-1"
        >
          <TabButton
            active={mode === 'inspector'}
            onClick={() => setMode('inspector')}
            dataKey="inspector"
          >
            🔍 Inspector
          </TabButton>
          <TabButton
            active={mode === 'playbook'}
            onClick={() => setMode('playbook')}
            dataKey="playbook"
          >
            🛠️ Remediation playbook
          </TabButton>
          <TabButton
            active={mode === 'assistant'}
            onClick={() => setMode('assistant')}
            dataKey="assistant"
          >
            🤖 Assistant
          </TabButton>
          <TabButton
            active={mode === 'refactor'}
            onClick={() => setMode('refactor')}
            dataKey="refactor"
          >
            ✂️ Refactor
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
