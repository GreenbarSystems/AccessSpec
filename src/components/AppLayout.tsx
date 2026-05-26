import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { KeyboardShortcutsOverlay } from './KeyboardShortcutsOverlay';
import { useKeyboardShortcuts } from '../lib/useKeyboardShortcuts';
import { startNewAudit } from '../lib/newAudit';

export function AppLayout() {
  const [navOpen, setNavOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // Auto-close mobile drawer on route change
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  // Hook handler refs change on every render — wrap in useCallback so the
  // hook's identity stays stable and we don't re-register the listener.
  const onToggleHelp = useCallback(() => setShortcutsOpen((v) => !v), []);
  const onCloseHelp = useCallback(() => setShortcutsOpen(false), []);
  const onNewAudit = useCallback(
    () => startNewAudit(navigate, pathname),
    [navigate, pathname],
  );

  useKeyboardShortcuts({ onToggleHelp, onCloseHelp, onNewAudit });

  return (
    <div className="flex min-h-full bg-slate-50">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          onMenuClick={() => setNavOpen(true)}
          onShowShortcuts={() => setShortcutsOpen(true)}
        />
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>

      <KeyboardShortcutsOverlay
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
    </div>
  );
}
