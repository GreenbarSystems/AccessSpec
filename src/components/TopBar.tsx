import { useLocation } from 'react-router-dom';
import { navItems } from '../lib/nav';

type TopBarProps = {
  onMenuClick: () => void;
};

export function TopBar({ onMenuClick }: TopBarProps) {
  const { pathname } = useLocation();
  const current =
    navItems.find((n) => (n.to === '/' ? pathname === '/' : pathname.startsWith(n.to))) ??
    navItems[0];

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur lg:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open navigation"
        className="btn-ghost lg:hidden -ml-2 h-10 w-10 p-0"
      >
        <span aria-hidden className="text-lg">
          ☰
        </span>
      </button>

      <div className="min-w-0 flex-1">
        <div className="truncate text-base font-semibold text-slate-900">
          {current.label}
        </div>
        <div className="hidden truncate text-xs text-slate-500 sm:block">
          {current.description}
        </div>
      </div>

      <div className="hidden items-center gap-2 sm:flex">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
          <span
            aria-hidden
            className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"
          />
          Ruleset synced
        </span>
        <button type="button" className="btn-primary h-10">
          New audit
        </button>
      </div>
    </header>
  );
}
