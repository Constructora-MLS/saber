// Package gateways holds the communication boundary with the IAM API.
// package gateways

import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, firstValueFrom, throwError } from 'rxjs';
import { API_BASE_URL } from '../../../api.config';
import { AuthSession } from '../../application/session/auth-session';
import { AuthIdentity, restoreAuthIdentity } from '../../domain/model/value-objects/auth-identity';
import { TokenResponseResource, UserResource } from '../contracts/auth.contract';
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

  /** verify answers the identity of the user of the access token. */
  async verify(): Promise<AuthIdentity> {
    const resource = await firstValueFrom(
      this.http
        .get<UserResource>(`${this.baseUrl}/auth/verify`)
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );

    return restoreAuthIdentity(
      resource.uuid,
      resource.email,
      resource.firstName,
      resource.lastName,
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
    };
  }

  private toFailure(error: HttpErrorResponse) {
    return throwError(() => toAuthApiError(error.status, error.error));
  }
}
