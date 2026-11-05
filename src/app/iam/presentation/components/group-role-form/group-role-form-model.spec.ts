import { describe, expect, it } from 'vitest';
import { Group } from '../../../domain/model/aggregates/group';
import {
  EFFECTIVE_PERMISSIONS,
  EffectivePermissions,
} from '../../../domain/model/value-objects/effective-permissions';
import { GroupColor } from '../../../domain/model/value-objects/group-color';
import { GroupId } from '../../../domain/model/value-objects/group-id';
import { GroupName } from '../../../domain/model/value-objects/group-name';
import { GroupPriority } from '../../../domain/model/value-objects/group-priority';
import { restoreGroupStatus } from '../../../domain/model/value-objects/group-status';
import {
  closedPermissionKeys,
  createGroupUpdateCommand,
  hasPendingGroupChanges,
  withoutUnauthorizedChanges,
} from './group-role-form-model';

const group = Group.restore({
  id: GroupId.restore('2f4b1c66-9b4a-4f2f-9c1e-6a1f2b3c4d5e'),
  name: GroupName.restore('Supervisión'),
  color: GroupColor.restore('#13579B'),
  priority: GroupPriority.restore(1),
  permissions: {
    manageEmployees: true,
    manageCatalog: false,
    manageCertificates: false,
    manageUsers: true,
    managePermissionsGroups: false,
    administrator: false,
  },
  status: restoreGroupStatus('active'),
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
});

const originalValues = {
  name: 'Supervisión',
  color: '#13579B',
  ...group.permissions,
};

describe('group role form model', () => {
  it('emits false for a permission switched off and omits unchanged fields', () => {
    const values = { ...originalValues, manageUsers: false };

    expect(createGroupUpdateCommand(group, values)).toEqual({
      uuid: group.id,
      permissions: { manageUsers: false },
    });
  });

  it('detects net changes and treats restored values as no pending change', () => {
    expect(hasPendingGroupChanges(group, originalValues)).toBe(false);
    expect(hasPendingGroupChanges(group, { ...originalValues, name: 'Control' })).toBe(true);
    expect(hasPendingGroupChanges(group, { ...originalValues, color: '#13579b' })).toBe(false);
  });

  it('closes the switches of the permissions that the member does not hold', () => {
    const actor: EffectivePermissions = {
      ...EFFECTIVE_PERMISSIONS,
      managePermissionsGroups: true,
      manageCatalog: true,
    };

    const locked = closedPermissionKeys(actor, false);

    expect(locked).toContain('manageUsers');
    expect(locked).toContain('manageEmployees');
    expect(locked).toContain('administrator');
    expect(locked).not.toContain('manageCatalog');
    expect(locked).not.toContain('managePermissionsGroups');
  });

  it('closes the switch of the administrator for the members that do not hold it', () => {
    const actor: EffectivePermissions = {
      ...EFFECTIVE_PERMISSIONS,
      managePermissionsGroups: true,
    };

    expect(closedPermissionKeys(actor, false)).toContain('administrator');
    expect(closedPermissionKeys({ ...actor, administrator: true }, false)).not.toContain(
      'administrator',
    );
  });

  it('closes the capabilities while the role grants the access to every resource', () => {
    const actor: EffectivePermissions = {
      ...EFFECTIVE_PERMISSIONS,
      administrator: true,
    };

    const locked = closedPermissionKeys(actor, true);

    expect(locked).toContain('manageCatalog');
    expect(locked).toContain('manageUsers');
    expect(locked).not.toContain('administrator');
  });

  it('leaves every switch open for the owner of the platform', () => {
    const actor: EffectivePermissions = { ...EFFECTIVE_PERMISSIONS, owner: true };

    expect(closedPermissionKeys(actor, false)).toEqual([]);
  });

  it('closes every switch while the form is busy', () => {
    const actor: EffectivePermissions = { ...EFFECTIVE_PERMISSIONS, owner: true };

    const closed = closedPermissionKeys(actor, false, true);

    expect(closed).toEqual([
      'manageEmployees',
      'manageCatalog',
      'manageCertificates',
      'manageUsers',
      'managePermissionsGroups',
      'administrator',
    ]);
  });

  it('descarta el cambio de un permiso que el miembro ya no tiene', () => {
    // El miembro apagó el permiso y cambió el nombre del rol; después
    // perdió el permiso mientras editaba.
    const actor: EffectivePermissions = {
      ...EFFECTIVE_PERMISSIONS,
      managePermissionsGroups: true,
    };
    const values = { ...originalValues, manageUsers: false, name: 'Control' };

    const permitted = withoutUnauthorizedChanges(group, values, actor);

    expect(permitted.manageUsers).toBe(group.permissions.manageUsers);
    expect(permitted.name).toBe('Control');
  });

  it('no manda a la plataforma un cambio que el miembro ya no puede hacer', () => {
    const actor: EffectivePermissions = {
      ...EFFECTIVE_PERMISSIONS,
      managePermissionsGroups: true,
    };
    const values = { ...originalValues, manageUsers: false, name: 'Control' };

    const command = createGroupUpdateCommand(
      group,
      withoutUnauthorizedChanges(group, values, actor),
    );

    // La plataforma rechazaría el cambio del permiso y el cambio del
    // nombre también, así que solo viaja el nombre.
    expect(command).toEqual({ uuid: group.id, name: 'Control' });
  });

  it('conserva el cambio de un permiso que el miembro todavía tiene', () => {
    const actor: EffectivePermissions = {
      ...EFFECTIVE_PERMISSIONS,
      managePermissionsGroups: true,
      manageUsers: true,
    };
    const values = { ...originalValues, manageUsers: false, name: 'Control' };

    const command = createGroupUpdateCommand(
      group,
      withoutUnauthorizedChanges(group, values, actor),
    );

    expect(command.permissions).toEqual({ manageUsers: false });
    expect(command.name).toBe('Control');
  });

  it('no confunde el acceso total del rol con la pérdida de autoridad', () => {
    // El miembro sigue teniendo el permiso: que el rol conceda el acceso
    // a cada recurso no le quita la autoridad sobre el permiso.
    const actor: EffectivePermissions = {
      ...EFFECTIVE_PERMISSIONS,
      administrator: true,
    };
    const values = { ...originalValues, manageUsers: false, name: 'Control' };

    const permitted = withoutUnauthorizedChanges(group, values, actor);

    expect(permitted.manageUsers).toBe(false);
  });

  it('descarta el cambio del acceso total cuando el miembro no lo tiene', () => {
    const actor: EffectivePermissions = {
      ...EFFECTIVE_PERMISSIONS,
      managePermissionsGroups: true,
    };
    const values = { ...originalValues, administrator: true, name: 'Control' };

    const permitted = withoutUnauthorizedChanges(group, values, actor);

    expect(permitted.administrator).toBe(group.permissions.administrator);
    expect(permitted.name).toBe('Control');
  });

  it('sigue habiendo cambios pendientes cuando solo cambia el nombre', () => {
    const actor: EffectivePermissions = {
      ...EFFECTIVE_PERMISSIONS,
      managePermissionsGroups: true,
    };
    const values = { ...originalValues, manageUsers: false, name: 'Control' };

    const permitted = withoutUnauthorizedChanges(group, values, actor);

    expect(hasPendingGroupChanges(group, permitted)).toBe(true);
  });
});
