import { inject, Injectable } from '@angular/core';
import {
  CreateGroupCommand,
  DeleteGroupCommand,
  ReorderGroupsCommand,
  UpdateGroupCommand,
  UpdateGroupValues,
} from '../commands/group-commands';
import { Group } from '../../domain/model/aggregates/group';
import { GroupValidationError } from '../../domain/model/errors/group-errors';
import { GroupGateway } from '../../infrastructure/gateways/group.gateway';
import { GroupColor } from '../../domain/model/value-objects/group-color';
import { GroupId } from '../../domain/model/value-objects/group-id';
import { GroupName } from '../../domain/model/value-objects/group-name';

/** CreateGroupCommandService validates and registers a group. */
@Injectable({ providedIn: 'root' })
export class CreateGroupCommandService {
  private readonly gateway = inject(GroupGateway);

  async execute(command: CreateGroupCommand): Promise<Group> {
    const name = GroupName.create(command.name);
    const color = GroupColor.create(command.color);
    return this.gateway.createGroup({ name, color });
  }
}

/** UpdateGroupCommandService validates and performs a partial group edit. */
@Injectable({ providedIn: 'root' })
export class UpdateGroupCommandService {
  private readonly gateway = inject(GroupGateway);

  async execute(command: UpdateGroupCommand): Promise<Group> {
    const id = GroupId.create(command.uuid);
    const name = command.name === undefined ? undefined : GroupName.create(command.name);
    const color = command.color === undefined ? undefined : GroupColor.create(command.color);
    const permissions = this.permissionChanges(command.permissions);
    if (name === undefined && color === undefined && permissions === undefined) {
      throw new GroupValidationError('group', 'Indica al menos un cambio para guardar el grupo.');
    }

    const values: UpdateGroupValues = {
      ...(name === undefined ? {} : { name }),
      ...(color === undefined ? {} : { color }),
      ...(permissions === undefined ? {} : { permissions }),
    };
    return this.gateway.updateGroup(id, values);
  }

  private permissionChanges(
    changes: UpdateGroupCommand['permissions'],
  ): UpdateGroupCommand['permissions'] | undefined {
    if (changes === undefined) {
      return undefined;
    }
    const changed = Object.fromEntries(
      Object.entries(changes).filter(([, value]) => value !== undefined),
    ) as NonNullable<UpdateGroupCommand['permissions']>;
    return Object.keys(changed).length === 0 ? undefined : changed;
  }
}

/** DeleteGroupCommandService requests the logical deletion of one group. */
@Injectable({ providedIn: 'root' })
export class DeleteGroupCommandService {
  private readonly gateway = inject(GroupGateway);

  async execute(command: DeleteGroupCommand): Promise<void> {
    await this.gateway.deleteGroup(GroupId.create(command.uuid));
  }
}

/** ReorderGroupsCommandService sends the whole hierarchy in priority order. */
@Injectable({ providedIn: 'root' })
export class ReorderGroupsCommandService {
  private readonly gateway = inject(GroupGateway);

  async execute(command: ReorderGroupsCommand): Promise<void> {
    await this.gateway.reorderGroups(command.groupIds.map((id) => GroupId.create(id)));
  }
}
