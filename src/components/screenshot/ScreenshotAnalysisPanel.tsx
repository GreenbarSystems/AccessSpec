import { useCallback, useEffect, useRef, useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import {
  analyzeFile,
  type ColorBlindnessMode,
  type ScreenshotAnalysis,
  type ScreenshotFinding,
} from '../../services/ScreenshotAnalyzer';
import {
  measureWordContrast,
  recognizeImage,
  subscribeProgress,
  terminateOcr,
  type OcrProgress,
  type OcrResult,
  type TextContrastCheck,
} from '../../services/ScreenshotOcr';

const SEVERITY_TONE: Record<ScreenshotFinding['severity'], string> = {
  critical: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  warning: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
  info: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
};

const CVD_LABEL: Record<ColorBlindnessMode, string> = {
  protanopia: 'Protanopia · red-blind',
  deuteranopia: 'Deuteranopia · green-blind',
  tritanopia: 'Tritanopia · blue-blind',
};

type AnalysisEntry = {
  file: File;
  name: string;
  report: ScreenshotAnalysis;
};

export function ScreenshotAnalysisPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [analyses, setAnalyses] = useState<AnalysisEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overlayOn, setOverlayOn] = useState(true);

  // Free the Tesseract worker when the panel unmounts (~30 MB of RAM back).
  useEffect(() => () => void terminateOcr(), []);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    const results: AnalysisEntry[] = [];
    for (const file of Array.from(files)) {
      try {
        const report = await analyzeFile(file);
        results.push({ file, name: file.name, report });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to analyze image');
      }
    }
    setAnalyses(results);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  return (
    <div className="space-y-4" data-testid="screenshot-analysis-panel">
      <div className="card p-4" data-testid="screenshot-dropzone">
        <label
          htmlFor="screenshot-input"
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center hover:border-brand-400 hover:bg-brand-50/40 dark:bg-slate-900 dark:border-slate-700"
        >
          <ImageIcon aria-hidden className="h-9 w-9 text-slate-400 dark:text-slate-500" />
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Upload one or more screenshots
          </span>
          <span className="text-xs text-slate-500">
            PNG or JPEG · we&apos;ll measure contrast, palette, and simulate
            color-blindness — no images leave your browser
          </span>
          <input
            id="screenshot-input"
            ref={inputRef}
            type="file"
            multiple
            accept="image/png, image/jpeg"
            disabled={busy}
            onChange={(e) => handleFiles(e.target.files)}
            data-testid="screenshot-input"
            className="sr-only"
          />
        </label>
        {busy && (
          <p className="mt-3 text-sm text-slate-500" data-testid="screenshot-busy">
            Analyzing…
          </p>
        )}
        {error && (
          <p
            className="mt-3 text-sm text-rose-700"
            role="alert"
            data-testid="screenshot-error"
          >
            {error}
          </p>
        )}
        {analyses.length > 0 && (
          <div className="mt-3 flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={overlayOn}
                onChange={(e) => setOverlayOn(e.target.checked)}
                data-testid="overlay-toggle"
                className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-700"
              />
              Show contrast heatmap overlay
            </label>
          </div>
        )}
      </div>

      {analyses.map((entry) => (
        <ScreenshotCard
          key={entry.name}
          entry={entry}
          overlayOn={overlayOn}
        />
      ))}
    </div>
  );
}

type OcrState =
  | { phase: 'idle' }
  | { phase: 'running'; progress: OcrProgress | null }
  | { phase: 'done'; result: OcrResult; contrast: TextContrastCheck[] }
  | { phase: 'error'; message: string };

