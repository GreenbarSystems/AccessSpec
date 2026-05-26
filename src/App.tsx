import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { ToastHost } from './components/toast/ToastHost';
import Dashboard from './pages/Dashboard';
import Analyzer from './pages/Analyzer';
import Simulator from './pages/Simulator';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

// React Router's basename must match Vite's `base` (set in vite.config.ts).
// `import.meta.env.BASE_URL` resolves to "/" in dev and "/AccessSpec/" in
// production GH Pages builds — strip the trailing slash because Router
// expects `/AccessSpec`, not `/AccessSpec/`.
const ROUTER_BASENAME = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

export default function App() {
  return (
    <ToastHost>
      <BrowserRouter basename={ROUTER_BASENAME}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="analyzer" element={<Analyzer />} />
            <Route path="simulator" element={<Simulator />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
            <Route path="404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastHost>
  );
}
