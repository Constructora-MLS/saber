import { GroupPermissionKey } from '../../../domain/model/value-objects/group-permissions';

/** GroupPermissionOption gives a group permission its worker-facing label. */
export interface GroupPermissionOption {
  /** The stored permission that the option changes. */
  readonly key: GroupPermissionKey;
  /** The name that the worker reads. */
  readonly label: string;
  /** The consequence of granting the permission. */
  readonly description: string;
  /** The symbol that represents the permission. */
  readonly icon: string;
}

/**
 * FULL_ACCESS_PERMISSION is the advanced permission of the platform.
 *
 * The administrator is not a seventh functional permission: it is the
 * permission that grants access to every resource and every functionality,
 * so it is presented apart from the capabilities it makes unnecessary.
 */
export const FULL_ACCESS_PERMISSION: GroupPermissionOption = {
  key: 'administrator',
  label: 'Administrador',
  description: 'Acceso a todos los recursos y funcionalidades de la plataforma.',
  icon: 'shield',
};

/**
 * GROUP_CAPABILITY_PERMISSIONS are the capabilities that a group grants.
 *
 * The capabilities are independent from each other, so each one is offered
 * with its own consequence and its own symbol.
 */
export const GROUP_CAPABILITY_PERMISSIONS: readonly GroupPermissionOption[] = [
  {
    key: 'manageEmployees',
    label: 'Administrar personal',
    description: 'Gestionar los registros de personal.',
    icon: 'badge',
  },
  {
    key: 'manageAssignments',
    label: 'Administrar asignaciones',
    description: 'Gestionar las asignaciones de trabajo.',
    icon: 'assignment',
  },
  {
    key: 'manageCatalog',
    label: 'Administrar catálogos',
    description: 'Gestionar los catálogos de la plataforma.',
    icon: 'inventory_2',
  },
  {
    key: 'manageCertificates',
    label: 'Administrar certificados',
    description: 'Gestionar los certificados de trabajo.',
    icon: 'workspace_premium',
  },
  {
    key: 'manageUsers',
    label: 'Administrar usuarios',
    description: 'Gestionar las invitaciones y las cuentas.',
    icon: 'manage_accounts',
  },
  {
    key: 'managePermissionsGroups',
    label: 'Administrar permisos y grupos',
    description: 'Gestionar grupos, permisos y membresías.',
    icon: 'admin_panel_settings',
  },
];
