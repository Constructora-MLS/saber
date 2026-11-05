import { GroupColor } from '../value-objects/group-color';
import { GroupId } from '../value-objects/group-id';
import { GroupName } from '../value-objects/group-name';
import { GroupPermissions, restoreGroupPermissions } from '../value-objects/group-permissions';
import { GroupPriority } from '../value-objects/group-priority';
import { GroupStatus } from '../value-objects/group-status';

/** GroupState is the persisted state restored at the API boundary. */
export interface GroupState {
  readonly id: GroupId;
  readonly name: GroupName;
  readonly color: GroupColor;
  readonly priority: GroupPriority;
  readonly permissions: GroupPermissions;
  readonly status: GroupStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Group is the read aggregate of an IAM group and its place in the hierarchy.
 */
export class Group {
  private constructor(
    readonly id: GroupId,
    readonly name: GroupName,
    readonly color: GroupColor,
    readonly priority: GroupPriority,
    readonly permissions: GroupPermissions,
    readonly status: GroupStatus,
    readonly createdAt: string,
    readonly updatedAt: string,
  ) {}

  /** restore rebuilds a group from the state published by the platform. */
  static restore(state: GroupState): Group {
    return new Group(
      state.id,
      state.name,
      state.color,
      state.priority,
      restoreGroupPermissions(state.permissions),
      state.status,
      state.createdAt,
      state.updatedAt,
    );
  }

  /** withPriority returns a copy carrying the supplied hierarchy position. */
  withPriority(priority: GroupPriority): Group {
    return Group.restore({ ...this, priority });
  }
}
