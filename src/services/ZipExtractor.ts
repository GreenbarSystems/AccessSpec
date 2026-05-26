/**
 * ZipExtractor
 *
 * Wraps JSZip so the rest of the app deals only in `SourceFile[]`. Filters
 * out unsupported types and skips macOS metadata (`__MACOSX/`, `.DS_Store`).
 * Honors the global size/file-count caps from FileParser.
 */

import JSZip from 'jszip';
import {
  LIMITS,
  isSourceFilename,
  normalizePath,
  toSourceFile,
  type SourceFile,
} from './FileParser';

export type ZipExtractResult = {
  files: SourceFile[];
  /** Paths that were inside the archive but skipped (unsupported / too big). */
  skipped: { path: string; reason: string }[];
};

function isJunkPath(path: string): boolean {
  if (path.startsWith('__MACOSX/') || path.includes('/__MACOSX/')) return true;
  if (path.endsWith('/.DS_Store')) return true;
  if (path.endsWith('/Thumbs.db')) return true;
  return false;
}

/**
 * Strip a common top-level folder from all entries. GitHub zipballs and
 * `npm pack` tarballs nest everything under a single root — collapsing it
 * makes paths feel native (e.g. "src/App.tsx" instead of
 * "repo-main-abc123/src/App.tsx").
 */
function stripCommonRoot(paths: string[]): (p: string) => string {
  if (paths.length === 0) return (p) => p;
  const segments = paths.map((p) => p.split('/'));
  const firstTop = segments[0][0];
  const allShareTop =
    !!firstTop &&
    segments.every((s) => s.length > 1 && s[0] === firstTop);
  if (!allShareTop) return (p) => p;
  const prefix = `${firstTop}/`;
  return (p) => (p.startsWith(prefix) ? p.slice(prefix.length) : p);
}

export async function extractZip(input: File | Blob | ArrayBuffer): Promise<ZipExtractResult> {
  const zip = await JSZip.loadAsync(input);
  const candidates: { path: string; entry: JSZip.JSZipObject }[] = [];

  zip.forEach((relativePath, entry) => {
    if (entry.dir) return;
    const path = normalizePath(relativePath);
    if (isJunkPath(path)) return;
    candidates.push({ path, entry });
  });

  const remap = stripCommonRoot(candidates.map((c) => c.path));
  const files: SourceFile[] = [];
  const skipped: ZipExtractResult['skipped'] = [];
  let totalBytes = 0;

  for (const { path, entry } of candidates) {
    const outPath = remap(path);
    if (!isSourceFilename(outPath)) {
      skipped.push({ path: outPath, reason: 'unsupported extension' });
      continue;
    }
    if (files.length >= LIMITS.maxFiles) {
      skipped.push({ path: outPath, reason: `file cap (${LIMITS.maxFiles}) reached` });
      continue;
    }
    const text = await entry.async('string');
    const byteLen = new Blob([text]).size;
    if (byteLen > LIMITS.maxFileBytes) {
      skipped.push({
        path: outPath,
        reason: `exceeds ${LIMITS.maxFileBytes / 1024 / 1024} MB per-file limit`,
      });
      continue;
    }
    if (totalBytes + byteLen > LIMITS.maxTotalBytes) {
      skipped.push({
        path: outPath,
        reason: `would exceed ${LIMITS.maxTotalBytes / 1024 / 1024} MB project cap`,
      });
      continue;
    }
    totalBytes += byteLen;
    files.push(toSourceFile(outPath, text, 'zip'));
  }

  return { files, skipped };
}
