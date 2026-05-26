import type { ReactNode } from 'react';

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  /**
   * Active section / tab label (e.g. "Components", "Parity report").
   * Renders as a small breadcrumb above the title so users always have a
   * "you are here" anchor when navigating between deep panels.
   */
  section?: string;
};

export function PageHeader({ title, description, actions, section }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {section && (
          <nav
            aria-label="Breadcrumb"
            className="mb-1 text-xs text-slate-500"
          >
            <span className="font-medium">{title}</span>
            <span aria-hidden className="mx-1.5">
              ›
            </span>
            <span className="text-slate-700">{section}</span>
          </nav>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
