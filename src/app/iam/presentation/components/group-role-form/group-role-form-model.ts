import { UpdateGroupCommand } from '../../../application/commands/group-commands';
import { Group } from '../../../domain/model/aggregates/group';
import {
  EffectivePermissions,
  mayEditPermission,
} from '../../../domain/model/value-objects/effective-permissions';
import {
  GROUP_PERMISSION_KEYS,
  GroupPermissionKey,
  GroupPermissions,
} from '../../../domain/model/value-objects/group-permissions';
import { GROUP_CAPABILITY_PERMISSIONS } from '../group-form/group-permission-options';

/** GroupRoleFormValues are the current editable values of the form. */
export interface GroupRoleFormValues extends GroupPermissions {
  readonly name: string;
  readonly color: string;
}
/** hasPendingGroupChanges compares the form with its persisted group state. */
export function hasPendingGroupChanges(group: Group, values: GroupRoleFormValues): boolean {
  return (
    values.name !== group.name ||
    values.color.toUpperCase() !== group.color.toUpperCase() ||
    GROUP_PERMISSION_KEYS.some((key) => values[key] !== group.permissions[key])
  );
}

/** createGroupUpdateCommand emits only changed fields, retaining explicit false values. */
export function createGroupUpdateCommand(
  group: Group,
  values: GroupRoleFormValues,
): UpdateGroupCommand {
  const permissions: { -readonly [Key in GroupPermissionKey]?: boolean } = {};
  for (const key of GROUP_PERMISSION_KEYS) {
    if (values[key] !== group.permissions[key]) {
      permissions[key] = values[key];
    }
  }
  return {
    uuid: group.id,
    ...(values.name === group.name ? {} : { name: values.name }),
    ...(values.color.toUpperCase() === group.color.toUpperCase() ? {} : { color: values.color }),
    ...(Object.keys(permissions).length === 0 ? {} : { permissions }),
  };
}

/**
 * withoutUnauthorizedChanges returns the values of the form without the
 * changes of the permissions that the member may not make.
 *
 * A member may only enable or disable the permissions that they hold
 * themselves. A change of a permission that the member lost while they were
 * editing is taken back, so the command that the platform receives never
 * carries it and the change that the member is allowed to make survives.
 *
 * The values of the role are the source of truth for a permission that the
 * member does not hold: the switch returns to the value that the platform
 * published.
 */
export function withoutUnauthorizedChanges(
  group: Group,
  values: GroupRoleFormValues,
  actor: EffectivePermissions,
): GroupRoleFormValues {
  const restored: { -readonly [Key in GroupPermissionKey]?: boolean } = {};
  for (const key of GROUP_PERMISSION_KEYS) {
    if (!mayEditPermission(actor, key) && values[key] !== group.permissions[key]) {
      restored[key] = group.permissions[key];
    }
  }

  return { ...values, ...restored };
}

/**
 * closedPermissionKeys returns the permissions whose switch is closed for
 * the member that edits the role.
 *
 * While the form is busy every switch is closed: a change that is in flight
 * must not open a switch that the member may not change.
 *
 * A member may only enable or disable the permissions that they hold
 * themselves, so the switches of the permissions that they do not hold are
 * closed, whether the role grants them or not.
 *
 * The capabilities are closed too while the role grants the access to every
 * resource: the administrator already grants every capability, so they are
 * not edited apart. The switch of the administrator itself stays open when
 * the member may change it.
 */
export function closedPermissionKeys(
  actor: EffectivePermissions,
  administrator: boolean,
  busy = false,
): readonly GroupPermissionKey[] {
  if (busy) {
    return GROUP_PERMISSION_KEYS;
  }

  const capabilities = new Set(GROUP_CAPABILITY_PERMISSIONS.map((option) => option.key));

  return GROUP_PERMISSION_KEYS.filter(
    (key) => !mayEditPermission(actor, key) || (administrator && capabilities.has(key)),
  );
}
