import { PageHeader } from '../components/PageHeader';

export default function Settings() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Default thresholds, ruleset selection, and integration credentials."
      />
      <div className="card p-6">
        <p className="text-sm text-slate-600">
          Configuration controls land alongside the Analyzer ruleset wiring.
        </p>
      </div>
    </>
  );
}
