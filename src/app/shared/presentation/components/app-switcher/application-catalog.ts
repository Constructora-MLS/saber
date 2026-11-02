/**
 * ApplicationDefinition describes an application of the platform.
 *
 * The id tells which application owns the section that is open, and the path
 * is the route that opens the application. The path is null when the
 * application is not available yet.
 */
export interface ApplicationDefinition {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly path: string | null;
  readonly status: 'active' | 'soon';
  readonly dividerAfter?: boolean;
}

/**
 * APPLICATION_CATALOG is the list of applications of the platform.
 *
 * The applications that are already available come first, so the switcher
 * offers them at the top. The applications that are still coming stay in
 * their own group, separated by a divider, because they cannot be opened.
 */
export const APPLICATION_CATALOG: readonly ApplicationDefinition[] = [
  {
    id: 'human-resources',
    label: 'Recursos Humanos',
    icon: 'groups',
    path: '/employees',
    status: 'active',
  },
  {
    id: 'administration',
    label: 'Administración',
    icon: 'admin_panel_settings',
    path: '/users',
    status: 'active',
    dividerAfter: true,
  },
  { id: 'logistics', label: 'Logística', icon: 'local_shipping', path: null, status: 'soon' },
  { id: 'inventory', label: 'Inventario', icon: 'inventory_2', path: null, status: 'soon' },
];
