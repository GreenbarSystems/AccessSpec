import { useEffect, useMemo, useRef, useState } from 'react';
import { useSourceRepository } from '../../services/useSourceRepository';
import {
  DEVICES,
  DEFAULT_DEVICE_ID,
  buildPreviewDocument,
  type Device,
} from '../../services/DevicePreview';
import { DeviceFrame } from './DeviceFrame';
import { HeatmapOverlay, type HeatmapCounts } from './HeatmapOverlay';

export function DeviceSimulator() {
  const { project } = useSourceRepository();
  const files = useMemo(() => {
    if (!project) return [];
    return [...project.filesByPath.values()];
  }, [project]);

  const preview = useMemo(() => buildPreviewDocument(files), [files]);

  const [deviceId, setDeviceId] = useState<string>(DEFAULT_DEVICE_ID);
  const device = DEVICES.find((d) => d.id === deviceId) ?? DEVICES[0];

  // Fit-to-screen scaling: shrink the chassis if the available stage is
  // narrower / shorter than the device. We measure the stage and recompute on
  // resize so picking the iPad never overflows on small screens.
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!stageRef.current) return;
    const obs = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setStageSize({ width, height });
    });
    obs.observe(stageRef.current);
    return () => obs.disconnect();
  }, []);

  const chassisWidth = device.width + 28; // matches bezel logic in DeviceFrame
  const chassisHeight = device.height + (device.hasHomeButton ? 96 : 50);
  const fitScale =
    stageSize.width === 0
      ? 1
      : Math.min(
          1,
          (stageSize.width - 16) / chassisWidth,
          stageSize.height === 0 ? 1 : (stageSize.height - 16) / chassisHeight,
        );

  // Heatmap state: enables an overlay that walks the iframe DOM and colors
  // each interactive control by pass / warn / fail. The iframe sandbox is
  // widened when enabled so we can read its DOM (the iframe runs the user's
  // own uploaded code, so the same-origin combo is acceptable here).
  const [heatmapOn, setHeatmapOn] = useState(false);
  const [heatmapCounts, setHeatmapCounts] = useState<HeatmapCounts>({
    pass: 0,
    warn: 0,
    fail: 0,
  });
  const iframeRef = useRef<HTMLIFrameElement>(null);

  return (
    <div className="space-y-4" data-testid="device-simulator">
      <DevicePicker active={device} onPick={setDeviceId} />
      <HeatmapBar
        on={heatmapOn}
        onToggle={() => setHeatmapOn((v) => !v)}
        counts={heatmapCounts}
        available={!!preview.html}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_18rem]">
        <div
          ref={stageRef}
          className="flex min-h-[640px] items-start justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 p-6"
          data-testid="device-stage"
        >
          {preview.html ? (
            <DeviceFrame device={device} scale={fitScale}>
              <iframe
                key={`${device.id}:${preview.entryPath}:${heatmapOn ? 'h' : 'n'}`}
                ref={iframeRef}
                title={`${device.name} preview`}
                srcDoc={preview.html}
                sandbox={
                  heatmapOn ? 'allow-scripts allow-same-origin' : 'allow-scripts'
                }
                style={{
                  width: device.width,
                  height: device.height,
                  border: 'none',
                  display: 'block',
                  background: 'white',
                }}
                data-testid="preview-iframe"
              />
              {heatmapOn && (
                <HeatmapOverlay
                  iframeRef={iframeRef}
                  width={device.width}
                  height={device.height}
                  refreshTick={device.width + device.height}
                  onCounts={setHeatmapCounts}
                />
              )}
            </DeviceFrame>
          ) : (
            <EmptyStage device={device} reason={preview.reason} />
          )}
        </div>
        <DeviceInfo device={device} preview={preview} scale={fitScale} />
      </div>
    </div>
  );
}

function HeatmapBar({
  on,
  onToggle,
  counts,
  available,
}: {
  on: boolean;
  onToggle: () => void;
  counts: HeatmapCounts;
  available: boolean;
}) {
  return (
    <div className="card flex flex-wrap items-center justify-between gap-3 p-3" data-testid="heatmap-bar">
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Toggle accessibility heatmap"
          onClick={onToggle}
          disabled={!available}
          data-testid="heatmap-toggle"
          className={[
            'inline-flex h-6 w-11 items-center rounded-full transition disabled:opacity-50',
            on ? 'bg-brand-600' : 'bg-slate-300',
          ].join(' ')}
        >
          <span
            className={[
              'inline-block h-5 w-5 transform rounded-full bg-white shadow transition',
              on ? 'translate-x-5' : 'translate-x-1',
            ].join(' ')}
          />
        </button>
        <div>
          <div className="text-sm font-semibold text-slate-900">
            Accessibility heatmap
          </div>
          <p className="text-xs text-slate-500">
            Highlights buttons, links, inputs, and controls inside the live
            preview.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <LegendChip
          label="Pass"
          tone="bg-emerald-50 text-emerald-700 ring-emerald-200"
          dot="bg-emerald-500"
          n={on ? counts.pass : null}
          dataKey="pass"
        />
        <LegendChip
          label="Warning"
          tone="bg-amber-50 text-amber-800 ring-amber-200"
          dot="bg-amber-500"
          n={on ? counts.warn : null}
          dataKey="warn"
        />
        <LegendChip
          label="Failure"
          tone="bg-rose-50 text-rose-700 ring-rose-200"
          dot="bg-rose-500"
          n={on ? counts.fail : null}
          dataKey="fail"
        />
      </div>
    </div>
  );
}

