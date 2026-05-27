import { Construction } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';

const PLANNED: { title: string; body: string; eta: string }[] = [
  {
    title: 'Ruleset preset',
    body:
      'Switch between WCAG 2.2 AA · WCAG 2.2 AAA · Apple HIG · Material 3. Today the dashboard runs all 17 rules; presets will let you scope the audit.',
    eta: 'Next',
  },
  {
    title: 'Threshold overrides',
    body:
      'Per-project tweaks to touch-target (24 / 44 / 48 px), font-size (11 / 14 px), and contrast (4.5 / 7) thresholds.',
    eta: 'Next',
  },
  {
    title: 'Export defaults',
    body:
      'Default report filename pattern, JSON schema version, CSV column order, PDF page size.',
    eta: 'Later',
  },
  {
    title: 'Theme',
    body:
      'Light / dark / system. The dashboard is light-only today; tokens are already in place via Tailwind dark: variants.',
    eta: 'Later',
  },
];

export default function Settings() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Configuration surface for ruleset selection, thresholds, and exports — currently roadmap-only."
      />
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="card flex items-start gap-3 border-amber-200 bg-amber-50/50 p-4">
          <Construction aria-hidden className="h-6 w-6 shrink-0 text-amber-700" />
          <div>
            <h2 className="text-sm font-semibold text-amber-900">
              No configurable settings yet
            </h2>
            <p className="text-xs text-amber-800">
              AccessSpec runs with sensible defaults out of the box (WCAG 2.2
              AA, the 17 rules in the rule packs, the standard contrast and
              touch-target thresholds). The items below are the planned
              configuration surface — track progress on the repo.
            </p>
          </div>
        </div>

        <ul className="space-y-3" data-testid="settings-roadmap">
          {PLANNED.map((item) => (
            <li
              key={item.title}
              className="card flex flex-wrap items-start justify-between gap-2 p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {item.title}
                </div>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{item.body}</p>
              </div>
              <span
                className={[
                  'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1',
                  item.eta === 'Next'
                    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                    : 'bg-slate-100 text-slate-600 dark:text-slate-400 ring-slate-200 dark:bg-slate-800',
                ].join(' ')}
              >
                {item.eta}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
