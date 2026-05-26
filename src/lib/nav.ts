export type NavItem = {
  to: string;
  label: string;
  icon: string; // emoji glyph keeps the shell zero-dependency
  description: string;
};

export const navItems: NavItem[] = [
  {
    to: '/',
    label: 'Dashboard',
    icon: '📊',
    description: 'WCAG 2.2 compliance overview',
  },
  {
    to: '/analyzer',
    label: 'Analyzer',
    icon: '🔍',
    description: 'Check touch targets, contrast & text scaling',
  },
  {
    to: '/simulator',
    label: 'Simulator',
    icon: '📱',
    description: 'Compare iOS vs Android native patterns',
  },
  {
    to: '/reports',
    label: 'Reports',
    icon: '📄',
    description: 'Saved audits and exports',
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: '⚙️',
    description: 'Defaults, thresholds, and integrations',
  },
];
