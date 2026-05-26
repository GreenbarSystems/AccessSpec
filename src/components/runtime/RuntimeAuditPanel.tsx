import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSourceRepository } from '../../services/useSourceRepository';
import { buildPreviewDocument } from '../../services/DevicePreview';
import {
  RUNTIME_CATEGORIES,
  RUNTIME_SEVERITIES,
  type RuntimeFinding,
  type RuntimeReport,
  type RuntimeSeverity,
  type RuntimeCategory,
} from '../../services/DomRuntimeScanner';
// `?raw` returns the file contents as a string at build time. We inject it
// into the preview iframe's srcDoc so the iframe can stay sandboxed to
// `allow-scripts` only — no `allow-same-origin`, so the parent never hands
// out a DOM handle to user-uploaded code.
import runtimeScannerInline from '../../services/runtimeScannerInline.js?raw';

const SEVERITY_TONE: Record<RuntimeSeverity, string> = {
  critical: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  warning: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
  info: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
};

const CATEGORY_ICON: Record<RuntimeCategory, string> = {
  touch: '👆',
  a11y: '🦮',
  contrast: '🎨',
  visibility: '👁️',
  text: '🔤',
};

const SCAN_VIEWPORT = { width: 393, height: 852 }; // iPhone 15 default

export function RuntimeAuditPanel() {
  const navigate = useNavigate();
  const { project } = useSourceRepository();
  const files = useMemo(() => {
    if (!project) return [];
    return [...project.filesByPath.values()];
  }, [project]);
  // Inject the sandbox-side scanner directly into the iframe's srcDoc. The
  // scanner walks the iframe's own DOM, builds the report, and posts it
  // back to us — so we never need a same-origin window handle into the
  // user-uploaded page.
  const preview = useMemo(
    () => buildPreviewDocument(files, { injectScript: runtimeScannerInline }),
    [files],
  );

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [report, setReport] = useState<RuntimeReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  // Listen for scan results posted by the iframe. We accept any source so
  // long as the message shape matches — origin checks aren't useful for a
  // sandboxed iframe with an opaque (null) origin.
  useEffect(() => {
    const handler = (ev: MessageEvent) => {
      const iframe = iframeRef.current;
      if (!iframe || ev.source !== iframe.contentWindow) return;
      const data = ev.data as unknown;
      if (!data || typeof data !== 'object' || !('type' in data)) return;
      const msg = data as {
        type: string;
        report?: RuntimeReport;
        message?: string;
      };
      if (msg.type === 'accessspec:scan-result' && msg.report) {
        setReport(msg.report);
        setError(null);
        setScanning(false);
      } else if (msg.type === 'accessspec:scan-error') {
        setError(msg.message ?? 'Scan failed inside iframe.');
        setScanning(false);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const runScan = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow) return;
    setScanning(true);
    setError(null);
    iframe.contentWindow.postMessage({ type: 'accessspec:scan' }, '*');
  }, []);

  const [severityFilter, setSeverityFilter] = useState<RuntimeSeverity | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<RuntimeCategory | 'all'>('all');

  const visible = useMemo<RuntimeFinding[]>(() => {
    if (!report) return [];
    return report.findings.filter((f) => {
      if (severityFilter !== 'all' && f.severity !== severityFilter) return false;
      if (categoryFilter !== 'all' && f.category !== categoryFilter) return false;
      return true;
    });
  }, [report, severityFilter, categoryFilter]);

  if (!project) {
    return (
      <div className="card p-6 text-sm text-slate-600">
        Upload a project to run a live runtime audit.
      </div>
    );
  }
  if (!preview.html) {
    return (
      <div className="card p-6 text-sm text-slate-600">
        {preview.reason ?? 'No HTML entry available to render.'}
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="runtime-audit-panel">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[14rem_1fr]">
        {/* Live iframe (small, fixed) */}
        <div className="card p-2">
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Live preview · iPhone 15
          </div>
          <div className="mt-1 overflow-hidden rounded border border-slate-200 bg-white">
            <iframe
              ref={iframeRef}
              title="Runtime audit preview"
              srcDoc={preview.html}
              sandbox="allow-scripts"
              style={{
                width: SCAN_VIEWPORT.width,
                height: SCAN_VIEWPORT.height,
                transform: 'scale(0.5)',
                transformOrigin: 'top left',
                border: 'none',
                background: 'white',
              }}
              data-testid="runtime-iframe"
            />
            {/* Reserve the post-scale footprint so layout doesn't collapse. */}
            <div
              aria-hidden
              style={{
                width: SCAN_VIEWPORT.width * 0.5,
                height: 0,
              }}
            />
          </div>
          <button
            type="button"
            onClick={runScan}
            disabled={scanning}
            data-testid="runtime-scan"
            className="btn-primary mt-3 w-full text-xs"
          >
            {scanning ? 'Scanning…' : 'Re-run scan'}
          </button>
          {report && (
            <p className="mt-2 text-[11px] text-slate-500">
              Scanned {new Date(report.scannedAt).toLocaleTimeString()} ·{' '}
              {report.elementCount} elements
              <br />
              {report.interactiveCount} interactive
            </p>
          )}
          {error && (
            <p
              className="mt-2 text-[11px] text-rose-700"
              data-testid="runtime-error"
            >
              {error}
            </p>
          )}
        </div>

        {/* Results */}
        <div className="space-y-3">
          {report ? (
            <>
              <div className="card p-3" data-testid="runtime-summary">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Chip
                    id="all-sev"
                    label="All findings"
                    n={report.findings.length}
                    active={severityFilter === 'all'}
                    onClick={() => setSeverityFilter('all')}
                  />
                  {RUNTIME_SEVERITIES.map((s) => (
                    <Chip
                      key={s}
                      id={s}
                      label={s}
                      tone={SEVERITY_TONE[s]}
                      n={report.countsBySeverity[s]}
                      active={severityFilter === s}
                      onClick={() => setSeverityFilter(s)}
                    />
                  ))}
                  <span className="mx-1 h-5 w-px bg-slate-200" aria-hidden />
                  <Chip
                    id="all-cat"
                    label="All cats"
                    n={report.findings.length}
                    active={categoryFilter === 'all'}
                    onClick={() => setCategoryFilter('all')}
                  />
                  {RUNTIME_CATEGORIES.map((c) => (
                    <Chip
                      key={c}
                      id={c}
                      label={`${CATEGORY_ICON[c]} ${c}`}
                      n={report.countsByCategory[c]}
                      active={categoryFilter === c}
                      onClick={() => setCategoryFilter(c)}
                    />
                  ))}
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Live audit walks <code>document.querySelectorAll(&quot;*&quot;)</code>{' '}
                  in the rendered iframe and reads{' '}
                  <code>getComputedStyle</code>, <code>getBoundingClientRect</code>,
                  and ARIA attributes — bypassing the static pipeline&apos;s CSS-resolution gaps.
                </p>
              </div>

              {visible.length === 0 ? (
                <div className="card p-6 text-sm text-emerald-700" data-testid="runtime-empty">
                  ✓ Nothing flagged under the active filter.
                </div>
              ) : (
                <ul
                  className="space-y-2"
                  data-testid="runtime-findings"
                >
                  {visible.map((f) => (
                    <FindingCard
                      key={f.id}
                      f={f}
                      onJump={() =>
                        // Source location is not in scope for runtime findings,
                        // but the user can still navigate to the Analyzer to
                        // search by selector.
                        navigate('/analyzer')
                      }
                    />
                  ))}
                </ul>
              )}
            </>
          ) : (
            <div className="card p-6 text-sm text-slate-500">
              Waiting for the iframe to load… If nothing appears, click{' '}
              <span className="font-semibold">Re-run scan</span>.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FindingCard({ f, onJump: _onJump }: { f: RuntimeFinding; onJump: () => void }) {
  return (
    <li
      className="card overflow-hidden"
      data-rule={f.ruleId}
      data-severity={f.severity}
      data-category={f.category}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase ${SEVERITY_TONE[f.severity]}`}
          >
            {f.severity}
          </span>
          <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium uppercase text-slate-700">
            {CATEGORY_ICON[f.category]} {f.category}
          </span>
          <span className="font-mono text-[11px] text-slate-500">{f.ruleId}</span>
        </div>
        <span className="font-mono text-[11px] text-slate-500">
          {f.snapshot.boundingRect.width}×{f.snapshot.boundingRect.height} @ (
          {f.snapshot.boundingRect.x},{f.snapshot.boundingRect.y})
        </span>
      </header>
      <div className="p-3">
        <p className="text-sm text-slate-900">{f.message}</p>
        <div className="mt-1 flex flex-wrap items-baseline gap-2 text-xs">
          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
            &lt;{f.tagName}&gt;
          </span>
          <code className="truncate text-[11px] text-slate-500">
            {f.selector}
          </code>
        </div>
        {f.text && (
          <p className="mt-1 truncate text-xs italic text-slate-600">
            "{f.text}"
          </p>
        )}
        <details className="mt-2">
          <summary className="cursor-pointer text-[11px] font-medium text-slate-600 hover:text-slate-900">
            Captured snapshot
          </summary>
          <div className="mt-1 grid grid-cols-1 gap-2 md:grid-cols-2">
            <SnapshotBlock title="Computed styles" entries={f.snapshot.computed} />
            <SnapshotBlock title="ARIA / role" entries={f.snapshot.aria} />
          </div>
        </details>
      </div>
    </li>
  );
}

function SnapshotBlock({
  title,
  entries,
}: {
  title: string;
  entries: Record<string, string>;
}) {
  const rows = Object.entries(entries).filter(([, v]) => v && v !== 'normal');
  if (rows.length === 0) {
    return (
      <div className="rounded border border-slate-100 bg-slate-50 px-2 py-1.5 text-[11px] text-slate-500">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </div>
        <div>—</div>
      </div>
    );
  }
  return (
    <div className="rounded border border-slate-100 bg-slate-50 px-2 py-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </div>
      <dl className="mt-1 grid grid-cols-1 gap-x-2 gap-y-0.5 font-mono text-[11px]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-1">
            <dt className="text-slate-500">{k}:</dt>
            <dd className="truncate text-slate-800" title={v}>
              {v}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Chip({
  id,
  label,
  n,
  tone,
  active,
  onClick,
}: {
  id: string;
  label: string;
  n: number;
  tone?: string;
  active: boolean;
  onClick: () => void;
}) {
  const base = tone ?? 'bg-slate-100 text-slate-700';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-chip={id}
      className={[
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition',
        active
          ? 'border-brand-500 ring-2 ring-brand-500 ring-offset-1'
          : 'border-slate-200 hover:border-slate-300',
        base,
      ].join(' ')}
    >
      {label}
      <span className="rounded-full bg-white/70 px-1.5 text-[10px] font-semibold tabular-nums">
        {n}
      </span>
    </button>
  );
}
