import { describe, expect, it } from 'vitest';
import {
  EFFECTIVE_PERMISSIONS,
  restoreEffectivePermissions,
} from '../../../iam/domain/model/value-objects/effective-permissions';
import { firstAccessibleRoute, hasAnyAccess } from './first-accessible-route';

describe('the first accessible route', () => {
  it('opens the first section that the permissions of the member grant', () => {
    const permissions = restoreEffectivePermissions({
      ...EFFECTIVE_PERMISSIONS,
      manageCertificates: true,
    });

    expect(firstAccessibleRoute(permissions)).toBe('/certificates');
  });

  it('opens the users when the member administers the users', () => {
    const permissions = restoreEffectivePermissions({
      ...EFFECTIVE_PERMISSIONS,
      manageUsers: true,
    });

    expect(firstAccessibleRoute(permissions)).toBe('/users');
  });

  it('opens the users when the member only administers the groups', () => {
    const permissions = restoreEffectivePermissions({
      ...EFFECTIVE_PERMISSIONS,
      managePermissionsGroups: true,
    });

    expect(firstAccessibleRoute(permissions)).toBe('/users');
  });

  it('opens the employees when the member only administers the personal', () => {
    const permissions = restoreEffectivePermissions({
      ...EFFECTIVE_PERMISSIONS,
      manageEmployees: true,
    });

    expect(firstAccessibleRoute(permissions)).toBe('/employees');
  });

  it('has no route for a member that the platform grants nothing', () => {
    expect(firstAccessibleRoute(EFFECTIVE_PERMISSIONS)).toBeNull();
    expect(hasAnyAccess(EFFECTIVE_PERMISSIONS)).toBe(false);
  });

  it('opens the users for the owner of the platform', () => {
    const permissions = restoreEffectivePermissions({
      ...EFFECTIVE_PERMISSIONS,
      owner: true,
    });

    expect(firstAccessibleRoute(permissions)).toBe('/users');
    expect(hasAnyAccess(permissions)).toBe(true);
  });
});