function ScreenshotCard({
  entry,
  overlayOn,
}: {
  entry: AnalysisEntry;
  overlayOn: boolean;
}) {
  const { file, name, report } = entry;
  const [ocr, setOcr] = useState<OcrState>({ phase: 'idle' });

  const runOcr = useCallback(async () => {
    setOcr({ phase: 'running', progress: null });
    const unsub = subscribeProgress((p) =>
      setOcr((cur) => (cur.phase === 'running' ? { ...cur, progress: p } : cur)),
    );
    try {
      const result = await recognizeImage(file);
      // Build a source-resolution canvas for accurate per-word color sampling.
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
      bitmap.close?.();
      const contrast = measureWordContrast(canvas, result.words);
      setOcr({ phase: 'done', result, contrast });
    } catch (e) {
      setOcr({
        phase: 'error',
        message: e instanceof Error ? e.message : 'OCR failed',
      });
    } finally {
      unsub();
    }
  }, [file]);

  return (
    <article
      className="card overflow-hidden"
      data-testid="screenshot-card"
      data-file={name}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2 dark:bg-slate-900 dark:border-slate-800">
        <div className="font-mono text-xs text-slate-700 dark:text-slate-300">{name}</div>
        <div className="text-[11px] text-slate-500">
          {report.width} × {report.height} ·{' '}
          <span className="font-mono">{report.aspectRatio.toFixed(2)}</span> ·{' '}
          {report.inferredOrientation}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[18rem_1fr]">
        <div>
          <ContrastPreview
            report={report}
            overlayOn={overlayOn}
            ocrChecks={ocr.phase === 'done' ? ocr.contrast : null}
            sourceWidth={report.width}
            sourceHeight={report.height}
          />
          <CvdRow report={report} />
        </div>
        <div className="space-y-3">
          <MetricsBlock report={report} />
          <PaletteBlock report={report} />
          <OcrBlock ocr={ocr} onRun={runOcr} />
          <FindingsBlock report={report} />
        </div>
      </div>
    </article>
  );
}

function ContrastPreview({
  report,
  overlayOn,
  ocrChecks,
  sourceWidth,
  sourceHeight,
}: {
  report: ScreenshotAnalysis;
  overlayOn: boolean;
  ocrChecks: TextContrastCheck[] | null;
  sourceWidth: number;
  sourceHeight: number;
}) {
  const { analyzedSize, contrastBlocks } = report;
  return (
    <div
      className="relative overflow-hidden rounded border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800"
      style={{ aspectRatio: `${analyzedSize.width} / ${analyzedSize.height}` }}
      data-testid="contrast-preview"
    >
      <img
        src={report.previewUrl}
        alt={`Screenshot preview, ${report.width} by ${report.height} pixels`}
        className="block h-full w-full object-contain"
      />
      {overlayOn && (
        <svg
          aria-hidden
          viewBox={`0 0 ${analyzedSize.width} ${analyzedSize.height}`}
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
          data-testid="contrast-overlay"
        >
          {contrastBlocks
            .filter((b) => b.band !== 'high')
            .map((b, i) => (
              <rect
                key={i}
                x={b.x}
                y={b.y}
                width={b.width}
                height={b.height}
                fill={
                  b.band === 'low'
                    ? 'rgba(244, 63, 94, 0.18)'
                    : 'rgba(245, 158, 11, 0.22)'
                }
                stroke={
                  b.band === 'low'
                    ? 'rgba(244, 63, 94, 0.4)'
                    : 'rgba(245, 158, 11, 0.5)'
                }
                strokeWidth={1}
                data-band={b.band}
                data-contrast={b.contrast}
              />
            ))}
        </svg>
      )}
      {ocrChecks && (
        <svg
          aria-hidden
          // OCR coords are in source pixels — map to analysis viewBox so the
          // boxes ride with the preview image at every responsive size.
          viewBox={`0 0 ${sourceWidth} ${sourceHeight}`}
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
          data-testid="ocr-overlay"
        >
          {ocrChecks.map((c, i) => {
            const { x0, y0, x1, y1 } = c.word.bbox;
            const tone =
              c.verdict === 'pass'
                ? { fill: 'rgba(16,185,129,0.10)', stroke: 'rgba(16,185,129,0.7)' }
                : c.verdict === 'aaa-only'
                  ? { fill: 'rgba(245,158,11,0.15)', stroke: 'rgba(245,158,11,0.85)' }
                  : { fill: 'rgba(244,63,94,0.18)', stroke: 'rgba(244,63,94,0.9)' };
            return (
              <rect
                key={i}
                x={x0}
                y={y0}
                width={Math.max(1, x1 - x0)}
                height={Math.max(1, y1 - y0)}
                fill={tone.fill}
                stroke={tone.stroke}
                strokeWidth={2}
                data-ocr-verdict={c.verdict}
                data-word={c.word.text}
              >
                <title>
                  {`"${c.word.text}" · ${c.ratio}:1 · ${c.verdict}`}
                </title>
              </rect>
            );
          })}
        </svg>
      )}
    </div>
  );
}

