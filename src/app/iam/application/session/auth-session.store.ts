// Package session holds the session of the authenticated user.
// package session

import { computed, inject, Injectable, signal } from '@angular/core';
import { SignInCommand } from '../commands/iam-commands';
import { SignInCommandService } from '../command-services/auth-command-services';
import { AuthGateway } from '../../infrastructure/gateways/auth.gateway';
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
   * logout closes the session of the user.
   *
   * The session is closed in the platform and forgotten in the browser, so
   * the access token never travels again.
   */
  async logout(): Promise<void> {
    try {
      await this.gateway.logout();
    } finally {
      this.session.set(null);
    }
  }
}
