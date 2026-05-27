import {
  AlertTriangle,
  AppWindow,
  ChevronsUpDown,
  Circle,
  Compass,
  CreditCard,
  FormInput,
  Keyboard,
  Lightbulb,
  Link2,
  List,
  Menu,
  MessageCircle,
  SquareStack,
  Table,
  type LucideIcon,
} from 'lucide-react';

import type { UIElementType } from '../../services/ComponentDetector';

/**
 * Visual treatment for each UI type. Icon is a lucide React component
 * (rendered inline) so it picks up Tailwind text colour from the chip /
 * dot it's nested in.
 */
export const TYPE_STYLES: Record<
  UIElementType,
  { Icon: LucideIcon; chip: string; dot: string }
> = {
  button: {
    Icon: Circle,
    chip: 'bg-rose-50 text-rose-800 border-rose-200',
    dot: 'bg-rose-500',
  },
  link: {
    Icon: Link2,
    chip: 'bg-sky-50 text-sky-800 border-sky-200',
    dot: 'bg-sky-500',
  },
  input: {
    Icon: Keyboard,
    chip: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  tab: {
    Icon: SquareStack,
    chip: 'bg-violet-50 text-violet-800 border-violet-200',
    dot: 'bg-violet-500',
  },
  modal: {
    Icon: AppWindow,
    chip: 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200',
    dot: 'bg-fuchsia-500',
  },
  dialog: {
    Icon: MessageCircle,
    chip: 'bg-purple-50 text-purple-800 border-purple-200',
    dot: 'bg-purple-500',
  },
  card: {
    Icon: CreditCard,
    chip: 'bg-amber-50 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
  },
  navigation: {
    Icon: Compass,
    chip: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    dot: 'bg-indigo-500',
  },
  table: {
    Icon: Table,
    chip: 'bg-teal-50 text-teal-800 border-teal-200',
    dot: 'bg-teal-500',
  },
  form: {
    Icon: FormInput,
    chip: 'bg-orange-50 text-orange-800 border-orange-200',
    dot: 'bg-orange-500',
  },
  menu: {
    Icon: Menu,
    chip: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    dot: 'bg-cyan-500',
  },
  tooltip: {
    Icon: Lightbulb,
    chip: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    dot: 'bg-yellow-500',
  },
  alert: {
    Icon: AlertTriangle,
    chip: 'bg-red-50 text-red-800 border-red-200',
    dot: 'bg-red-500',
  },
  accordion: {
    Icon: ChevronsUpDown,
    chip: 'bg-lime-50 text-lime-800 border-lime-200',
    dot: 'bg-lime-500',
  },
  list: {
    Icon: List,
    chip: 'bg-stone-100 text-stone-800 border-stone-200',
    dot: 'bg-stone-500',
  },
};
