// Package session holds the session of the authenticated user.
// package session

import { AuthIdentity } from '../../domain/model/value-objects/auth-identity';
import { EffectivePermissions } from '../../domain/model/value-objects/effective-permissions';

/**
 * AuthSession is the credential of an authenticated user.
 *
 * The access token lives in the memory of the browser: it is never written
 * to the storage, so a script that reads the storage of the browser never
 * finds it. The session survives a reload because the refresh token travels
 * in a cookie that the platform owns.
 */
export interface AuthSession {
  /** The token that authenticates the private requests. */
  readonly accessToken: string;
  /** The identity of the authenticated user. */
  readonly identity: AuthIdentity;
  /** The permissions that the platform grants to the user. */
  readonly permissions: EffectivePermissions;
}

/**
 * AuthenticatedAccount is the identity and the authority of the
 * authenticated user.
 *
 * The platform publishes both together, so the browser learns what the
 * member may do without asking for it on every page.
 */
export interface AuthenticatedAccount {
  /** The identity of the authenticated user. */
  readonly identity: AuthIdentity;
  /** The permissions that the platform grants to the user. */
  readonly permissions: EffectivePermissions;
}
