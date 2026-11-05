import { inject, Injectable } from '@angular/core';
import { Group } from '../../domain/model/aggregates/group';
import { GroupId } from '../../domain/model/value-objects/group-id';
import { GroupGateway } from '../../infrastructure/gateways/group.gateway';
import {
  GetGroupQuery,
  GroupCriteria,
  GroupMemberPage,
  GroupPage,
  ListGroupMembersQuery,
  ListGroupsQuery,
} from '../queries/group-queries';

/** ListGroupsQueryService reads a page of the active group hierarchy. */
@Injectable({ providedIn: 'root' })
export class ListGroupsQueryService {
  private readonly gateway = inject(GroupGateway);

  async execute(query: ListGroupsQuery = {}): Promise<GroupPage<Group>> {
    const search = query.search?.trim();
    const criteria: GroupCriteria = {
      ...(search ? { search } : {}),
      limit: query.limit,
      page: query.page,
    };
    return this.gateway.listGroups(criteria);
  }
}

/** GetGroupQueryService reads the full details of one group. */
@Injectable({ providedIn: 'root' })
export class GetGroupQueryService {
  private readonly gateway = inject(GroupGateway);

  async execute(query: GetGroupQuery): Promise<Group> {
    return this.gateway.getGroup(GroupId.create(query.uuid));
  }
}

/** ListGroupMembersQueryService reads a page of the members of one role. */
@Injectable({ providedIn: 'root' })
export class ListGroupMembersQueryService {
  private readonly gateway = inject(GroupGateway);

  async execute(query: ListGroupMembersQuery): Promise<GroupMemberPage> {
    return this.gateway.listGroupMembers(GroupId.create(query.uuid), {
      limit: query.limit,
      page: query.page,
    });
  }
}
