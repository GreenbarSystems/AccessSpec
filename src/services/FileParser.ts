/**
 * FileParser
 *
 * Single source of truth for which file types the ingestion pipeline accepts,
 * how their language is named, and how raw bytes/text become `SourceFile`
 * records that the rest of the app consumes.
 *
 * Everything downstream (ZipExtractor, GithubFetcher, the upload UI) routes
 * its candidates through `isSupported` and `toSourceFile` so that any rule
 * change here applies globally.
 */

export type SupportedExt =
  | 'html'
  | 'css'
  | 'js'
  | 'ts'
  | 'tsx'
  | 'jsx'
  | 'vue'
  | 'json'
  | 'zip';

export type Language =
  | 'html'
  | 'css'
  | 'javascript'
  | 'typescript'
  | 'tsx'
  | 'jsx'
  | 'vue'
  | 'json'
  | 'archive';

export type SourceOrigin =
  | 'paste'
  | 'file'
  | 'zip'
  | 'github'
  | 'gitlab'
  | 'bitbucket';

export type SourceFile = {
  /** Repo-relative path, forward-slash normalized. e.g. "src/App.tsx" */
  path: string;
  /** Basename only. e.g. "App.tsx" */
  name: string;
  /** Lowercase extension without leading dot. e.g. "tsx" */
  ext: SupportedExt;
  language: Language;
  /** Text contents. Binary files are not supported in this engine. */
  content: string;
  /** Byte length of the UTF-8 encoded content. */
  size: number;
  /** Which input path produced this file. */
  origin: SourceOrigin;
};

export const SUPPORTED_EXTENSIONS: readonly SupportedExt[] = [
  'html',
  'css',
  'js',
  'ts',
  'tsx',
  'jsx',
  'vue',
  'json',
  'zip',
] as const;

/** Extensions that contain source code we actually parse for analysis. */
export const SOURCE_EXTENSIONS: readonly SupportedExt[] = SUPPORTED_EXTENSIONS.filter(
  (e) => e !== 'zip',
);

/** Hard caps so a malicious upload can't OOM the tab. */
export const LIMITS = {
  maxFileBytes: 5 * 1024 * 1024, // 5 MB per file
  maxTotalBytes: 50 * 1024 * 1024, // 50 MB per project
  maxFiles: 2000,
} as const;

const EXT_TO_LANGUAGE: Record<SupportedExt, Language> = {
  html: 'html',
  css: 'css',
  js: 'javascript',
  ts: 'typescript',
  tsx: 'tsx',
  jsx: 'jsx',
  vue: 'vue',
  json: 'json',
  zip: 'archive',
};

export function getExtension(filename: string): string | null {
  const base = filename.split(/[\\/]/).pop() ?? '';
  const dot = base.lastIndexOf('.');
  if (dot <= 0 || dot === base.length - 1) return null;
  return base.slice(dot + 1).toLowerCase();
}

export function isSupportedFilename(filename: string): boolean {
  const ext = getExtension(filename);
  return ext !== null && (SUPPORTED_EXTENSIONS as readonly string[]).includes(ext);
}

export function isSourceFilename(filename: string): boolean {
  const ext = getExtension(filename);
  return ext !== null && (SOURCE_EXTENSIONS as readonly string[]).includes(ext);
}

export function getLanguage(filename: string): Language | null {
  const ext = getExtension(filename);
  if (!ext || !(ext in EXT_TO_LANGUAGE)) return null;
  return EXT_TO_LANGUAGE[ext as SupportedExt];
}

/** Normalize OS-specific and zip-internal paths to a stable forward-slash form. */
export function normalizePath(path: string): string {
  return path
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/');
}

/** Build a SourceFile from already-decoded text. */
export function toSourceFile(
  path: string,
  content: string,
  origin: SourceOrigin,
): SourceFile {
  const normalized = normalizePath(path);
  const name = normalized.split('/').pop() ?? normalized;
  const ext = getExtension(name);
  if (!ext || !(ext in EXT_TO_LANGUAGE) || ext === 'zip') {
    throw new Error(`Unsupported file: ${path}`);
  }
  const supportedExt = ext as Exclude<SupportedExt, 'zip'>;
  return {
    path: normalized,
    name,
    ext: supportedExt,
    language: EXT_TO_LANGUAGE[supportedExt],
    content,
    size: new Blob([content]).size,
    origin,
  };
}

/** Read a browser File handle as UTF-8 text and wrap it as a SourceFile. */
export async function readBrowserFile(
  file: File,
  origin: SourceOrigin = 'file',
  pathOverride?: string,
): Promise<SourceFile> {
  if (file.size > LIMITS.maxFileBytes) {
    throw new Error(
      `${file.name} is ${(file.size / 1024 / 1024).toFixed(1)} MB — exceeds ${
        LIMITS.maxFileBytes / 1024 / 1024
      } MB per-file limit`,
    );
  }
  const text = await file.text();
  // webkitRelativePath is set by <input webkitdirectory>; preserves folder
  // structure when a user drags a folder in.
  const inferredPath =
    pathOverride ??
    (file as File & { webkitRelativePath?: string }).webkitRelativePath ??
    file.name;
  return toSourceFile(inferredPath || file.name, text, origin);
}

/** Build a SourceFile from pasted text. Default filename when none is given. */
export function parsePastedSource(
  content: string,
  filename = 'pasted.html',
): SourceFile {
  if (!isSourceFilename(filename)) {
    throw new Error(
      `Filename "${filename}" has no supported source extension`,
    );
  }
  return toSourceFile(filename, content, 'paste');
}
