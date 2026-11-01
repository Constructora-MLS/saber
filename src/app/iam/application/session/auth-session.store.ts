// Package session holds the session of the authenticated user.
// package session

import { computed, inject, Injectable, signal } from '@angular/core';
import { SignInCommand } from '../commands/iam-commands';
import { SignInCommandService } from '../command-services/auth-command-services';
import { PlatformUser } from '../../domain/model/aggregates/platform-user';
import { restoreAuthIdentity } from '../../domain/model/value-objects/auth-identity';
import { AuthGateway } from '../../infrastructure/gateways/auth.gateway';
import { isUnauthorized } from '../../infrastructure/errors/auth-api.error';
import { AuthSession } from './auth-session';

/**
 * AuthSessionStore keeps the session of the authenticated user.
 *
 * The access token lives in the memory of the browser: it is never written to
 * the storage. A reload of the page renews the session with the refresh
 * token, which travels in a cookie that the platform owns, so the user never
 * signs in twice on the same browser.
 */
@Injectable({ providedIn: 'root' })
export class AuthSessionStore {
  private readonly gateway = inject(AuthGateway);
  private readonly signInCommand = inject(SignInCommandService);

  private readonly session = signal<AuthSession | null>(null);
  /** The renewal that is already running, so it is never started twice. */
  private pending: Promise<void> | null = null;

  /** The token that authenticates the private requests. */
  readonly accessToken = computed(() => this.session()?.accessToken ?? null);
  /** The identity of the authenticated user. */
  readonly identity = computed(() => this.session()?.identity ?? null);
  /** Whether the browser holds a session. */
  readonly authenticated = computed(() => this.session() !== null);

  /** signIn authenticates a user and keeps the session of the answer. */
  async signIn(command: SignInCommand): Promise<void> {
    this.session.set(await this.signInCommand.execute(command));
  }

  /**
   * restore renews the session with the refresh token of the cookie.
   *
   * The renewal is shared: two navigations that arrive at the same time
   * renew the session once, so the platform never rotates the refresh token
   * twice and invalidates the session that was just created.
   */
  restore(): Promise<void> {
    this.pending ??= this.gateway
      .refresh()
      .then((session) => this.session.set(session))
      .finally(() => {
        this.pending = null;
      });

    return this.pending;
  }

  /**
   * verify refreshes the identity of the user with the access token.
   *
   * The identity travels in the token, so the verification never reaches the
   * database of the platform.
   */
  async verify(): Promise<void> {
    const identity = await this.gateway.verify();
    this.session.update((session) => (session ? { ...session, identity } : session));
  }

  /**
   * applyProfile replaces the identity of the session with the published one.
   *
   * The names of the user change in the platform, so the browser keeps the
   * identity that the platform published: the name shown in the sidebar and
   * in the settings is the new one.
   */
  applyProfile(user: PlatformUser): void {
    this.session.update((session) =>
      session
        ? {
            ...session,
            identity: restoreAuthIdentity(user.id.value, user.email, user.firstName, user.lastName),
          }
        : session,
    );
  }

  /**
   * logout closes the session of the user.
   *
   * The session is closed in the platform and forgotten in the browser, so
   * the access token never travels again. The browser forgets the session
   * only when the platform confirms the closure: when the platform does not
   * answer, the session of the cookie may still be alive, and a browser
   * that forgot it would show a closed session that a reload of the page
   * opens again.
   */
  async logout(): Promise<void> {
    await this.gateway.logout();
    this.clear();
  }

  /**
   * clear forgets the session of the browser.
   *
   * The session is not closed in the platform: the method abandons a session
   * that is already dead, so the browser stops sending a token that the
   * platform rejects.
   */
  clear(): void {
    this.session.set(null);
  }

  /**
   * credentialIsDead reports whether a failure of the platform killed the
   * credential of the session.
   *
   * This is the single rule of the policy, so the boundary and the
   * presentation share one rule: the interceptor asks the store, and nobody
   * reads the status of the failure by itself.
   *
   * The platform answers 401 when the credential is dead — the access token
   * expired or the refresh token of the cookie was revoked — and 503 when its
   * store of sessions is unreachable, where the cookie and the session
   * survive. Any other failure says nothing about the session, so the
   * session is kept: a platform that fails for an unknown reason must not
   * throw the user out of the application.
   */
  credentialIsDead(error: unknown): boolean {
    return isUnauthorized(error);
  }
}
