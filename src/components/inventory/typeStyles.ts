import type { UIElementType } from '../../services/ComponentDetector';

/**
 * Visual treatment for each UI type. Tailwind classes are baked in so the
 * panel can render a chip without per-call branching.
 */
export const TYPE_STYLES: Record<
  UIElementType,
  { icon: string; chip: string; dot: string }
> = {
  button: {
    icon: '🔘',
    chip: 'bg-rose-50 text-rose-800 border-rose-200',
    dot: 'bg-rose-500',
  },
  link: {
    icon: '🔗',
    chip: 'bg-sky-50 text-sky-800 border-sky-200',
    dot: 'bg-sky-500',
  },
  input: {
    icon: '⌨️',
    chip: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  tab: {
    icon: '📑',
    chip: 'bg-violet-50 text-violet-800 border-violet-200',
    dot: 'bg-violet-500',
  },
  modal: {
    icon: '🪟',
    chip: 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200',
    dot: 'bg-fuchsia-500',
  },
  dialog: {
    icon: '💬',
    chip: 'bg-purple-50 text-purple-800 border-purple-200',
    dot: 'bg-purple-500',
  },
  card: {
    icon: '🃏',
    chip: 'bg-amber-50 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
  },
  navigation: {
    icon: '🧭',
    chip: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    dot: 'bg-indigo-500',
  },
  table: {
    icon: '🧮',
    chip: 'bg-teal-50 text-teal-800 border-teal-200',
    dot: 'bg-teal-500',
  },
  form: {
    icon: '📝',
    chip: 'bg-orange-50 text-orange-800 border-orange-200',
    dot: 'bg-orange-500',
  },
  menu: {
    icon: '☰',
    chip: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    dot: 'bg-cyan-500',
  },
  tooltip: {
    icon: '💡',
    chip: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    dot: 'bg-yellow-500',
  },
  alert: {
    icon: '⚠️',
    chip: 'bg-red-50 text-red-800 border-red-200',
    dot: 'bg-red-500',
  },
  accordion: {
    icon: '🪗',
    chip: 'bg-lime-50 text-lime-800 border-lime-200',
    dot: 'bg-lime-500',
  },
  list: {
    icon: '📋',
    chip: 'bg-stone-100 text-stone-800 border-stone-200',
    dot: 'bg-stone-500',
  },
};
