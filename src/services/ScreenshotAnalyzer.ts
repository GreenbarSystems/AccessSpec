/**
 * ScreenshotAnalyzer
 *
 * Pixel-level analysis of an uploaded PNG / JPEG screenshot. Pure browser
 * code — no ML, no OCR — but the canvas-based heuristics surface a useful
 * set of accessibility signals:
 *
 *   - dimensions + inferred orientation
 *   - dominant color palette (histogram quantization, ~6 colors)
 *   - average screen luminance
 *   - sliding-window contrast scan that flags blocks where every pixel sits
 *     within a tight luminance band (likely-unreadable text)
 *   - color-blindness simulations (protanopia, deuteranopia, tritanopia)
 *     rendered as data URLs for side-by-side preview
 *
 * What we *don't* claim: this isn't OCR or CV. We can't say "this is a
 * button". What we *can* say: "this 32×32 block has only 1.2:1 luminance
 * variance — text in there is hard to read". The UI explains the limits.
 */

export type Rgb = { r: number; g: number; b: number };

export type DominantColor = {
  hex: string;
  rgb: Rgb;
  /** Pixel population in this bucket. */
  population: number;
};

export type ContrastBlock = {
  x: number;
  y: number;
  width: number;
  height: number;
  /** WCAG contrast ratio between brightest and darkest pixel in the block. */
  contrast: number;
  band: 'low' | 'medium' | 'high';
};

export type ColorBlindnessMode = 'protanopia' | 'deuteranopia' | 'tritanopia';

export type ScreenshotFinding = {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
};

export type ScreenshotAnalysis = {
  width: number;
  height: number;
  aspectRatio: number;
  inferredOrientation:
    | 'portrait-mobile'
    | 'landscape-mobile'
    | 'portrait-tablet'
    | 'landscape-tablet'
    | 'desktop'
    | 'square'
    | 'other';
  averageLuminance: number;
  dominantColors: DominantColor[];
  contrastBlocks: ContrastBlock[];
  /** Data URL for the original (downsampled) preview. */
  previewUrl: string;
  /** Data URLs for the three CVD simulations, keyed by mode. */
  colorBlindness: Record<ColorBlindnessMode, string>;
  findings: ScreenshotFinding[];
  /** Block size used for the contrast scan. */
  blockSize: number;
  /** Maximum dimension after the analyzer downsampled the image. */
  analyzedSize: { width: number; height: number };
};

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const MAX_DIM = 480; // Cap the analysis canvas so a 4K screenshot stays snappy.
const BLOCK_SIZE = 32;
// 3 bits per RGB triple → 512 quantization buckets (see computeDominantColors)
const PALETTE_RESULTS = 6;
const PIXEL_STRIDE = 4; // sample every 4th pixel for the palette pass

// Brettel/Vienot/Mollon approximation matrices applied directly to sRGB.
// Good enough for a side-by-side a11y preview — not for color science.
const CVD_MATRICES: Record<ColorBlindnessMode, number[][]> = {
  protanopia: [
    [0.567, 0.433, 0],
    [0.558, 0.442, 0],
    [0, 0.242, 0.758],
  ],
  deuteranopia: [
    [0.625, 0.375, 0],
    [0.7, 0.3, 0],
    [0, 0.3, 0.7],
  ],
  tritanopia: [
    [0.95, 0.05, 0],
    [0, 0.433, 0.567],
    [0, 0.475, 0.525],
  ],
};

/* ------------------------------------------------------------------ */
/* Color helpers                                                       */
/* ------------------------------------------------------------------ */

