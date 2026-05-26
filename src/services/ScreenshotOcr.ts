/**
 * ScreenshotOcr
 *
 * Thin wrapper around tesseract.js. Three reasons it exists:
 *
 *   1. **Lazy load.** Tesseract is ~3 MB of WASM + ~3 MB of language data on
 *      first run. We use `import('tesseract.js')` so it only lands in the
 *      bundle when the user actually clicks "Run OCR".
 *   2. **Worker reuse.** Spinning up a worker is the expensive part; we
 *      keep a singleton so subsequent images reuse it.
 *   3. **Per-word contrast.** Once we know exactly where text sits, we can
 *      sample its foreground / background colors and run the WCAG ratio on
 *      the *actual* rendered pixels — way better than the 32×32 grid hint.
 */

import { calculateContrast, type RGB, type RGBA } from './ContrastChecker';

export type OcrWord = {
  text: string;
  /** 0-100 from tesseract. */
  confidence: number;
  /** Pixel coordinates in the source image. */
  bbox: { x0: number; y0: number; x1: number; y1: number };
};

export type OcrResult = {
  words: OcrWord[];
  /** Whole-image text concatenation, mainly for debugging. */
  fullText: string;
  /** ms spent inside `worker.recognize`. */
  durationMs: number;
};

/** Progress callbacks surfaced to the UI so we can show a download bar. */
export type OcrProgress = {
  status: string;
  progress: number; // 0..1
};

type ProgressHandler = (p: OcrProgress) => void;

/* ------------------------------------------------------------------ */
/* Worker singleton                                                    */
/* ------------------------------------------------------------------ */

// `any` here because we don't want to import tesseract.js types eagerly
// (that would defeat the lazy bundle split).
type RawWord = {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
};
type RawBlock = {
  paragraphs?: Array<{ lines?: Array<{ words?: RawWord[] }> }>;
};
type TesseractWorker = {
  /**
   * Third arg is the per-call output map. We always ask for blocks so the
   * nested word→bbox structure comes back (default text-only mode in v6+
   * omits it).
   */
  recognize: (
    image: File | Blob | string | HTMLCanvasElement | HTMLImageElement,
    options?: Record<string, unknown>,
    output?: { text?: boolean; blocks?: boolean },
  ) => Promise<{ data: { text: string; blocks?: RawBlock[] } }>;
  terminate: () => Promise<void>;
};

function flattenWords(blocks: RawBlock[] | undefined): OcrWord[] {
  if (!blocks) return [];
  const out: OcrWord[] = [];
  for (const block of blocks) {
    for (const para of block.paragraphs ?? []) {
      for (const line of para.lines ?? []) {
        for (const word of line.words ?? []) {
          if (!word.text || !word.text.trim()) continue;
          out.push({
            text: word.text.trim(),
            confidence: word.confidence,
            bbox: word.bbox,
          });
        }
      }
    }
  }
  return out;
}

let workerPromise: Promise<TesseractWorker> | null = null;
let progressSubscribers = new Set<ProgressHandler>();

function emitProgress(p: OcrProgress): void {
  for (const sub of progressSubscribers) sub(p);
}

async function getWorker(): Promise<TesseractWorker> {
  if (workerPromise) return workerPromise;
  workerPromise = (async () => {
    emitProgress({ status: 'loading-tesseract', progress: 0 });
    const mod = (await import('tesseract.js')) as unknown as {
      createWorker: (
        lang: string,
        oem?: number,
        opts?: { logger?: (m: { status: string; progress: number }) => void },
      ) => Promise<TesseractWorker>;
    };
    const worker = await mod.createWorker('eng', 1, {
      logger: (m) =>
        emitProgress({ status: m.status, progress: m.progress }),
    });
    emitProgress({ status: 'ready', progress: 1 });
    return worker;
  })();
  return workerPromise;
}

export function subscribeProgress(handler: ProgressHandler): () => void {
  progressSubscribers.add(handler);
  return () => progressSubscribers.delete(handler);
}

/** Free the worker. Call when the panel unmounts to reclaim ~30 MB of RAM. */
export async function terminateOcr(): Promise<void> {
  if (!workerPromise) return;
  try {
    const w = await workerPromise;
    await w.terminate();
  } finally {
    workerPromise = null;
  }
}

/* ------------------------------------------------------------------ */
/* Public entry                                                        */
/* ------------------------------------------------------------------ */