function LegendChip({
  label,
  tone,
  dot,
  n,
  dataKey,
}: {
  label: string;
  tone: string;
  dot: string;
  n: number | null;
  dataKey: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${tone}`}
      data-legend={dataKey}
    >
      <span aria-hidden className={`inline-block h-2 w-2 rounded-full ${dot}`} />
      {label}
      <span className="ml-1 font-mono font-semibold tabular-nums">
        {n === null ? '—' : n}
      </span>
    </span>
  );
}

function DevicePicker({
  active,
  onPick,
}: {
  active: Device;
  onPick: (id: string) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Device"
      className="flex flex-wrap gap-2"
      data-testid="device-picker"
    >
      {DEVICES.map((d) => {
        const isActive = d.id === active.id;
        return (
          <button
            key={d.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onPick(d.id)}
            data-device={d.id}
            className={[
              'flex flex-col items-start rounded-lg border px-3 py-2 text-left transition',
              isActive
                ? 'border-brand-500 bg-brand-50 text-brand-800 ring-2 ring-brand-500 ring-offset-1'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
            ].join(' ')}
          >
            <span className="flex items-center gap-1.5 text-xs font-semibold">
              <span aria-hidden>
                {d.category === 'tablet' ? '🟦' : d.id.includes('iphone') ? '🍎' : '🤖'}
              </span>
              {d.name}
            </span>
            <span className="font-mono text-[10px] text-slate-500">
              {d.width} × {d.height} · {d.dpr}×
            </span>
          </button>
        );
      })}
    </div>
  );
}

function DeviceInfo({
  device,
  preview,
  scale,
}: {
  device: Device;
  preview: ReturnType<typeof buildPreviewDocument>;
  scale: number;
}) {
  return (
    <aside className="card flex h-fit flex-col gap-3 p-4 text-sm">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Device
        </div>
        <div className="mt-0.5 font-semibold text-slate-900">{device.name}</div>
        <p className="text-xs text-slate-500">{device.blurb}</p>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <dt className="text-slate-500">Viewport</dt>
        <dd className="font-mono text-slate-800">
          {device.width} × {device.height}
        </dd>
        <dt className="text-slate-500">Pixel ratio</dt>
        <dd className="font-mono text-slate-800">{device.dpr}×</dd>
        <dt className="text-slate-500">Category</dt>
        <dd className="text-slate-800">{device.category}</dd>
        <dt className="text-slate-500">Frame scale</dt>
        <dd className="font-mono text-slate-800">{Math.round(scale * 100)}%</dd>
      </dl>
      <div className="border-t border-slate-100 pt-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Preview
        </div>
        {preview.html ? (
          <>
            <div className="mt-1 truncate font-mono text-xs text-slate-700">
              {preview.entryPath}
            </div>
            {preview.inlinedCss.length > 0 && (
              <div className="mt-1 text-xs text-slate-500">
                Inlined {preview.inlinedCss.length} stylesheet
                {preview.inlinedCss.length === 1 ? '' : 's'}:
                <ul className="mt-0.5 list-inside list-disc font-mono text-[11px] text-slate-600">
                  {preview.inlinedCss.slice(0, 4).map((p) => (
                    <li key={p} className="truncate">
                      {p}
                    </li>
                  ))}
                  {preview.inlinedCss.length > 4 && (
                    <li>+ {preview.inlinedCss.length - 4} more</li>
                  )}
                </ul>
              </div>
            )}
          </>
        ) : (
          <p className="mt-1 text-xs text-rose-700">{preview.reason}</p>
        )}
      </div>
    </aside>
  );
}

function EmptyStage({ device, reason }: { device: Device; reason?: string }) {
  return (
    <DeviceFrame device={device}>
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-white p-6 text-center text-sm text-slate-500">
        <span aria-hidden className="text-4xl">
          📱
        </span>
        <p>{reason ?? 'No preview available for this project.'}</p>
        <p className="text-xs text-slate-400">
          Upload an HTML file (with optional CSS) on the Dashboard to see it
          render here at {device.width} × {device.height}.
        </p>
      </div>
    </DeviceFrame>
  );
}
