import { GroupColor } from '../../domain/model/value-objects/group-color';
import { GroupName } from '../../domain/model/value-objects/group-name';
import { GroupPermissions } from '../../domain/model/value-objects/group-permissions';

/** CreateGroupCommand asks to register a group at the bottom of the hierarchy. */
export interface CreateGroupCommand {
  /** The name of the group. */
  readonly name: string;
  /** The hexadecimal color used to identify the group. */
  readonly color: string;
}

/** CreateGroupValues carries the validated values accepted by the API. */
export interface CreateGroupValues {
  /** The validated name of the group. */
  readonly name: GroupName;
  /** The validated hexadecimal group color. */
  readonly color: GroupColor;
}

/** UpdateGroupCommand asks to change only the supplied group fields. */
export interface UpdateGroupCommand {
  /** The identifier of the group to change. */
  readonly uuid: string;
  /** The new group name, when it changed. */
  readonly name?: string;
  /** The new group color, when it changed. */
  readonly color?: string;
  /** The permission flags that changed; false is an explicit value. */
  readonly permissions?: Partial<GroupPermissions>;
}

/** UpdateGroupValues carries domain-validated values to the API gateway. */
export interface UpdateGroupValues {
  /** The validated name, when it changed. */
  readonly name?: GroupName;
  /** The validated color, when it changed. */
  readonly color?: GroupColor;
  /** The permission flags that changed; false is an explicit value. */
  readonly permissions?: Partial<GroupPermissions>;
}

/** DeleteGroupCommand asks to logically delete one group. */
export interface DeleteGroupCommand {
  /** The identifier of the group to delete. */
  readonly uuid: string;
}

/** AssignGroupMemberCommand asks to add an account to a role. */
export interface AssignGroupMemberCommand {
  /** The identifier of the account that joins the role. */
  readonly userId: string;
  /** The identifier of the role that receives the account. */
  readonly groupId: string;
}

/** RemoveGroupMemberCommand asks to take an account out of a role. */
export interface RemoveGroupMemberCommand {
  /** The identifier of the account that leaves the role. */
  readonly userId: string;
  /** The identifier of the role that loses the account. */
  readonly groupId: string;
}

/** ReorderGroupsCommand asks to rewrite the entire hierarchy. */
export interface ReorderGroupsCommand {
  /** Every active group identifier, from highest to lowest priority. */
  readonly groupIds: readonly string[];
}
