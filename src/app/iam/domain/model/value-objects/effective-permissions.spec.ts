import { describe, expect, it } from 'vitest';
import {
  EFFECTIVE_PERMISSIONS,
  holdsAnyPermission,
  holdsPermission,
  restoreEffectivePermissions,
} from './effective-permissions';

const administrator = restoreEffectivePermissions({
  ...EFFECTIVE_PERMISSIONS,
  administrator: true,
});

const owner = restoreEffectivePermissions({
  ...EFFECTIVE_PERMISSIONS,
  owner: true,
});

describe('effective permissions', () => {
  it('grants only the permission that the member holds', () => {
    const permissions = restoreEffectivePermissions({
      ...EFFECTIVE_PERMISSIONS,
      manageEmployees: true,
    });

    expect(holdsPermission(permissions, 'manageEmployees')).toBe(true);
    expect(holdsPermission(permissions, 'manageCatalog')).toBe(false);
  });

  it('grants every functional permission to the administrator', () => {
    expect(holdsPermission(administrator, 'manageEmployees')).toBe(true);
    expect(holdsPermission(administrator, 'manageCatalog')).toBe(true);
    expect(holdsPermission(administrator, 'managePermissionsGroups')).toBe(true);
  });

  it('grants every functional permission to the owner of the platform', () => {
    expect(holdsPermission(owner, 'manageEmployees')).toBe(true);
    expect(holdsPermission(owner, 'manageUsers')).toBe(true);
  });

  it('grants a route that accepts several permissions with any of them', () => {
    const permissions = restoreEffectivePermissions({
      ...EFFECTIVE_PERMISSIONS,
      manageUsers: true,
    });

    expect(holdsAnyPermission(permissions, ['manageUsers', 'managePermissionsGroups'])).toBe(true);
    expect(holdsAnyPermission(permissions, ['manageCatalog'])).toBe(false);
    expect(holdsAnyPermission(permissions, [])).toBe(true);
  });
});
