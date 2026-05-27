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
 */
export type NavItem = {
  to: string;
  label: string;
  Icon: LucideIcon;
  description: string;
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
  },
  {
    to: '/simulator',
    label: 'Simulator',
    Icon: Smartphone,
    description: 'Compare iOS vs Android native patterns',
  },
  {
    to: '/reports',
    label: 'Reports',
    Icon: FileText,
    description: 'Saved audits and exports',
  },
  {
    to: '/settings',
    label: 'Settings',
    Icon: Settings,
    description: 'Defaults, thresholds, and integrations',
  },
];
