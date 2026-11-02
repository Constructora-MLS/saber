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
  /**
   * The identifier of the session that the browser holds.
   *
   * The identifier is local and monotonic: the platform signs a
   * deterministic access token, so two sessions of the same user can carry
   * the very same token, and the token cannot tell them apart.
   */
  private readonly currentSessionId = signal(0);
  /**
   * The number of times that the platform rejected the credential of the
   * browser.
   *
   * The count is the edge of the rejection: the presentation reacts to the
   * change of the number and not to its value, so every death of a
   * credential raises it again, even when the previous death left the count
   * already raised.
   */
  private readonly rejections = signal(0);

  /** The token that authenticates the private requests. */
  readonly accessToken = computed(() => this.session()?.accessToken ?? null);
  /** The identity of the authenticated user. */
  readonly identity = computed(() => this.session()?.identity ?? null);
  /** Whether the browser holds a session. */
  readonly authenticated = computed(() => this.session() !== null);
  /**
   * sessionId identifies the session that the browser holds.
   *
   * The identifier never repeats: the store counts the sessions that it
   * opens, so the identity of a session does not depend on the access token
   * that the platform signs.
   */
  readonly sessionId = this.currentSessionId.asReadonly();
  /**
   * rejectionCount is the number of deaths of the credential that the
   * browser has seen.
   *
   * The store publishes the count and does not act on it: the reaction
   * belongs to the presentation, which is the layer that knows how to take
   * the user to the sign in. The presentation reacts to the change of the
   * count, so a credential that dies again after a renewal raises it again.
   */
  readonly rejectionCount = this.rejections.asReadonly();
  /**
   * credentialRejected tells whether the platform rejected the credential of
   * the browser.
   *
   * The rejection is a historical fact of the browser and not a state of
   * the session that it holds: a renewal opens a session that the platform
   * never rejected, so the rejection survives it. Only a sign in and a
   * deliberate abandonment dismiss it, because those two are the only
   * moments in which the browser starts again with a credential that the
   * platform has not refused.
   */
  readonly credentialRejected = computed(() => this.rejections() > 0);

  /** signIn authenticates a user and keeps the session of the answer. */
  async signIn(command: SignInCommand): Promise<void> {
    this.open(await this.signInCommand.execute(command));
    // A new session dismisses the rejection of the previous one: the
    // credential that died is not the credential of this session, so the
    // presentation must not react to it again.
    this.rejections.set(0);
  }

  /**
   * restore renews the session with the refresh token of the cookie.
   *
   * The renewal is shared: two navigations that arrive at the same time
   * renew the session once, so the platform never rotates the refresh token
   * twice and invalidates the session that was just created.
   *
   * The renewal does not dismiss the rejection of a dead credential: the
   * session that comes back is alive, but the death that happened before it
   * is a death, and the count of the deaths is what the presentation reads.
   */
  restore(): Promise<void> {
    this.pending ??= this.renew().finally(() => {
      this.pending = null;
    });

    return this.pending;
  }

  /**
   * renew asks the platform for a session and keeps it when it is still the
   * one that the browser holds.
   *
   * The identifier of the session is read before the renewal starts: a
   * session that appears while the platform is answering — a sign in of
   * this same tab — belongs to the user, and the renewal must not replace
   * it. The renewed session is published only when the identifier of the
   * browser did not change while the platform was answering.
   */
  private async renew(): Promise<void> {
    const sessionId = this.currentSessionId();
    const session = await this.gateway.refresh();

    if (this.currentSessionId() !== sessionId) {
      // A session appeared while the renewal was in flight: it is the one
      // that the browser holds now, and the renewed one is discarded.
      return;
    }

    this.open(session);
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
   *
   * The rejection of the credential is dismissed too: a session that the
   * browser abandons on purpose is not a rejected credential.
   */
  clear(): void {
    this.session.set(null);
    this.rejections.set(0);
  }

  /**
   * forget abandons the session of the browser when it is the session that
   * failed.
   *
   * The session is identified by the identifier that the store gave to it
   * when it opened it, and not by its access token: the platform signs a
   * deterministic token, so two sessions of the same user can carry the very
   * same token and the token cannot tell which one failed. A session that
   * appeared while the failure was happening — a sign in of this same tab
   * that arrived at the same time — belongs to the user and must survive,
   * because the failure is not about it.
   *
   * The rejection is published when the session is forgotten, so the
   * presentation reacts to the death of a credential and not to a failure
   * that does not concern the session of the browser. The count of the
   * deaths grows with every death, so a credential that dies again after a
   * renewal raises it again and the presentation reacts again.
   *
   * The method reports whether the session was forgotten: the failures that
   * arrive at the same time find the session empty and forget nothing, so N
   * requests produce one rejection and not N.
   *
   * The session that survives works with its access token, but the cookie of
   * the renewal is already gone: the platform removes the cookie of the
   * refresh token when it refuses it, so the session that is left alive is
   * no longer renewable.
   */
  forget(sessionId: number): boolean {
    if (this.session() === null || this.currentSessionId() !== sessionId) {
      return false;
    }

    this.session.set(null);
    this.rejections.update((deaths) => deaths + 1);

    return true;
  }

  /**
   * open keeps a session of the platform and gives it its identifier.
   *
   * Every session that the store opens gets an identifier of its own: the
   * identifier is what tells two sessions of the same user apart when the
   * platform signs them with the very same access token.
   */
  private open(session: AuthSession): void {
    this.session.set(session);
    this.currentSessionId.update((id) => id + 1);
  }

  /**
   * platformRejectedTheCredential reports whether a failure of the platform
   * is the rejection of the credential of the session.
   *
   * This is the single rule of the policy, so the boundary and the
   * presentation share one rule: the interceptor asks the store, and nobody
   * reads the status of the failure by itself.
   *
   * The platform answers 401 when it rejects the credential — the access
   * token expired, or the refresh token of the cookie was revoked — and 503
   * when its store of sessions is unreachable, where the cookie and the
   * session survive. Any other failure says nothing about the session, so
   * the session is kept: a platform that fails for an unknown reason must
   * not throw the user out of the application.
   *
   * The predicate only reports the rejection; what happens next depends on
   * where it was observed. The interceptor renews the session once, because
   * an expired access token deserves a renewal, and only a renewal that the
   * platform also rejects forgets the session, because only then the
   * credential is really dead.
   */
  platformRejectedTheCredential(error: unknown): boolean {
    return isUnauthorized(error);
  }
}