function MetricsBlock({ report }: { report: ScreenshotAnalysis }) {
  const lowBlocks = report.contrastBlocks.filter((b) => b.band === 'low').length;
  const midBlocks = report.contrastBlocks.filter((b) => b.band === 'medium').length;
  return (
    <section className="rounded border border-slate-200 bg-slate-50 px-3 py-2 dark:bg-slate-900 dark:border-slate-800">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        Metrics
      </div>
      <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-xs sm:grid-cols-4">
        <Metric label="Width" value={`${report.width}px`} />
        <Metric label="Height" value={`${report.height}px`} />
        <Metric label="Aspect" value={report.aspectRatio.toFixed(2)} />
        <Metric label="Orientation" value={report.inferredOrientation} />
        <Metric
          label="Avg luminance"
          value={report.averageLuminance.toFixed(2)}
        />
        <Metric
          label="Blocks"
          value={String(report.contrastBlocks.length)}
        />
        <Metric label="Low ratio" value={String(lowBlocks)} tone="text-rose-700" />
        <Metric label="Med ratio" value={String(midBlocks)} tone="text-amber-700" />
      </dl>
    </section>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd
        className={`font-mono text-sm font-semibold ${tone ?? 'text-slate-800 dark:text-slate-200'}`}
      >
        {value}
      </dd>
    </div>
  );
}

