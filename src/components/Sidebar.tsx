import { NavLink } from 'react-router-dom';
import { Accessibility } from 'lucide-react';
import { navItems } from '../lib/nav';

type SidebarProps = {
  open: boolean;
  onClose: () => void;
};

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {/* Backdrop for mobile drawer */}
      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
        />
      )}

      <aside
        className={[
          'fixed inset-y-0 left-0 z-40 w-72 transform border-r border-slate-200 dark:border-slate-800',
          'bg-white transition-transform duration-200 ease-out dark:bg-slate-900',
          open ? 'translate-x-0' : '-translate-x-full',
          'lg:static lg:translate-x-0 lg:w-64 lg:shrink-0',
        ].join(' ')}
        aria-label="Primary"
      >
        <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-5 dark:border-slate-800">
          <span
            aria-hidden
            className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 text-white"
          >
            <Accessibility className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              AccessSpec
            </div>
            <div className="text-xs text-slate-500">WCAG 2.2 dashboard</div>
          </div>
        </div>

        <nav className="space-y-1 p-3" onClick={onClose}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                ['nav-link', isActive ? 'nav-link-active' : ''].join(' ')
              }
            >
              <item.Icon aria-hidden className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 p-4 text-xs text-slate-500 dark:border-slate-800">
          <div className="font-medium text-slate-700 dark:text-slate-300">Active ruleset</div>
          <div>WCAG 2.2 AA · Mobile</div>
        </div>
      </aside>
    </>
  );
}
