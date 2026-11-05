/**
 * The six independently stored permissions of a group.
 *
 * The permission that administers the employees administers their
 * assignments as well: it is one capability, so the group stores one
 * switch for it.
 */
export interface GroupPermissions {
  readonly manageEmployees: boolean;
  readonly manageCatalog: boolean;
  readonly manageCertificates: boolean;
  readonly manageUsers: boolean;
  readonly managePermissionsGroups: boolean;
  readonly administrator: boolean;
}

/** The permission fields in the order used by the group editor. */
export const GROUP_PERMISSION_KEYS = [
  'manageEmployees',
  'manageCatalog',
  'manageCertificates',
  'manageUsers',
  'managePermissionsGroups',
  'administrator',
] as const satisfies readonly (keyof GroupPermissions)[];

/** GroupPermissionKey names one of the stored group permissions. */
export type GroupPermissionKey = (typeof GROUP_PERMISSION_KEYS)[number];

/** restoreGroupPermissions copies the six flags returned by the backend. */
export function restoreGroupPermissions(value: GroupPermissions): GroupPermissions {
  return {
    manageEmployees: value.manageEmployees,
    manageCatalog: value.manageCatalog,
    manageCertificates: value.manageCertificates,
    manageUsers: value.manageUsers,
    managePermissionsGroups: value.managePermissionsGroups,
    administrator: value.administrator,
  };
}
