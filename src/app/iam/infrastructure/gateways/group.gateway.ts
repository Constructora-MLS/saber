import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, firstValueFrom, throwError } from 'rxjs';
import { API_BASE_URL } from '../../../api.config';
import { CreateGroupValues, UpdateGroupValues } from '../../application/commands/group-commands';
import { Group } from '../../domain/model/aggregates/group';
import { GroupId } from '../../domain/model/value-objects/group-id';
import { GroupColor } from '../../domain/model/value-objects/group-color';
import { GroupName } from '../../domain/model/value-objects/group-name';
import { GroupPriority } from '../../domain/model/value-objects/group-priority';
import { GroupMember } from '../../domain/model/value-objects/group-member';
import { restoreGroupStatus } from '../../domain/model/value-objects/group-status';
import { restoreEmail } from '../../domain/model/value-objects/email';
import { UserId } from '../../domain/model/value-objects/user-id';
import {
  GroupCriteria,
  GroupMemberPage,
  GroupPage,
} from '../../application/queries/group-queries';
import {
  CreateGroupRequestResource,
  GroupMemberPageResource,
  GroupMemberResource,
  GroupOrderRequestResource,
  GroupPageResource,
  GroupPermissionsResource,
  GroupResource,
  UpdateGroupRequestResource,
} from '../contracts/group.contract';
import { toGroupApiError } from '../errors/group-api.error';

/** GroupGateway translates the published IAM group contract into the domain. */
@Injectable({ providedIn: 'root' })
export class GroupGateway {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /** listGroups reads one page of the hierarchy. */
  async listGroups(criteria: GroupCriteria): Promise<GroupPage<Group>> {
    const params = this.params(criteria);
    const page = await firstValueFrom(
      this.http
        .get<GroupPageResource>(`${this.baseUrl}/groups`, { params })
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );
    return {
      items: page.items.map((item) => this.toGroup(item)),
      page: page.page,
      totalPages: page.totalPages,
      total: page.total,
    };
  }

  /** createGroup registers a group at the bottom of the hierarchy. */
  async createGroup(values: CreateGroupValues): Promise<Group> {
    const request: CreateGroupRequestResource = {
      name: values.name,
      color: values.color,
    };
    const group = await firstValueFrom(
      this.http
        .post<GroupResource>(`${this.baseUrl}/groups`, request)
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );
    return this.toGroup(group);
  }

  /** getGroup reads the editable details of one group. */
  async getGroup(id: GroupId): Promise<Group> {
    const group = await firstValueFrom(
      this.http
        .get<GroupResource>(`${this.baseUrl}/groups/${id}`)
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );
    return this.toGroup(group);
  }

  /** updateGroup sends only supplied, validated changes in the flat PATCH body. */
  async updateGroup(id: GroupId, changes: UpdateGroupValues): Promise<Group> {
    const request: UpdateGroupRequestResource = {
      ...(changes.name === undefined ? {} : { name: changes.name }),
      ...(changes.color === undefined ? {} : { color: changes.color }),
      ...this.permissionRequest(changes.permissions),
    };
    const group = await firstValueFrom(
      this.http
        .patch<GroupResource>(`${this.baseUrl}/groups/${id}`, request)
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );
    return this.toGroup(group);
  }

  /** deleteGroup asks the platform to logically delete one group. */
  async deleteGroup(id: GroupId): Promise<void> {
    await firstValueFrom(
      this.http
        .delete<void>(`${this.baseUrl}/groups/${id}`)
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );
  }

  /** reorderGroups sends all group IDs from highest to lowest priority. */
  async reorderGroups(ids: readonly GroupId[]): Promise<void> {
    const request: GroupOrderRequestResource = { groupIds: ids.map((id) => id) };
    await firstValueFrom(
      this.http
        .put<void>(`${this.baseUrl}/groups/order`, request)
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );
  }

  /** listGroupMembers reads one page of the accounts that belong to a role. */
  async listGroupMembers(
    id: GroupId,
    criteria: { readonly limit?: number; readonly page?: number },
  ): Promise<GroupMemberPage> {
    let params = new HttpParams()
      .set('limit', criteria.limit ?? 50)
      .set('page', criteria.page ?? 1);
    const page = await firstValueFrom(
      this.http
        .get<GroupMemberPageResource>(`${this.baseUrl}/groups/${id}/users`, { params })
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );
    return {
      items: page.items.map((item) => this.toMember(item)),
      page: page.page,
      totalPages: page.totalPages,
      total: page.total,
    };
  }

  /** assignGroupMember adds an account to a role. */
  async assignGroupMember(userId: UserId, groupId: GroupId): Promise<void> {
    await firstValueFrom(
      this.http
        .put<void>(`${this.baseUrl}/users/${userId.value}/groups/${groupId}`, null)
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );
  }

  /** removeGroupMember takes an account out of a role. */
  async removeGroupMember(userId: UserId, groupId: GroupId): Promise<void> {
    await firstValueFrom(
      this.http
        .delete<void>(`${this.baseUrl}/users/${userId.value}/groups/${groupId}`)
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );
  }

  private params(criteria: GroupCriteria): HttpParams {
    let params = new HttpParams()
      .set('limit', criteria.limit ?? 100)
      .set('page', criteria.page ?? 1);
    if (criteria.search !== undefined) {
      params = params.set('search', criteria.search);
    }
    return params;
  }

  private permissionRequest(
    permissions: UpdateGroupValues['permissions'],
  ): UpdateGroupRequestResource {
    if (permissions === undefined) {
      return {};
    }
    return {
      ...(permissions.manageEmployees === undefined
        ? {}
        : { manageEmployees: permissions.manageEmployees }),
      ...(permissions.manageAssignments === undefined
        ? {}
        : { manageAssignments: permissions.manageAssignments }),
      ...(permissions.manageCatalog === undefined
        ? {}
        : { manageCatalog: permissions.manageCatalog }),
      ...(permissions.manageCertificates === undefined
        ? {}
        : { manageCertificates: permissions.manageCertificates }),
      ...(permissions.manageUsers === undefined ? {} : { manageUsers: permissions.manageUsers }),
      ...(permissions.managePermissionsGroups === undefined
        ? {}
        : { managePermissionsGroups: permissions.managePermissionsGroups }),
      ...(permissions.administrator === undefined
        ? {}
        : { administrator: permissions.administrator }),
    };
  }

  private toGroup(resource: GroupResource): Group {    return Group.restore({
      id: GroupId.restore(resource.uuid),
      name: GroupName.restore(resource.name),
      color: GroupColor.restore(resource.color),
      priority: GroupPriority.restore(resource.priority),
      permissions: this.permissions(resource.permissions),
      status: restoreGroupStatus(resource.status),
      createdAt: resource.createdAt,
      updatedAt: resource.updatedAt,
    });
  }

  private toMember(resource: GroupMemberResource): GroupMember {
    return GroupMember.restore({
      id: UserId.restore(resource.uuid),
      email: restoreEmail(resource.email),
      firstName: resource.firstName,
      lastName: resource.lastName,
      userType: resource.userType,
    });
  }

  private permissions(resource: GroupPermissionsResource) {
    return {
      manageEmployees: resource.manageEmployees,
      manageAssignments: resource.manageAssignments,
      manageCatalog: resource.manageCatalog,
      manageCertificates: resource.manageCertificates,
      manageUsers: resource.manageUsers,
      managePermissionsGroups: resource.managePermissionsGroups,
      administrator: resource.administrator,
    };
  }

  private toFailure(error: HttpErrorResponse) {
    return throwError(() => toGroupApiError(error.status, error.error));
  }
}
