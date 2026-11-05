/** The seven independently stored permissions of a group. */
export interface GroupPermissions {
  readonly manageEmployees: boolean;
  readonly manageAssignments: boolean;
  readonly manageCatalog: boolean;
  readonly manageCertificates: boolean;
  readonly manageUsers: boolean;
  readonly managePermissionsGroups: boolean;
  readonly administrator: boolean;
}

/** The permission fields in the order used by the group editor. */
export const GROUP_PERMISSION_KEYS = [
  'manageEmployees',
  'manageAssignments',
  'manageCatalog',
  'manageCertificates',
  'manageUsers',
  'managePermissionsGroups',
  'administrator',
] as const satisfies readonly (keyof GroupPermissions)[];

/** GroupPermissionKey names one of the stored group permissions. */
export type GroupPermissionKey = (typeof GROUP_PERMISSION_KEYS)[number];

/** restoreGroupPermissions copies the seven flags returned by the backend. */
export function restoreGroupPermissions(value: GroupPermissions): GroupPermissions {
  return {
    manageEmployees: value.manageEmployees,
    manageAssignments: value.manageAssignments,
    manageCatalog: value.manageCatalog,
    manageCertificates: value.manageCertificates,
    manageUsers: value.manageUsers,
    managePermissionsGroups: value.managePermissionsGroups,
    administrator: value.administrator,
  };
}
