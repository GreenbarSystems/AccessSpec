import { useLocation, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { navItems } from '../lib/nav';
import { startNewAudit } from '../lib/newAudit';

type TopBarProps = {
  onMenuClick: () => void;
  onShowShortcuts: () => void;
};

export function TopBar({ onMenuClick, onShowShortcuts }: TopBarProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const current =
    navItems.find((n) => (n.to === '/' ? pathname === '/' : pathname.startsWith(n.to))) ??
    navItems[0];

  const handleNewAudit = () => startNewAudit(navigate, pathname);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur lg:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open navigation"
        className="btn-ghost lg:hidden -ml-2 h-10 w-10 p-0"
      >
        <Menu aria-hidden className="h-5 w-5" />
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
        <button
          type="button"
          onClick={onShowShortcuts}
          aria-label="Show keyboard shortcuts (press ?)"
          title="Keyboard shortcuts (?)"
          className="btn-ghost h-10 w-10 p-0 font-mono text-base"
          data-testid="shortcuts-button"
        >
          <span aria-hidden>?</span>
        </button>
        <button
          type="button"
          onClick={handleNewAudit}
          className="btn-primary h-10"
          data-testid="new-audit"
        >
          New audit
        </button>
      </div>
    </header>
  );
}
