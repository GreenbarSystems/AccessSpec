import type { ReactNode } from 'react';
import type { Device } from '../../services/DevicePreview';

type Props = {
  device: Device;
  /** Visual scale of the entire chassis (1 = pixel-accurate). */
  scale?: number;
  children: ReactNode;
};

/**
 * Phone / tablet chassis around a screen slot. The slot is sized to the
 * device's logical viewport so an iframe inside renders at the correct
 * dimensions. The bezel and top mark (notch / island / hole / home button)
 * are pure CSS — no images, so the frames scale cleanly.
 */
export function DeviceFrame({ device, scale = 1, children }: Props) {
  const bezel = device.category === 'tablet' ? 22 : 14;
  const topBar = device.topMark === 'home' ? 36 : 28;
  const bottomBar = device.hasHomeButton ? 60 : device.category === 'tablet' ? 22 : 22;

  // Total chassis dimensions = viewport + bezels + bars.
  const chassisWidth = device.width + bezel * 2;
  const chassisHeight = device.height + topBar + bottomBar;

  return (
    <div
      data-testid={`device-frame-${device.id}`}
      style={{
        width: chassisWidth * scale,
        height: chassisHeight * scale,
      }}
      className="relative"
      aria-label={`${device.name} frame, ${device.width} by ${device.height} CSS pixels`}
    >
      <div
        style={{
          width: chassisWidth,
          height: chassisHeight,
          borderRadius: device.radius + bezel,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
        className="absolute left-0 top-0 bg-slate-900 shadow-2xl ring-1 ring-slate-700"
      >
        {/* Side buttons (visual flourish, phones only) */}
        {device.category === 'phone' && (
          <>
            <span className="absolute -left-[3px] top-20 h-12 w-[3px] rounded-l bg-slate-700" />
            <span className="absolute -left-[3px] top-36 h-8 w-[3px] rounded-l bg-slate-700" />
            <span className="absolute -left-[3px] top-48 h-8 w-[3px] rounded-l bg-slate-700" />
            <span className="absolute -right-[3px] top-32 h-16 w-[3px] rounded-r bg-slate-700" />
          </>
        )}

        {/* Top mark */}
        <TopMark device={device} topBarHeight={topBar} />

        {/* Screen slot — same coords as the iframe inside */}
        <div
          style={{
            top: topBar,
            left: bezel,
            width: device.width,
            height: device.height,
            borderRadius: device.radius,
          }}
          className="absolute overflow-hidden bg-white shadow-inner"
        >
          {children}
        </div>

        {/* Bottom: home button (SE) or pill */}
        {device.hasHomeButton ? (
          <span
            aria-hidden
            style={{ width: 44, height: 44, bottom: 8 }}
            className="absolute left-1/2 -translate-x-1/2 rounded-full border border-slate-700 bg-slate-800"
          />
        ) : device.category === 'phone' ? (
          <span
            aria-hidden
            style={{ width: 120, height: 4, bottom: 8 }}
            className="absolute left-1/2 -translate-x-1/2 rounded-full bg-slate-500/80"
          />
        ) : null}
      </div>
    </div>
  );
}

function TopMark({
  device,
  topBarHeight,
}: {
  device: Device;
  topBarHeight: number;
}) {
  if (device.topMark === 'none') return null;
  if (device.topMark === 'island') {
    return (
      <span
        aria-hidden
        style={{ top: 8, width: 110, height: 30 }}
        className="absolute left-1/2 -translate-x-1/2 rounded-full bg-black"
      />
    );
  }
  if (device.topMark === 'notch') {
    return (
      <span
        aria-hidden
        style={{ top: 0, width: 150, height: 24 }}
        className="absolute left-1/2 -translate-x-1/2 rounded-b-2xl bg-black"
      />
    );
  }
  if (device.topMark === 'hole') {
    return (
      <span
        aria-hidden
        style={{ top: 8, width: 12, height: 12 }}
        className="absolute left-1/2 -translate-x-1/2 rounded-full bg-slate-950 ring-1 ring-slate-700"
      />
    );
  }
  if (device.topMark === 'home') {
    // No top mark — but we use the top bar to vertically position the screen.
    void topBarHeight;
    return null;
  }
  return null;
}