export async function recognizeImage(
  image: File | Blob | HTMLCanvasElement | HTMLImageElement,
): Promise<OcrResult> {
  const worker = await getWorker();
  const start = performance.now();
  // Tesseract.js v6+ requires opting into per-block output to get word
  // bounding boxes back — `recognize(image)` alone returns only `text`.
  const result = await worker.recognize(image, {}, { blocks: true, text: true });
  const durationMs = Math.round(performance.now() - start);
  const words = flattenWords(result.data.blocks);
  return { words, fullText: result.data.text ?? '', durationMs };
}

/* ------------------------------------------------------------------ */
/* Per-word foreground / background sampling + contrast                */
/* ------------------------------------------------------------------ */

export type TextContrastCheck = {
  word: OcrWord;
  fg: RGB;
  bg: RGB;
  ratio: number;
  verdict: 'pass' | 'aa-fail' | 'aaa-only';
  /** Mean font height inferred from the bbox — used for large-text rules. */
  approxFontPx: number;
};

/**
 * Sample colors in a word bbox. We assume bimodal luminance: most pixels are
 * the background paper, a smaller subset are the ink strokes. Split by the
 * median, assign whichever group is *less common* as foreground.
 */
function sampleFgBg(
  canvas: HTMLCanvasElement,
  bbox: OcrWord['bbox'],
): { fg: RGB; bg: RGB } | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const w = Math.max(1, bbox.x1 - bbox.x0);
  const h = Math.max(1, bbox.y1 - bbox.y0);
  // Clamp to canvas just in case tesseract reports a fractional edge.
  const x = Math.max(0, Math.min(canvas.width - 1, bbox.x0));
  const y = Math.max(0, Math.min(canvas.height - 1, bbox.y0));
  const ww = Math.min(w, canvas.width - x);
  const hh = Math.min(h, canvas.height - y);
  if (ww <= 0 || hh <= 0) return null;
  const data = ctx.getImageData(x, y, ww, hh).data;

  // Pass 1: collect (r, g, b, L) for each opaque pixel.
  const rs: number[] = [];
  const gs: number[] = [];
  const bs: number[] = [];
  const Ls: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    rs.push(r);
    gs.push(g);
    bs.push(b);
    Ls.push(L);
  }
  if (Ls.length < 4) return null;

  // Median split.
  const sorted = [...Ls].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  // Group pixels.
  let darkR = 0,
    darkG = 0,
    darkB = 0,
    darkN = 0;
  let lightR = 0,
    lightG = 0,
    lightB = 0,
    lightN = 0;
  for (let i = 0; i < Ls.length; i++) {
    if (Ls[i] < median) {
      darkR += rs[i];
      darkG += gs[i];
      darkB += bs[i];
      darkN++;
    } else {
      lightR += rs[i];
      lightG += gs[i];
      lightB += bs[i];
      lightN++;
    }
  }
  if (darkN === 0 || lightN === 0) return null;

  const dark: RGB = {
    r: Math.round(darkR / darkN),
    g: Math.round(darkG / darkN),
    b: Math.round(darkB / darkN),
  };
  const light: RGB = {
    r: Math.round(lightR / lightN),
    g: Math.round(lightG / lightN),
    b: Math.round(lightB / lightN),
  };

  // Whichever group has fewer pixels is the ink (foreground); the other
  // group is the paper (background). When counts tie we treat the darker
  // bucket as ink, which matches the dominant "dark text on light bg" case.
  const fg = darkN <= lightN ? dark : light;
  const bg = fg === dark ? light : dark;
  return { fg, bg };
}

function verdictFor(ratio: number, large: boolean): TextContrastCheck['verdict'] {
  const aa = large ? 3 : 4.5;
  const aaa = large ? 4.5 : 7;
  if (ratio + 1e-6 < aa) return 'aa-fail';
  if (ratio + 1e-6 < aaa) return 'aaa-only';
  return 'pass';
}

/**
 * Measure each detected word's foreground/background contrast directly off
 * the rendered pixels. Caller passes the analysis canvas (the same one the
 * panel already keeps for its other heuristics).
 */
export function measureWordContrast(
  canvas: HTMLCanvasElement,
  words: OcrWord[],
): TextContrastCheck[] {
  const out: TextContrastCheck[] = [];
  for (const word of words) {
    const sample = sampleFgBg(canvas, word.bbox);
    if (!sample) continue;
    const fgRgba: RGBA = { ...sample.fg, a: 1 };
    const bgRgba: RGBA = { ...sample.bg, a: 1 };
    const ratio = calculateContrast(fgRgba, bgRgba);
    const approxFontPx = Math.max(8, word.bbox.y1 - word.bbox.y0);
    const large = approxFontPx >= 24;
    out.push({
      word,
      fg: sample.fg,
      bg: sample.bg,
      ratio: +ratio.toFixed(2),
      verdict: verdictFor(ratio, large),
      approxFontPx,
    });
  }
  return out;
}
