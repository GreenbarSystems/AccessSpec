import { Construction, Monitor, Moon, RotateCcw, Sun } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { DEVICES } from '../services/DevicePreview';
import {
  resetPreferences,
  setPreferences,
  useUserPreferences,
  type SeverityDefault,
  type ThemePreference,
  type UserPreferences,
} from '../services/UserPreferences';
import { useToast } from '../components/toast/ToastHost';

/**
 * Settings
 *
 * User-configurable preferences, persisted via UserPreferences (one
 * localStorage entry keyed `accessspec:user-preferences`).
 *
 * Sections:
 *   - Appearance         theme (light / dark / system)
 *   - Audit defaults     severity filter on load + findings list cap
 *   - Simulator defaults default device
 *   - Components tab     group-by-file default
 *   - Data               reset preferences
 *
 * Every control here directly drives the corresponding consumer panel
 * — Theme writes the same store useTheme() reads; defaultDeviceId is
 * picked up by DeviceSimulator on mount; findingsLimit is the cap
 * FindingsList applies when no filter is active.
 *
 * The trailing "Planned" section documents the configuration surface
 * that still needs underlying rule-engine support before it can be
 * wired (ruleset presets, per-threshold overrides, export defaults).
 */

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
];

export default function Settings() {
  const prefs = useUserPreferences();
  const toast = useToast();

  // Generic patch helper that surfaces a tiny success toast so the user
  // gets immediate feedback when a setting takes effect.
  const update = <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K],
    label: string,
  ) => {
    setPreferences({ [key]: value });
    toast.info(label, 2000);
  };

  return (
    <>
      <PageHeader
        title="Settings"
        description="Persisted preferences that drive default behaviour across the dashboard."
      />
      <div className="mx-auto max-w-3xl space-y-4">
        <Section
          title="Appearance"
          description="Theme is mirrored by the Sun / Moon toggle in the top bar."
        >
          <FieldLabel>Theme</FieldLabel>
          <div className="mt-2 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900">
            <ThemeOption
              value="light"
              active={prefs.theme === 'light'}
              Icon={Sun}
              onClick={() => update('theme', 'light', 'Theme set to Light')}
            >
              Light
            </ThemeOption>
            <ThemeOption
              value="dark"
              active={prefs.theme === 'dark'}
              Icon={Moon}
              onClick={() => update('theme', 'dark', 'Theme set to Dark')}
            >
              Dark
            </ThemeOption>
            <ThemeOption
              value="system"
              active={prefs.theme === 'system'}
              Icon={Monitor}
              onClick={() => update('theme', 'system', 'Theme follows system')}
            >
              System
            </ThemeOption>
          </div>
        </Section>

        <Section
          title="Audit defaults"
          description="Controls the first view of the scoring dashboard after a project loads."
        >
          <FieldLabel htmlFor="default-severity">
            Default severity filter
          </FieldLabel>
          <select
            id="default-severity"
            value={prefs.defaultSeverityFilter}
            onChange={(e) =>
              update(
                'defaultSeverityFilter',
                e.target.value as SeverityDefault,
                `Default filter: ${e.target.value}`,
              )
            }
            className="mt-1 block w-full max-w-xs rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900"
            data-pref="defaultSeverityFilter"
          >
            <option value="all">All findings</option>
            <option value="critical">Critical only</option>
            <option value="warning">Warnings only</option>
            <option value="info">Info only</option>
          </select>
          <HelpText>
            Used as the initial state of the Dashboard's filter chips.
            Doesn't affect what the rule engine runs — only what's
            highlighted first.
          </HelpText>

          <div className="mt-4">
            <FieldLabel htmlFor="findings-limit">
              Findings list cap (unfiltered)
            </FieldLabel>
            <div className="mt-1 flex items-center gap-3">
              <input
                id="findings-limit"
                type="range"
                min={5}
                max={50}
                step={5}
                value={prefs.findingsLimit}
                onChange={(e) =>
                  update(
                    'findingsLimit',
                    Number(e.target.value),
                    `Findings cap: ${e.target.value}`,
                  )
                }
                className="w-48 accent-brand-600"
                data-pref="findingsLimit"
              />
              <span className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-300">
                {prefs.findingsLimit}
              </span>
            </div>
            <HelpText>
              Active filter views always show every match; this cap only
              applies when nothing is filtered.
            </HelpText>
          </div>
        </Section>

        <Section
          title="Simulator defaults"
          description="Controls which device renders first on the Simulator → Device preview tab."
        >
          <FieldLabel htmlFor="default-device">Default device</FieldLabel>
          <select
            id="default-device"
            value={prefs.defaultDeviceId}
            onChange={(e) =>
              update(
                'defaultDeviceId',
                e.target.value,
                `Default device: ${DEVICES.find((d) => d.id === e.target.value)?.name ?? e.target.value}`,
              )
            }
            className="mt-1 block w-full max-w-xs rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900"
            data-pref="defaultDeviceId"
          >
            {DEVICES.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} · {d.width}×{d.height}
              </option>
            ))}
          </select>
        </Section>

        <Section
          title="Components tab"
          description="Default layout for the Analyzer → Components inventory."
        >
          <ToggleField
            id="inventory-group"
            label="Group rows by source file by default"
            checked={prefs.inventoryGroupByFile}
            onChange={(checked) =>
              update(
                'inventoryGroupByFile',
                checked,
                checked
                  ? 'Inventory grouped by file by default'
                  : 'Inventory in flat list by default',
              )
            }
          />
          <HelpText>
            Equivalent to the Group-by-file toggle on the panel itself —
            this just sets where it starts.
          </HelpText>
        </Section>

        <Section
          title="Data"
          description="Reset stored preferences. Doesn't touch the in-memory project — use Clear project on the Dashboard for that."
        >
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                resetPreferences();
                toast.success('Preferences reset to defaults');
              }}
              className="btn-ghost inline-flex items-center gap-2 text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-900/20"
              data-action="reset-prefs"
            >
              <RotateCcw aria-hidden className="h-4 w-4" />
              Reset preferences to defaults
            </button>
            {prefs.onboardingDismissed && (
              <button
                type="button"
                onClick={() => {
                  setPreferences({ onboardingDismissed: false });
                  toast.info('Tour will replay on next Dashboard visit');
                }}
                className="btn-ghost text-xs"
                data-action="replay-tour"
              >
                Replay onboarding tour
              </button>
            )}
          </div>
        </Section>

        <div
          className="card flex items-start gap-3 border-amber-200 bg-amber-50/50 p-4 dark:border-amber-800 dark:bg-amber-900/20"
          data-testid="settings-roadmap-note"
        >
          <Construction aria-hidden className="h-6 w-6 shrink-0 text-amber-700 dark:text-amber-300" />
          <div>
            <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
              Planned configuration
            </h2>
            <p className="text-xs text-amber-800 dark:text-amber-200">
              The items below need underlying rule-engine work before they
              can be wired through. They're tracked on the roadmap.
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
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                  {item.body}
                </p>
              </div>
              <span
                className={[
                  'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1',
                  item.eta === 'Next'
                    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:ring-emerald-800'
                    : 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
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

/* ------------------------------------------------------------------ */
/* Small presentational helpers                                        */
/* ------------------------------------------------------------------ */

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-4" data-section={title.toLowerCase().replace(/\s+/g, '-')}>
      <div className="border-b border-slate-100 pb-3 dark:border-slate-800">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </h2>
        {description && (
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        )}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-xs font-medium text-slate-700 dark:text-slate-300"
    >
      {children}
    </label>
  );
}

function HelpText({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1 text-[11px] text-slate-500">{children}</p>
  );
}

function ThemeOption({
  value,
  active,
  Icon,
  onClick,
  children,
}: {
  value: ThemePreference;
  active: boolean;
  Icon: typeof Sun;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-theme-option={value}
      className={[
        'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition',
        active
          ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-800 dark:text-brand-200'
          : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100',
      ].join(' ')}
    >
      <Icon aria-hidden className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}

function ToggleField({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="inline-flex cursor-pointer items-center gap-2">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-700"
        data-pref={id}
      />
      <span className="text-sm text-slate-800 dark:text-slate-200">{label}</span>
    </label>
  );
}
