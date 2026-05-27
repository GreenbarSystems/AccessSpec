import {
  AppWindow,
  Calendar,
  Compass,
  Search,
  Sliders,
  SquareStack,
  Upload,
  type LucideIcon,
} from 'lucide-react';

import type { PatternKind } from '../../services/PatternRecognizer';

/**
 * PATTERN_ICON used to live inside PatternRecognizer.ts as a Record of
 * emoji strings. The service file is now React-free (it can be imported
 * from non-React contexts like the inline runtime scanner) and the icon
 * mapping moved here so the React/lucide dependency stays in the UI layer.
 */
export const PATTERN_ICON: Record<PatternKind, LucideIcon> = {
  'date-picker': Calendar,
  'file-upload': Upload,
  navigation: Compass,
  modal: AppWindow,
  toggle: Sliders,
  search: Search,
  tabs: SquareStack,
};