function PaletteBlock({ report }: { report: ScreenshotAnalysis }) {
  const total = report.dominantColors.reduce((s, c) => s + c.population, 0) || 1;
  return (
    <section className="rounded border border-slate-200 bg-white px-3 py-2 dark:bg-slate-900 dark:border-slate-800">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        Dominant palette
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5" data-testid="palette">
        {report.dominantColors.map((c) => {
          const share = ((c.population / total) * 100).toFixed(0);
          return (
            <div
              key={c.hex}
              className="flex items-center gap-1 rounded border border-slate-200 bg-slate-50 pr-2 text-[11px] dark:bg-slate-900 dark:border-slate-800"
              data-swatch={c.hex}
              title={`${c.hex} · ${share}% of pixels`}
            >
              <span
                aria-hidden
                className="inline-block h-5 w-5 rounded-l"
                style={{ backgroundColor: c.hex }}
              />
              <span className="font-mono text-slate-700 dark:text-slate-300">{c.hex}</span>
              <span className="text-slate-500">{share}%</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FindingsBlock({ report }: { report: ScreenshotAnalysis }) {
  if (report.findings.length === 0) return null;
  return (
    <section
      className="rounded border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800"
      data-testid="screenshot-findings"
    >
      <div className="border-b border-slate-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800">
        Visual findings ({report.findings.length})
      </div>
      <ul className="divide-y divide-slate-100">
        {report.findings.map((f) => (
          <li
            key={f.id}
            className="flex items-start gap-2 px-3 py-2 text-xs"
            data-finding={f.id}
            data-severity={f.severity}
          >
            <span
              className={`mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${SEVERITY_TONE[f.severity]}`}
            >
              {f.severity}
            </span>
            <span className="flex-1 text-slate-800 dark:text-slate-200">{f.message}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function OcrBlock({ ocr, onRun }: { ocr: OcrState; onRun: () => void }) {
  if (ocr.phase === 'idle') {
    return (
      <section
        className="rounded border border-slate-200 bg-white p-3 dark:bg-slate-900 dark:border-slate-800"
        data-testid="ocr-block"
        data-ocr-phase="idle"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Text detection
            </div>
            <p className="mt-0.5 text-xs text-slate-700 dark:text-slate-300">
              Run Tesseract.js to find real words on the screenshot and check
              their actual rendered contrast (≈3 MB downloaded once, cached
              after).
            </p>
          </div>
          <button
            type="button"
            onClick={onRun}
            data-testid="run-ocr"
            className="btn-primary whitespace-nowrap text-xs"
          >
            Run OCR
          </button>
        </div>
      </section>
    );
  }

  if (ocr.phase === 'running') {
    const pct = Math.round((ocr.progress?.progress ?? 0) * 100);
    return (
      <section
        className="rounded border border-slate-200 bg-white p-3 dark:bg-slate-900 dark:border-slate-800"
        data-testid="ocr-block"
        data-ocr-phase="running"
      >
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Running OCR
        </div>
        <p className="mt-0.5 text-xs text-slate-700 dark:text-slate-300">
          {ocr.progress?.status ?? 'starting…'} · {pct}%
        </p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded bg-slate-200 dark:bg-slate-800">
          <div
            className="h-full bg-brand-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </section>
    );
  }

  if (ocr.phase === 'error') {
    return (
      <section
        className="rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
        role="alert"
        data-testid="ocr-block"
        data-ocr-phase="error"
      >
        OCR failed: {ocr.message}
      </section>
    );
  }

  // Done.
  const { result, contrast } = ocr;
  const total = contrast.length;
  const failing = contrast.filter((c) => c.verdict === 'aa-fail').length;
  const aaaOnly = contrast.filter((c) => c.verdict === 'aaa-only').length;
  const passing = contrast.filter((c) => c.verdict === 'pass').length;
  // Sort worst-first for the top-issues list.
  const worst = [...contrast]
    .sort((a, b) => a.ratio - b.ratio)
    .slice(0, 8);
  return (
    <section
      className="rounded border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800"
      data-testid="ocr-block"
      data-ocr-phase="done"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 px-3 py-2 dark:border-slate-800">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Text detection · {result.words.length} words ({result.durationMs}ms)
          </div>
          <div className="mt-0.5 flex flex-wrap gap-1.5 text-[11px]">
            <CountChip tone="rose" label="AA fail" n={failing} />
            <CountChip tone="amber" label="AAA only" n={aaaOnly} />
            <CountChip tone="emerald" label="AAA pass" n={passing} />
            <span className="text-slate-400 dark:text-slate-500">of {total} measurable</span>
          </div>
        </div>
      </div>
      {worst.length === 0 ? (
        <p className="px-3 py-2 text-xs text-slate-500">
          No measurable text regions to score.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 text-xs" data-testid="ocr-verdicts">
          {worst.map((c, i) => (
            <li
              key={i}
              className="flex items-center gap-2 px-3 py-1.5"
              data-verdict={c.verdict}
            >
              <span
                className="inline-block h-4 w-4 shrink-0 rounded border border-slate-200 dark:border-slate-800"
                style={{ backgroundColor: `rgb(${c.fg.r},${c.fg.g},${c.fg.b})` }}
                aria-hidden
              />
              <span
                className="inline-block h-4 w-4 shrink-0 rounded border border-slate-200 dark:border-slate-800"
                style={{ backgroundColor: `rgb(${c.bg.r},${c.bg.g},${c.bg.b})` }}
                aria-hidden
              />
              <span
                className="flex-1 truncate font-mono text-slate-800 dark:text-slate-200"
                title={c.word.text}
              >
                {c.word.text}
              </span>
              <span
                className={[
                  'shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold',
                  c.verdict === 'aa-fail'
                    ? 'bg-rose-100 text-rose-700'
                    : c.verdict === 'aaa-only'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-700',
                ].join(' ')}
              >
                {c.ratio}:1
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CountChip({
  tone,
  label,
  n,
}: {
  tone: 'rose' | 'amber' | 'emerald';
  label: string;
  n: number;
}) {
  const cls =
    tone === 'rose'
      ? 'bg-rose-100 text-rose-700'
      : tone === 'amber'
        ? 'bg-amber-100 text-amber-800'
        : 'bg-emerald-100 text-emerald-700';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-medium ${cls}`}>
      {label}
      <span className="font-mono font-semibold tabular-nums">{n}</span>
    </span>
  );
}

function CvdRow({ report }: { report: ScreenshotAnalysis }) {
  const modes: ColorBlindnessMode[] = ['protanopia', 'deuteranopia', 'tritanopia'];
  return (
    <div className="mt-3" data-testid="cvd-row">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        Color-blindness simulations
      </div>
      <div className="mt-1 grid grid-cols-3 gap-1.5">
        {modes.map((m) => (
          <figure
            key={m}
            className="overflow-hidden rounded border border-slate-200 dark:border-slate-800"
            data-cvd={m}
          >
            <img
              src={report.colorBlindness[m]}
              alt={CVD_LABEL[m]}
              className="block h-auto w-full"
            />
            <figcaption className="bg-slate-50 px-1 py-0.5 text-[10px] text-slate-600 dark:text-slate-400 dark:bg-slate-900">
              {CVD_LABEL[m]}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