function linearize(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

function contrastRatio(maxL: number, minL: number): number {
  return (maxL + 0.05) / (minL + 0.05);
}

function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => n.toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

/* ------------------------------------------------------------------ */
/* Drawing helpers                                                     */
/* ------------------------------------------------------------------ */

function downscaledCanvas(
  source: HTMLImageElement | ImageBitmap | HTMLCanvasElement,
  maxDim = MAX_DIM,
): { canvas: HTMLCanvasElement; scale: number } {
  const sw = 'naturalWidth' in source ? source.naturalWidth : source.width;
  const sh = 'naturalHeight' in source ? source.naturalHeight : source.height;
  const scale = Math.min(1, maxDim / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(source, 0, 0, w, h);
  return { canvas, scale };
}

/* ------------------------------------------------------------------ */
/* Analysis passes                                                     */
/* ------------------------------------------------------------------ */

function computeDominantColors(data: ImageData, k = PALETTE_RESULTS): DominantColor[] {
  const buckets = new Map<number, { r: number; g: number; b: number; n: number }>();
  const px = data.data;
  for (let i = 0; i < px.length; i += 4 * PIXEL_STRIDE) {
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    const a = px[i + 3];
    if (a < 128) continue;
    // 3-3-3 bit bucket key.
    const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
    const cur = buckets.get(key);
    if (cur) {
      cur.r += r;
      cur.g += g;
      cur.b += b;
      cur.n++;
    } else {
      buckets.set(key, { r, g, b, n: 1 });
    }
  }
  return [...buckets.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, k)
    .map((c) => {
      const r = Math.round(c.r / c.n);
      const g = Math.round(c.g / c.n);
      const b = Math.round(c.b / c.n);
      return {
        rgb: { r, g, b },
        hex: rgbToHex(r, g, b),
        population: c.n,
      };
    });
}

function computeAverageLuminance(data: ImageData): number {
  const px = data.data;
  let sum = 0;
  let n = 0;
  for (let i = 0; i < px.length; i += 4 * 8) {
    sum += relativeLuminance(px[i], px[i + 1], px[i + 2]);
    n++;
  }
  return n === 0 ? 0 : sum / n;
}

function computeContrastBlocks(canvas: HTMLCanvasElement, blockSize = BLOCK_SIZE): ContrastBlock[] {
  const ctx = canvas.getContext('2d')!;
  const blocks: ContrastBlock[] = [];
  for (let y = 0; y < canvas.height; y += blockSize) {
    for (let x = 0; x < canvas.width; x += blockSize) {
      const w = Math.min(blockSize, canvas.width - x);
      const h = Math.min(blockSize, canvas.height - y);
      const data = ctx.getImageData(x, y, w, h);
      let minL = 1;
      let maxL = 0;
      const px = data.data;
      for (let i = 0; i < px.length; i += 4) {
        const L = relativeLuminance(px[i], px[i + 1], px[i + 2]);
        if (L < minL) minL = L;
        if (L > maxL) maxL = L;
      }
      const ratio = contrastRatio(maxL, minL);
      let band: ContrastBlock['band'];
      if (ratio < 1.5) band = 'low';
      else if (ratio < 3) band = 'medium';
      else band = 'high';
      blocks.push({ x, y, width: w, height: h, contrast: +ratio.toFixed(2), band });
    }
  }
  return blocks;
}

function simulateCvd(canvas: HTMLCanvasElement, mode: ColorBlindnessMode): string {
  const matrix = CVD_MATRICES[mode];
  const out = document.createElement('canvas');
  out.width = canvas.width;
  out.height = canvas.height;
  const ctx = out.getContext('2d')!;
  ctx.drawImage(canvas, 0, 0);
  const data = ctx.getImageData(0, 0, out.width, out.height);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    px[i] = Math.max(0, Math.min(255, matrix[0][0] * r + matrix[0][1] * g + matrix[0][2] * b));
    px[i + 1] = Math.max(0, Math.min(255, matrix[1][0] * r + matrix[1][1] * g + matrix[1][2] * b));
    px[i + 2] = Math.max(0, Math.min(255, matrix[2][0] * r + matrix[2][1] * g + matrix[2][2] * b));
  }
  ctx.putImageData(data, 0, 0);
  return out.toDataURL('image/png');
}

function inferOrientation(
  width: number,
  height: number,
): ScreenshotAnalysis['inferredOrientation'] {
  const aspect = width / height;
  if (Math.abs(aspect - 1) < 0.05) return 'square';
  if (aspect < 0.6 && height > 600) return 'portrait-mobile';
  if (aspect > 1.5 && aspect < 2.4 && width < 1200) return 'landscape-mobile';
  if (aspect >= 0.6 && aspect < 0.9 && height > 800) return 'portrait-tablet';
  if (aspect >= 1.2 && aspect <= 1.5 && width < 1400) return 'landscape-tablet';
  if (aspect >= 1.5 && width >= 1200) return 'desktop';
  return 'other';
}

function buildFindings(report: Omit<ScreenshotAnalysis, 'findings'>): ScreenshotFinding[] {
  const out: ScreenshotFinding[] = [];

  if (report.width < 320 || report.height < 320) {
    out.push({
      id: 'tiny-input',
      severity: 'warning',
      message: `Image is ${report.width}×${report.height}px — too small to evaluate mobile UI fidelity.`,
    });
  }

  if (report.averageLuminance < 0.15) {
    out.push({
      id: 'mostly-dark',
      severity: 'info',
      message: `Average luminance ${report.averageLuminance.toFixed(2)} — screen is mostly dark, verify text contrast in dark UI.`,
    });
  } else if (report.averageLuminance > 0.85) {
    out.push({
      id: 'mostly-bright',
      severity: 'info',
      message: `Average luminance ${report.averageLuminance.toFixed(2)} — screen is washed out, low-contrast text may disappear.`,
    });
  }

  const totalBlocks = report.contrastBlocks.length || 1;
  const lowBlocks = report.contrastBlocks.filter((b) => b.band === 'low').length;
  const lowPct = (lowBlocks / totalBlocks) * 100;
  if (lowBlocks > 0 && lowPct > 30) {
    out.push({
      id: 'large-flat-areas',
      severity: 'info',
      message: `${lowPct.toFixed(0)}% of the image is flat (<1.5:1) — expected for backgrounds, but verify no text sits there unreadably.`,
    });
  }

  const mediumBlocks = report.contrastBlocks.filter((b) => b.band === 'medium').length;
  const mediumPct = (mediumBlocks / totalBlocks) * 100;
  if (mediumPct > 15) {
    out.push({
      id: 'low-contrast-clusters',
      severity: 'warning',
      message: `${mediumPct.toFixed(0)}% of grid blocks have local contrast 1.5–3:1 — text in those regions likely fails WCAG AA.`,
    });
  }

  if (report.dominantColors.length > 0 && report.dominantColors[0].population > 0) {
    const total = report.dominantColors.reduce((s, c) => s + c.population, 0);
    const topShare = report.dominantColors[0].population / total;
    if (topShare > 0.6) {
      out.push({
        id: 'monochrome',
        severity: 'info',
        message: `One color (${report.dominantColors[0].hex}) covers ${(topShare * 100).toFixed(0)}% of pixels — palette is monochromatic.`,
      });
    }
  }

  out.push({
    id: 'cvd-review',
    severity: 'info',
    message:
      'Compare the color-blindness previews — make sure status colors stay distinguishable under protanopia and deuteranopia.',
  });

  return out;
}

/* ------------------------------------------------------------------ */
/* Public entry points                                                 */
/* ------------------------------------------------------------------ */

async function loadAsBitmap(input: File | Blob): Promise<ImageBitmap> {
  return createImageBitmap(input);
}

export async function analyzeFile(file: File): Promise<ScreenshotAnalysis> {
  if (!/^image\/(png|jpe?g)$/i.test(file.type)) {
    throw new Error(`Unsupported file type: ${file.type || 'unknown'} — only PNG / JPEG are accepted.`);
  }
  const bitmap = await loadAsBitmap(file);
  try {
    return analyzeBitmap(bitmap);
  } finally {
    bitmap.close?.();
  }
}

export function analyzeBitmap(source: ImageBitmap | HTMLImageElement | HTMLCanvasElement): ScreenshotAnalysis {
  const fullWidth = 'naturalWidth' in source ? source.naturalWidth : source.width;
  const fullHeight = 'naturalHeight' in source ? source.naturalHeight : source.height;

  const { canvas } = downscaledCanvas(source, MAX_DIM);
  const ctx = canvas.getContext('2d')!;
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const dominantColors = computeDominantColors(data);
  const averageLuminance = computeAverageLuminance(data);
  const contrastBlocks = computeContrastBlocks(canvas, BLOCK_SIZE);
  const previewUrl = canvas.toDataURL('image/png');
  const colorBlindness: Record<ColorBlindnessMode, string> = {
    protanopia: simulateCvd(canvas, 'protanopia'),
    deuteranopia: simulateCvd(canvas, 'deuteranopia'),
    tritanopia: simulateCvd(canvas, 'tritanopia'),
  };
  const aspectRatio = fullWidth / fullHeight;
  const inferredOrientation = inferOrientation(fullWidth, fullHeight);

  const partial = {
    width: fullWidth,
    height: fullHeight,
    aspectRatio: +aspectRatio.toFixed(3),
    inferredOrientation,
    averageLuminance: +averageLuminance.toFixed(3),
    dominantColors,
    contrastBlocks,
    previewUrl,
    colorBlindness,
    blockSize: BLOCK_SIZE,
    analyzedSize: { width: canvas.width, height: canvas.height },
  };
  const findings = buildFindings(partial);
  return { ...partial, findings };
}
