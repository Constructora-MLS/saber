import { GroupPermissionKey } from '../../../domain/model/value-objects/group-permissions';

/** GroupPermissionOption gives a group permission its worker-facing label. */
export interface GroupPermissionOption {
  /** The stored permission that the option changes. */
  readonly key: GroupPermissionKey;
  /** The name that the worker reads. */
  readonly label: string;
  /** The consequence of granting the permission. */
  readonly description: string;
}

/**
 * GROUP_CAPABILITY_PERMISSIONS are the capabilities that a group grants.
 *
 * The capabilities are independent from each other, so each one is offered
 * with its own consequence.
 *
 * The personal and its assignments are one capability: the switch of the
 * personal administers the two, so there is only one switch for them.
 */
export const GROUP_CAPABILITY_PERMISSIONS: readonly GroupPermissionOption[] = [
  {
    key: 'manageEmployees',
    label: 'Gestionar personal',
    description: 'Registra y edita los datos del personal y sus asignaciones.',
  },
  {
    key: 'manageCatalog',
    label: 'Gestionar catálogos',
    description: 'Mantén los catálogos de regímenes, posiciones y servicios.',
  },
  {
    key: 'manageCertificates',
    label: 'Emitir certificados',
    description: 'Genera y anula los certificados de trabajo.',
  },
  {
    key: 'manageUsers',
    label: 'Gestionar usuarios',
    description: 'Invita a las personas y administra sus cuentas.',
  },
  {
    key: 'managePermissionsGroups',
    label: 'Gestionar permisos',
    description: 'Crea los roles y concede sus permisos.',
  },
];

/**
 * FULL_ACCESS_PERMISSION is the advanced permission of the platform.
 *
 * The administrator is not a sixth capability: it is the permission that
 * grants access to every resource and every functionality, so it closes the
 * list of the permissions of the role.
 */
export const FULL_ACCESS_PERMISSION: GroupPermissionOption = {
  key: 'administrator',
  label: 'Administrador',
  description: 'Acceso a todos los recursos y funcionalidades de la plataforma.',
};

/** GROUP_PERMISSION_OPTIONS are all the permissions of a role, in order. */
export const GROUP_PERMISSION_OPTIONS: readonly GroupPermissionOption[] = [
  ...GROUP_CAPABILITY_PERMISSIONS,
  FULL_ACCESS_PERMISSION,
];
