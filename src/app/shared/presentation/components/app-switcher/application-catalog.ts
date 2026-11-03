import { FunctionalPermission } from '../../../../iam/domain/model/value-objects/effective-permissions';

/**
 * ApplicationSection is a section of an application.
 *
 * The section carries the permissions that it needs: the platform grants the
 * route of the section to the members that hold one of them, so the
 * interface offers the section to the same members.
 */
export interface ApplicationSection {
  /** The name that the worker reads. */
  readonly label: string;
  /** The symbol that represents the section. */
  readonly icon: string;
  /** The route that opens the section. */
  readonly path: string;
  /** The permissions that the platform asks for the section. */
  readonly permissions: readonly FunctionalPermission[];
}

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
  /** The sections of the application. */
  readonly sections: readonly ApplicationSection[];
}

/**
 * APPLICATION_CATALOG is the list of applications of the platform.
 *
 * The applications that are already available come first, so the switcher
 * offers them at the top. The applications that are still coming stay in
 * their own group, separated by a divider, because they cannot be opened.
 *
 * The catalog is also the map of the platform: the sections and the
 * permissions that each one needs are declared here once, so the navigation
 * and the routes of the application cannot drift apart.
 */
export const APPLICATION_CATALOG: readonly ApplicationDefinition[] = [
  {
    id: 'administration',
    label: 'Administración',
    icon: 'admin_panel_settings',
    path: '/users',
    status: 'active',
    dividerAfter: true,
    sections: [
      {
        label: 'Usuarios',
        icon: 'person',
        path: '/users',
        permissions: ['manageUsers', 'managePermissionsGroups'],
      },
      {
        label: 'Grupos',
        icon: 'groups',
        path: '/groups',
        permissions: ['managePermissionsGroups'],
      },
    ],
  },
  {
    id: 'human-resources',
    label: 'Recursos Humanos',
    icon: 'groups',
    path: '/employees',
    status: 'active',
    sections: [
      {
        label: 'Personal',
        icon: 'badge',
        path: '/employees',
        permissions: ['manageEmployees'],
      },
      {
        label: 'Certificados',
        icon: 'description',
        path: '/certificates',
        permissions: ['manageCertificates'],
      },
      {
        label: 'Catálogo',
        icon: 'list_alt',
        path: '/catalog',
        permissions: ['manageCatalog'],
      },
    ],
  },
  { id: 'logistics', label: 'Logística', icon: 'local_shipping', path: null, status: 'soon', sections: [] },
  { id: 'inventory', label: 'Inventario', icon: 'inventory_2', path: null, status: 'soon', sections: [] },
];
