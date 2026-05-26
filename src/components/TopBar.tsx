import { useLocation, useNavigate } from 'react-router-dom';
import { navItems } from '../lib/nav';
import { sourceRepository } from '../services/SourceRepository';

type TopBarProps = {
  onMenuClick: () => void;
};

export function TopBar({ onMenuClick }: TopBarProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const current =
    navItems.find((n) => (n.to === '/' ? pathname === '/' : pathname.startsWith(n.to))) ??
    navItems[0];

  // "New audit" wipes the current project and lands the user on the Dashboard
  // with the upload panel already scrolled into view. From the Dashboard with
  // no project loaded it still scrolls — useful if the page got long.
  const handleNewAudit = () => {
    sourceRepository.clear();
    if (pathname !== '/') navigate('/');
    // Let the route + state changes commit before measuring.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const target =
          document.querySelector<HTMLElement>('[data-upload-panel]') ??
          document.querySelector<HTMLElement>('[data-tab="paste"]');
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Move keyboard focus too so the action is accessible.
        document
          .querySelector<HTMLButtonElement>('[data-tab="paste"]')
          ?.focus();
      });
    });
  };

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
