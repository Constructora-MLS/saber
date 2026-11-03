import { describe, expect, it } from 'vitest';
import { Group } from '../../../domain/model/aggregates/group';
import { GroupColor } from '../../../domain/model/value-objects/group-color';
import { GroupId } from '../../../domain/model/value-objects/group-id';
import { GroupName } from '../../../domain/model/value-objects/group-name';
import { GroupPriority } from '../../../domain/model/value-objects/group-priority';
import { restoreGroupStatus } from '../../../domain/model/value-objects/group-status';
import { createGroupUpdateCommand, hasPendingGroupChanges } from './group-role-form-model';

const group = Group.restore({
  id: GroupId.restore('2f4b1c66-9b4a-4f2f-9c1e-6a1f2b3c4d5e'),
  name: GroupName.restore('Supervisión'),
  color: GroupColor.restore('#13579B'),
  priority: GroupPriority.restore(1),
  permissions: {
    manageEmployees: true,
    manageAssignments: false,
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
});
