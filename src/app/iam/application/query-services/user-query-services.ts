// Package queryservices holds the query services of the IAM bounded context.
// package queryservices

import { inject, Injectable } from '@angular/core';
import { normalizeUserSearch } from '../queries/user-search';
import {
  GetInvitationQuery,
  ListUsersQuery,
  UserCriteria,
  UserPage,
} from '../queries/user-queries';
import { PlatformUser } from '../../domain/model/aggregates/platform-user';
import { UserGateway } from '../../infrastructure/gateways/user.gateway';

/**
 * ListUsersQueryService reads the accounts of the platform.
 */
@Injectable({ providedIn: 'root' })
export class ListUsersQueryService {
  private readonly gateway = inject(UserGateway);

  async execute(query: ListUsersQuery): Promise<UserPage<PlatformUser>> {
    return this.gateway.listUsers(this.criteria(query));
  }

  private criteria(query: ListUsersQuery): UserCriteria {
    return {
      search: normalizeUserSearch(query.search),
      status: query.status,
      limit: query.limit,
      page: query.page,
    };
  }
}

/**
 * GetInvitationQueryService reads the address that an invitation bound.
 */
@Injectable({ providedIn: 'root' })
export class GetInvitationQueryService {
  private readonly gateway = inject(UserGateway);

  async execute(query: GetInvitationQuery): Promise<string> {
    return this.gateway.getInvitation(query.token);
  }
}
