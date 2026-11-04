// Package session holds the session of the authenticated user.
// package session

import { computed, inject, Injectable, signal } from '@angular/core';
import { SignInCommand } from '../commands/iam-commands';
import { SignInCommandService } from '../command-services/auth-command-services';
import { PlatformUser } from '../../domain/model/aggregates/platform-user';
import { restoreAuthIdentity } from '../../domain/model/value-objects/auth-identity';
import { EFFECTIVE_PERMISSIONS } from '../../domain/model/value-objects/effective-permissions';
import { AuthGateway } from '../../infrastructure/gateways/auth.gateway';
import { isForbidden, isUnauthorized } from '../../infrastructure/errors/auth-api.error';
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
  private pending: Promise<boolean> | null = null;
  /**
   * The session that the renewal that is running belongs to.
   *
   * The renewal is shared by every caller of the browser, so the renewal
   * that is already running may belong to another session: the answer tells
   * a failure of that renewal from the failure of the session that waits
   * for it.
   */
  private pendingRenewalSessionId: number | null = null;
  /**
   * The verification of the permissions that is already running.
   *
   * The verification is shared by the requests that arrive at the same
   * time: the platform is never asked for the permissions of the member
   * twice at once. The identifier of the session travels with it, so a
   * verification that belongs to a session that is gone is never reused by
   * the session that replaced it.
   */
  private pendingVerification: {
    readonly sessionId: number;
    readonly promise: Promise<void>;
  } | null = null;
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
  /**
   * The permissions that the platform grants to the authenticated user.
   *
   * The permissions are the ones that the platform published when the
   * session was opened, so the interface never offers a capability that the
   * platform does not grant. The platform is the authority: it refuses the
   * request of a capability that was revoked, and the session is renewed
   * with the permissions that the platform grants at that moment.
   */
  readonly permissions = computed(() => this.session()?.permissions ?? EFFECTIVE_PERMISSIONS);
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
    const session = await this.signInCommand.execute(command);
    // The session is open before the permissions are read: the
    // verification travels with the access token of the answer.
    this.open(session);
    // A new session dismisses the rejection of the previous one: the
    // credential that died is not the credential of this session, so the
    // presentation must not react to it again.
    this.rejections.set(0);

    await this.readPermissions();
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
   *
   * The answer tells whether the permissions were read with the new token:
   * a renewal that the platform accepted and a read that the platform
   * refused are two different outcomes, and the caller needs to know which
   * one happened.
   */
  restore(): Promise<boolean> {
    if (this.pending === null) {
      this.pendingRenewalSessionId = this.currentSessionId();
      this.pending = this.renew().finally(() => {
        this.pending = null;
        this.pendingRenewalSessionId = null;
      });
    }

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
   *
   * The answer tells whether the permissions were read with the renewed
   * token: the read belongs to the renewal, so the caller of the renewal
   * knows that the permissions of the session are the ones of the platform.
   */
  private async renew(): Promise<boolean> {
    const sessionId = this.currentSessionId();
    const session = await this.gateway.refresh();

    if (this.currentSessionId() !== sessionId) {
      // A session appeared while the renewal was in flight: it is the one
      // that the browser holds now, and the renewed one is discarded.
      return false;
    }

    // The session is open before the permissions are read: the
    // verification travels with the renewed access token.
    this.open(session);

    return this.readPermissions();
  }

  /**
   * verify refreshes the identity and the permissions of the user with the
   * access token.
   *
   * The identity travels in the token, but the permissions are resolved by
   * the platform on every request, so the verification is the only way to
   * know what the member may do right now.
   *
   * The answer belongs to the session that asked for it: the identifier of
   * the session is read before the request and compared with the identifier
   * that the browser holds when the answer arrives. A verification that
   * answers for a session that is gone is discarded, so it never overwrites
   * the identity and the permissions of the session that replaced it.
   */
  async verify(): Promise<void> {
    const sessionId = this.currentSessionId();
    const account = await this.gateway.verify();

    if (this.currentSessionId() !== sessionId) {
      // Another session appeared while the platform was answering: the
      // answer names the session that is gone, so it is discarded.
      return;
    }

    this.session.update((session) =>
      session ? { ...session, identity: account.identity, permissions: account.permissions } : session,
    );
  }

  /**
   * refreshPermissions reads the permissions of the member again.
   *
   * The read is shared: two refusals that arrive at the same time read the
   * permissions once, so the platform is never asked for them twice. The
   * read is never repeated on its own: it happens when the platform refused
   * an operation or when a route was refused, and never as a poll.
   *
   * The read belongs to the session that the browser holds: a verification
   * that was started for another session is never reused, so the session
   * that replaced it reads its own permissions.
   */
  refreshPermissions(): Promise<void> {
    const sessionId = this.currentSessionId();
    const pending = this.pendingVerification;
    if (pending !== null && pending.sessionId === sessionId) {
      return pending.promise;
    }

    const promise = this.readPermissionsOf(sessionId);
    this.pendingVerification = { sessionId, promise };
    void promise
      .catch(() => undefined)
      .finally(() => {
        if (this.pendingVerification?.promise === promise) {
          this.pendingVerification = null;
        }
      });

    return promise;
  }

  /**
   * readPermissionsOf reads the permissions of the member and renews the
   * session once when the platform rejected the credential.
   *
   * The access token lives a quarter of an hour and the cookie of the
   * session outlives it, so a read that arrives with an expired token
   * deserves a renewal instead of a refusal: the session is renewed once
   * and the read travels again with the new token. The renewal happens
   * once: a renewal that fails leaves the session as the platform decided
   * and the read is not repeated.
   *
   * The renewal reads the permissions with the new token by itself, and
   * that read never renews the session again: the renewal would wait for
   * itself.
   */
  private async readPermissionsOf(sessionId: number): Promise<void> {
    try {
      await this.verify();
      return;
    } catch (error) {
      if (!this.platformRejectedTheCredential(error)) {
        // The platform is not available or the account is not there: the
        // session survives and the failure reaches the caller.
        throw error;
      }
      if (this.currentSessionId() !== sessionId) {
        // The session that the read named is gone: the renewal belongs to
        // another session and it must not replace it.
        return;
      }
    }

    // The renewal is shared by every caller of the browser, so the one that
    // is already running may belong to another session: the failure of that
    // renewal is not the failure of this read.
    const renewalSessionId = this.renewalSessionId();

    try {
      const read = await this.restore();
      if (read) {
        // The renewal read the permissions with the new token.
        return;
      }
    } catch (error) {
      if (this.platformRejectedTheCredential(error) && renewalSessionId === sessionId) {
        // The credential is dead: the session that started the renewal is
        // forgotten and the rejection is published, exactly like the
        // boundary does. A session that was replaced in the meantime is
        // never forgotten, and a renewal that belongs to another session is
        // never attributed to this one.
        this.forget(sessionId);
      }
      throw error;
    }

    // The renewal did not read the permissions: the read travels again with
    // the token of the session that the browser holds now.
    await this.verify();
  }

  /**
   * renewalSessionId returns the session that the renewal belongs to.
   *
   * The renewal is shared by every caller of the browser, so the renewal
   * that is already running may belong to another session: the answer tells
   * a failure of that renewal from the failure of the session that waits
   * for it.
   */
  private renewalSessionId(): number {
    return this.pendingRenewalSessionId ?? this.currentSessionId();
  }

  /**
   * readPermissions reads the permissions of the member.
   *
   * The failure of the verification does not close the session: the
   * platform already opened it, so the member keeps it and the permissions
   * are read again with the next renewal.
   *
   * The answer tells whether the permissions were read, so the caller knows
   * if the session holds the permissions of the platform.
   */
  private async readPermissions(): Promise<boolean> {
    try {
      await this.verify();
      return true;
    } catch {
      // The session survives the failure of the verification.
      return false;
    }
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

  /**
   * platformRefusedTheOperation reports whether a failure of the platform
   * is the refusal of an operation of the member.
   *
   * The refusal does not prove that a permission was revoked: the platform
   * also refuses the operations that break the hierarchy of the groups, so
   * the predicate only reports the refusal and never names its cause.
   *
   * The store publishes the predicate so the boundary and the presentation
   * share one rule about what a refusal means.
   */
  platformRefusedTheOperation(error: unknown): boolean {
    return isForbidden(error);
  }
}
