import { GroupPermissions, GroupPermissionKey } from './group-permissions';

/**
 * FunctionalPermission is one of the five permissions that a group grants.
 *
 * The permission that administers the employees administers their
 * assignments as well: it is one permission, not two.
 *
 * The Administrator permission is not one of them: it is the permission that
 * grants every functional permission of the platform.
 */
export type FunctionalPermission = Exclude<keyof GroupPermissions, 'administrator'>;

/**
 * EffectivePermissions are the permissions that the platform grants to the
 * authenticated member.
 *
 * The permissions are the combination of the permissions of every group the
 * member belongs to, and the condition of the Owner of the platform, which
 * is not a permission of a group.
 */
export interface EffectivePermissions extends GroupPermissions {
  /** Whether the member is the Owner of the platform. */
  readonly owner: boolean;
}

/** EFFECTIVE_PERMISSIONS are the permissions of a member that holds nothing. */
export const EFFECTIVE_PERMISSIONS: EffectivePermissions = {
  manageEmployees: false,
  manageCatalog: false,
  manageCertificates: false,
  manageUsers: false,
  managePermissionsGroups: false,
  administrator: false,
  owner: false,
};

/**
 * restoreEffectivePermissions trusts the permissions that the platform
 * published.
 */
export function restoreEffectivePermissions(
  permissions: EffectivePermissions,
): EffectivePermissions {
  return { ...permissions };
}

/**
 * holdsPermission reports whether the member may do what the permission
 * grants.
 *
 * The Administrator permission grants every functional permission of the
 * platform, and the Owner of the platform holds every permission of it, so
 * neither of them needs the functional permission to be granted.
 */
export function holdsPermission(
  permissions: EffectivePermissions,
  permission: FunctionalPermission,
): boolean {
  if (permissions.owner || permissions.administrator) {
    return true;
  }
  return permissions[permission];
}

/**
 * holdsAnyPermission reports whether the member holds at least one of the
 * permissions.
 *
 * The routes that accept more than one permission are the ones that a
 * member may reach with any of them, the same way the platform grants
 * them.
 */
export function holdsAnyPermission(
  permissions: EffectivePermissions,
  required: readonly FunctionalPermission[],
): boolean {
  if (required.length === 0) {
    return true;
  }
  return required.some((permission) => holdsPermission(permissions, permission));
}

/**
 * mayEditPermission reports whether the member may enable or disable the
 * given permission of a group.
 *
 * A member may only enable or disable the permissions that they hold
 * themselves, so the permissions that they do not hold stay locked, whether
 * the group grants them or not.
 *
 * The Administrator permission is not a functional permission: the Owner and
 * the members that hold it are the only ones that may turn it on or off.
 */
export function mayEditPermission(
  permissions: EffectivePermissions,
  permission: GroupPermissionKey,
): boolean {
  if (permissions.owner) {
    return true;
  }
  if (permission === 'administrator') {
    return permissions.administrator;
  }
  return holdsPermission(permissions, permission);
}
