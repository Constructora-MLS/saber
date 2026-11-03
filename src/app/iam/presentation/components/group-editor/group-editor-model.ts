import { UpdateGroupCommand } from '../../../application/commands/group-commands';
import { Group } from '../../../domain/model/aggregates/group';
import {
  GROUP_PERMISSION_KEYS,
  GroupPermissionKey,
  GroupPermissions,
} from '../../../domain/model/value-objects/group-permissions';

/** GroupEditorValues are the current editable values of the form. */
export interface GroupEditorValues extends GroupPermissions {
  readonly name: string;
  readonly color: string;
}

/** hasPendingGroupChanges compares the form with its persisted group state. */
export function hasPendingGroupChanges(group: Group, values: GroupEditorValues): boolean {
  return (
    values.name !== group.name ||
    values.color.toUpperCase() !== group.color.toUpperCase() ||
    GROUP_PERMISSION_KEYS.some((key) => values[key] !== group.permissions[key])
  );
}

/** createGroupUpdateCommand emits only changed fields, retaining explicit false values. */
export function createGroupUpdateCommand(
  group: Group,
  values: GroupEditorValues,
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
