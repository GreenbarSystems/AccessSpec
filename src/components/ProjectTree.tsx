import { useMemo, useState } from 'react';
import { ChevronRight, File, Folder } from 'lucide-react';
import type { SourceFile, Language } from '../services/FileParser';

type TreeNode = {
  name: string;
  path: string;
  children: Map<string, TreeNode>;
  file?: SourceFile;
};

type Props = {
  files: SourceFile[];
  onSelect?: (file: SourceFile) => void;
};

const LANG_BADGE: Record<Language, string> = {
  html: 'bg-orange-100 text-orange-800',
  css: 'bg-sky-100 text-sky-800',
  javascript: 'bg-yellow-100 text-yellow-800',
  typescript: 'bg-blue-100 text-blue-800',
  tsx: 'bg-indigo-100 text-indigo-800',
  jsx: 'bg-amber-100 text-amber-800',
  vue: 'bg-emerald-100 text-emerald-800',
  json: 'bg-slate-100 text-slate-700 dark:text-slate-300 dark:bg-slate-800',
  archive: 'bg-slate-100 text-slate-700 dark:text-slate-300 dark:bg-slate-800',
};

function buildTree(files: SourceFile[]): TreeNode {
  const root: TreeNode = { name: '', path: '', children: new Map() };
  for (const file of files) {
    const parts = file.path.split('/');
    let cursor = root;
    let acc = '';
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      acc = acc ? `${acc}/${part}` : part;
      let next = cursor.children.get(part);
      if (!next) {
        next = { name: part, path: acc, children: new Map() };
        cursor.children.set(part, next);
      }
      if (i === parts.length - 1) next.file = file;
      cursor = next;
    }
  }
  return root;
}

function sortedChildren(node: TreeNode): TreeNode[] {
  return [...node.children.values()].sort((a, b) => {
    const aDir = a.children.size > 0 && !a.file;
    const bDir = b.children.size > 0 && !b.file;
    if (aDir !== bDir) return aDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function NodeRow({
  node,
  depth,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  onSelect?: (file: SourceFile) => void;
}) {
  // Folders auto-open one level deep so the tree is informative without
  // overwhelming on first render.
  const [open, setOpen] = useState(depth < 2);
  const isFolder = node.children.size > 0 && !node.file;
  const indent = { paddingLeft: `${depth * 14 + 8}px` };

  if (isFolder) {
    return (
      <li role="treeitem" aria-expanded={open}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left text-sm hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800"
          style={indent}
        >
          <ChevronRight
            aria-hidden
            className={[
              'h-3 w-3 shrink-0 text-slate-500 transition-transform',
              open ? 'rotate-90' : '',
            ].join(' ')}
          />
          <Folder aria-hidden className="h-3.5 w-3.5 shrink-0 text-slate-500" />
          <span className="font-medium text-slate-800 dark:text-slate-200">{node.name}</span>
          <span className="ml-auto pr-2 text-xs text-slate-400 dark:text-slate-500">
            {node.children.size}
          </span>
        </button>
        {open && (
          <ul role="group">
            {sortedChildren(node).map((child) => (
              <NodeRow
                key={child.path}
                node={child}
                depth={depth + 1}
                onSelect={onSelect}
              />
            ))}
          </ul>
        )}
      </li>
    );
  }

  const file = node.file!;
  return (
    <li role="treeitem">
      <button
        type="button"
        onClick={() => onSelect?.(file)}
        className="flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left text-sm hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800"
        style={indent}
        data-file-path={file.path}
      >
        <span aria-hidden className="w-3" />
        <File aria-hidden className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
        <span className="truncate text-slate-700 dark:text-slate-300">{file.name}</span>
        <span
          className={[
            'ml-auto rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide',
            LANG_BADGE[file.language],
          ].join(' ')}
        >
          {file.ext}
        </span>
      </button>
    </li>
  );
}

export function ProjectTree({ files, onSelect }: Props) {
  const root = useMemo(() => buildTree(files), [files]);
  if (files.length === 0) {
    return (
      <p className="text-sm text-slate-500">No files loaded yet.</p>
    );
  }
  return (
    <ul role="tree" aria-label="Project tree" className="max-h-[28rem] overflow-auto">
      {sortedChildren(root).map((child) => (
        <NodeRow key={child.path} node={child} depth={0} onSelect={onSelect} />
      ))}
    </ul>
  );
}
