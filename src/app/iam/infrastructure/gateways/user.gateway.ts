// Package gateways holds the communication boundary with the IAM API.
// package gateways

import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, firstValueFrom, throwError } from 'rxjs';
import { API_BASE_URL } from '../../../api.config';
import { InvitationCreated } from '../../application/commands/user-commands';
import { UserCriteria, UserPage } from '../../application/queries/user-queries';
import { PlatformUser } from '../../domain/model/aggregates/platform-user';
import { Email, restoreEmail } from '../../domain/model/value-objects/email';
import { UserId } from '../../domain/model/value-objects/user-id';
import { UserStatus } from '../../domain/model/value-objects/user-status';
import {
  InvitationCreatedResource,
  InviteUserRequestResource,
  UserListItemResource,
  UserPageResource,
  UserStatusResource,
} from '../contracts/user.contract';
import { toUserApiError } from '../errors/user-api.error';

/**
 * UserGateway is the communication boundary with the accounts of the
 * platform.
 *
 * The gateway speaks the published contract of the API and it hands the
 * domain the accounts of the platform. It never decides anything.
 */
@Injectable({ providedIn: 'root' })
export class UserGateway {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /**
   * listUsers reads a page of the accounts of the platform.
   */
  async listUsers(criteria: UserCriteria): Promise<UserPage<PlatformUser>> {
    const page = await firstValueFrom(
      this.http
        .get<UserPageResource>(`${this.baseUrl}/users`, { params: this.params(criteria) })
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );

    return {
      items: page.items.map((item) => this.toUser(item)),
      page: page.page,
      totalPages: page.totalPages,
      total: page.total,
    };
  }

  /**
   * inviteUser sends the invitation of a member of the platform.
   *
   * The answer never carries the credential of the invitation: it only
   * reaches the invited member through the email.
   */
  async inviteUser(email: Email): Promise<InvitationCreated> {
    const request: InviteUserRequestResource = { email };

    const created = await firstValueFrom(
      this.http
        .post<InvitationCreatedResource>(`${this.baseUrl}/users/invitations`, request)
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );

    return { email: created.email, expiresIn: created.expiresIn };
  }

  /**
   * disableUser logically deletes an account and closes its sessions.
   */
  async disableUser(id: UserId): Promise<void> {
    await firstValueFrom(
      this.http
        .delete<void>(`${this.baseUrl}/users/${id.value}`)
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );
  }

  private params(criteria: UserCriteria): HttpParams {
    let params = new HttpParams();
    if (criteria.search) {
      params = params.set('search', criteria.search);
    }
    if (criteria.status) {
      params = params.set('status', criteria.status);
    }
    if (criteria.limit) {
      params = params.set('limit', criteria.limit);
    }
    if (criteria.page) {
      params = params.set('page', String(criteria.page));
    }
    return params;
  }

  private toUser(resource: UserListItemResource): PlatformUser {
    return PlatformUser.restore(
      UserId.restore(resource.uuid),
      restoreEmail(resource.email),
      resource.firstName,
      resource.lastName,
      this.status(resource.status),
    );
  }

  private status(raw: UserStatusResource): UserStatus {
    return raw === 'active' ? 'active' : 'pending';
  }

  private toFailure(error: HttpErrorResponse) {
    return throwError(() => toUserApiError(error.status, error.error));
  }
}

export { UserGateway as UserHttpGateway };
