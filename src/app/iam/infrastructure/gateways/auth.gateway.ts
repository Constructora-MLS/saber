// Package gateways holds the communication boundary with the IAM API.
// package gateways

import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, firstValueFrom, throwError } from 'rxjs';
import { API_BASE_URL } from '../../../api.config';
import { AuthSession, AuthenticatedAccount } from '../../application/session/auth-session';
import { AuthIdentity, restoreAuthIdentity } from '../../domain/model/value-objects/auth-identity';
import {
  EffectivePermissions,
  restoreEffectivePermissions,
} from '../../domain/model/value-objects/effective-permissions';
import { Email } from '../../domain/model/value-objects/email';
import { Password } from '../../domain/model/value-objects/password';
import { RecoveryToken } from '../../domain/model/value-objects/recovery-token';
import {
  EffectivePermissionsResource,
  ForgotPasswordRequestResource,
  ForgotPasswordResponseResource,
  ResetPasswordRequestResource,
  TokenResponseResource,
  UserResource,
} from '../contracts/auth.contract';
import { toAuthApiError } from '../errors/auth-api.error';

/**
 * AuthGateway is the communication boundary with the IAM API.
 *
 * The refresh token never travels through the gateway: it lives in a cookie
 * that the browser sends alone, and the platform rotates it.
 */
@Injectable({ providedIn: 'root' })
export class AuthGateway {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /** signIn authenticates a user with an email address and a password. */
  async signIn(email: string, password: string): Promise<AuthSession> {
    const resource = await firstValueFrom(
      this.http
        .post<TokenResponseResource>(`${this.baseUrl}/auth/sign-in`, { email, password })
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );

    return this.toSession(resource);
  }

  /** refresh renews the session with the refresh token of the cookie. */
  async refresh(): Promise<AuthSession> {
    const resource = await firstValueFrom(
      this.http
        .post<TokenResponseResource>(`${this.baseUrl}/auth/refresh`, {})
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );

    return this.toSession(resource);
  }

  /**
   * verify answers the identity and the authority of the user of the access
   * token.
   *
   * The platform publishes the effective permissions of the member with the
   * identity, so the browser learns what it may do without asking for it on
   * every page.
   */
  async verify(): Promise<AuthenticatedAccount> {
    const resource = await firstValueFrom(
      this.http
        .get<UserResource>(`${this.baseUrl}/auth/verify`)
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );

    return {
      identity: restoreAuthIdentity(
        resource.uuid,
        resource.email,
        resource.firstName,
        resource.lastName,
      ),
      permissions: this.toPermissions(resource.permissions),
    };
  }

  /**
   * forgotPassword asks the platform for a link that recovers the password.
   *
   * The answer never says whether the account exists: the platform answers
   * the same for every address, so the body carries no information and the
   * gateway discards it.
   */
  async forgotPassword(email: Email): Promise<void> {
    const request: ForgotPasswordRequestResource = { email };

    await firstValueFrom(
      this.http
        .post<ForgotPasswordResponseResource>(`${this.baseUrl}/auth/forgot-password`, request)
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );
  }

  /**
   * resetPassword changes the password of an account with the credential of
   * a recovery link.
   *
   * The platform answers 204 without a body: the password was changed and
   * the sessions of the member were revoked.
   */
  async resetPassword(token: RecoveryToken, password: Password): Promise<void> {
    const request: ResetPasswordRequestResource = { token, password };

    await firstValueFrom(
      this.http
        .post<null>(`${this.baseUrl}/auth/reset-password`, request)
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );
  }

  /**
   * logout closes the session of the refresh token of the cookie.
   *
   * The platform answers 204 without a body: the session is gone and the
   * cookie is removed.
   */
  async logout(): Promise<void> {
    await firstValueFrom(
      this.http
        .post<null>(`${this.baseUrl}/auth/logout`, {})
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );
  }

  private toSession(resource: TokenResponseResource): AuthSession {
    return {
      accessToken: resource.accessToken,
      identity: restoreAuthIdentity(
        resource.user.uuid,
        resource.user.email,
        resource.user.firstName,
        resource.user.lastName,
      ),
      permissions: restoreEffectivePermissions({
        manageEmployees: false,
        manageCatalog: false,
        manageCertificates: false,
        manageUsers: false,
        managePermissionsGroups: false,
        administrator: false,
        owner: false,
      }),
    };
  }

  /**
   * toPermissions reads the effective permissions of the member.
   *
   * The platform publishes the permissions with the identity. A platform
   * that does not publish them grants nothing to the member, so the
   * browser reads them as absent instead of failing: the session opens and
   * the member reaches the page that tells him that he has no access.
   *
   * The deprecated alias of the permission of the employees is not read:
   * it always carries the value of the canonical name, so the browser
   * reads the one permission that administers the employees and their
   * assignments.
   */
  private toPermissions(resource: EffectivePermissionsResource | undefined): EffectivePermissions {
    return restoreEffectivePermissions({
      manageEmployees: resource?.manageEmployees ?? false,
      manageCatalog: resource?.manageCatalog ?? false,
      manageCertificates: resource?.manageCertificates ?? false,
      manageUsers: resource?.manageUsers ?? false,
      managePermissionsGroups: resource?.managePermissionsGroups ?? false,
      administrator: resource?.administrator ?? false,
      owner: resource?.owner ?? false,
    });
  }

  private toFailure(error: HttpErrorResponse) {
    return throwError(() => toAuthApiError(error.status, error.error));
  }
}
