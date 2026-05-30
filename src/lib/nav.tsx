import {
  BarChart3,
  FileText,
  Search,
  Settings,
  Smartphone,
  type LucideIcon,
} from 'lucide-react';

/**
 * Top-level navigation items. The Icon column is a lucide React component
 * (not a string) so the Sidebar can render an SVG that inherits text colour
 * from its surrounding NavLink — emoji glyphs couldn't pick up the active /
 * hover states the same way.
 *
 * `subTabCount` is the number of sub-tabs the destination page exposes —
 * surfaced in the Sidebar as a small badge so users know up front how much
 * is in each section before clicking.
 */
export type NavItem = {
  to: string;
  label: string;
  Icon: LucideIcon;
  description: string;
  /** Sub-tab count surfaced as a badge next to the label in the Sidebar. */
  subTabCount?: number;
};

export const navItems: NavItem[] = [
  {
    to: '/',
    label: 'Dashboard',
    Icon: BarChart3,
    description: 'WCAG 2.2 compliance overview',
  },
  {
    to: '/analyzer',
    label: 'Analyzer',
    Icon: Search,
    description: 'Check touch targets, contrast & text scaling',
    subTabCount: 7,
  },
  {
    to: '/simulator',
    label: 'Simulator',
    Icon: Smartphone,
    description: 'Compare iOS vs Android native patterns',
    subTabCount: 4,
  },
  {
    to: '/reports',
    label: 'Reports',
    Icon: FileText,
    description: 'Saved audits and exports',
    subTabCount: 4,
  },
  {
    to: '/settings',
    label: 'Settings',
    Icon: Settings,
    description: 'Defaults, thresholds, and integrations',
  },
];
