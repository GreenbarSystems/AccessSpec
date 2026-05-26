#!/usr/bin/env node
/**
 * vendor-tesseract.mjs
 *
 * Stages every asset Tesseract.js needs at runtime into `public/tesseract/`
 * so the OCR feature can run with zero third-party network requests at
 * runtime. The default `createWorker()` call would otherwise load:
 *
 *   • worker.min.js  — from cdn.jsdelivr.net/npm/tesseract.js
 *   • the WASM core — from cdn.jsdelivr.net/npm/tesseract.js-core
 *   • eng.traineddata.gz — from cdn.jsdelivr.net/npm/@tesseract.js-data/eng
 *
 * Each of those CDN hits leaks "this user opened the OCR feature" to a
 * third party, and breaks our "everything runs in your browser, nothing
 * leaves your machine" promise. Self-hosting eliminates the leak — the
 * assets are served from the same origin as the dashboard itself.
 *
 * Why a script and not committed binaries:
 *   • The WASM + worker live in node_modules already (they're real
 *     dependencies) — no need to duplicate them in git.
 *   • The language data (~3 MB) is downloaded once, then cached in
 *     public/tesseract/ (gitignored). CI re-downloads at deploy time.
 *
 * Run automatically before `dev` and `build` via package.json hooks.
 * Can also be run manually: `npm run vendor:tesseract`.
 */

import { mkdir, copyFile, stat, writeFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PUBLIC_DIR = join(ROOT, 'public', 'tesseract');
const NM_TJS = join(ROOT, 'node_modules', 'tesseract.js');
const NM_CORE = join(ROOT, 'node_modules', 'tesseract.js-core');

// Six WASM variants — the worker picks one at runtime based on the
// browser's SIMD / relaxed-SIMD support. We ship all of them so every
// browser hits a local file.
const CORE_VARIANTS = [
  'tesseract-core.wasm',
  'tesseract-core.wasm.js',
  'tesseract-core-lstm.wasm',
  'tesseract-core-lstm.wasm.js',
  'tesseract-core-simd.wasm',
  'tesseract-core-simd.wasm.js',
  'tesseract-core-simd-lstm.wasm',
  'tesseract-core-simd-lstm.wasm.js',
  'tesseract-core-relaxedsimd.wasm',
  'tesseract-core-relaxedsimd.wasm.js',
  'tesseract-core-relaxedsimd-lstm.wasm',
  'tesseract-core-relaxedsimd-lstm.wasm.js',
];

// Tesseract picks the `_best_int` (integer-quantized) dataset when the
// worker is created with oem=1 (LSTM-only). That matches our
// createWorker('eng', 1, ...) call in ScreenshotOcr.ts and keeps the
// download to ~3 MB instead of ~11 MB.
const LANG_URL =
  'https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz';

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(p) {
  await mkdir(p, { recursive: true });
}

async function copyIfMissingOrStale(src, dst) {
  if (!(await exists(src))) {
    throw new Error(`Source not found: ${src}`);
  }
  const [srcStat, dstStat] = await Promise.all([
    stat(src),
    exists(dst).then((e) => (e ? stat(dst) : null)),
  ]);
  if (dstStat && dstStat.size === srcStat.size && dstStat.mtimeMs >= srcStat.mtimeMs) {
    return false;
  }
  await copyFile(src, dst);
  return true;
}

async function downloadIfMissing(url, dst) {
  if (await exists(dst)) {
    const s = await stat(dst);
    if (s.size > 1024) {
      // Already cached — keep as-is. Delete the file manually if you want
      // to force a re-download.
      return false;
    }
  }
  process.stdout.write(`  fetching ${url}\n`);
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(`Download failed: ${url} → HTTP ${res.status}`);
  }
  // Pipe the response stream straight to disk.
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dst));
  return true;
}

async function main() {
  process.stdout.write('vendor-tesseract: staging assets into public/tesseract/\n');
  await ensureDir(PUBLIC_DIR);

  // Worker script.
  const workerSrc = join(NM_TJS, 'dist', 'worker.min.js');
  const workerDst = join(PUBLIC_DIR, 'worker.min.js');
  const workerCopied = await copyIfMissingOrStale(workerSrc, workerDst);
  process.stdout.write(`  worker.min.js                     ${workerCopied ? 'copied' : 'cached'}\n`);

  // WASM core variants.
  for (const file of CORE_VARIANTS) {
    const src = join(NM_CORE, file);
    if (!(await exists(src))) {
      // tesseract.js-core sometimes drops variants between versions —
      // skip with a note rather than failing the whole build.
      process.stdout.write(`  ${file.padEnd(34)}skipped (not in tesseract.js-core)\n`);
      continue;
    }
    const dst = join(PUBLIC_DIR, file);
    const copied = await copyIfMissingOrStale(src, dst);
    process.stdout.write(`  ${file.padEnd(34)}${copied ? 'copied' : 'cached'}\n`);
  }

  // Language data (downloaded once, cached forever).
  const langDst = join(PUBLIC_DIR, 'eng.traineddata.gz');
  const langDownloaded = await downloadIfMissing(LANG_URL, langDst);
  process.stdout.write(`  eng.traineddata.gz                ${langDownloaded ? 'downloaded' : 'cached'}\n`);

  // Drop a README so anyone poking at public/tesseract/ knows it's auto-generated.
  await writeFile(
    join(PUBLIC_DIR, 'README.md'),
    [
      '# Vendored Tesseract.js assets',
      '',
      'This directory is auto-populated by `scripts/vendor-tesseract.mjs`.',
      '',
      'Contents are intentionally gitignored — the WASM + worker live in',
      '`node_modules/tesseract.js-core` and `node_modules/tesseract.js` and',
      'are copied on every `npm run dev` / `npm run build`. The language',
      'data file is downloaded once from jsdelivr and cached locally.',
      '',
      'If you want a fully offline install, commit `eng.traineddata.gz`',
      'separately or vendor the `@tesseract.js-data/eng` package.',
      '',
    ].join('\n'),
  );

  process.stdout.write('vendor-tesseract: done.\n');
}

main().catch((err) => {
  process.stderr.write(`vendor-tesseract: ERROR — ${err.message}\n`);
  process.exit(1);
});
