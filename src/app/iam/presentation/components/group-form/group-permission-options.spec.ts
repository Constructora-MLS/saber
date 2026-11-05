import { describe, expect, it } from 'vitest';
import {
  GROUP_CAPABILITY_PERMISSIONS,
  GROUP_PERMISSION_OPTIONS,
} from './group-permission-options';

describe('the permissions that the group editor offers', () => {
  it('offers a single switch for the personnel and its assignments', () => {
    const personnel = GROUP_PERMISSION_OPTIONS.filter((option) =>
      ['Gestionar personal', 'Asignar personal'].includes(option.label),
    );

    expect(personnel).toHaveLength(1);
    expect(personnel[0]?.key).toBe('manageEmployees');
    expect(personnel[0]?.label).toBe('Gestionar personal');
    expect(personnel[0]?.description).toContain('asignaciones');
  });

  it('does not offer a switch that administers the assignments apart', () => {
    const keys = GROUP_PERMISSION_OPTIONS.map((option) => option.key);

    expect(keys).not.toContain('manageAssignments');
  });

  it('keeps the catalog, the certificates, the users and the groups independent', () => {
    const keys = GROUP_CAPABILITY_PERMISSIONS.map((option) => option.key);

    expect(keys).toEqual([
      'manageEmployees',
      'manageCatalog',
      'manageCertificates',
      'manageUsers',
      'managePermissionsGroups',
    ]);
  });
});
