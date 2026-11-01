// Package guards holds the guards of the IAM bounded context.
// package guards

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSessionStore } from '../../application/session/auth-session.store';

/**
 * authGuard protects the private routes of the platform.
 *
 * A request without a session renews it with the refresh token of the
 * cookie. When there is no valid session, the user is sent to the sign in,
 * and the platform opens the session that he was asking for.
 *
 * The guard does not apply the policy of the failure: it only renews when
 * the browser has no session, so there is nothing that a failure could
 * preserve. The policy that has a real effect lives in the interceptor,
 * where the session is alive.
 *
 * Known limitation: the guarantee of the policy — an unavailable platform
 * keeps the session of the cookie alive — is observable in the requests that
 * are in flight with a session in the memory of the browser. A navigation
 * with the store of the platform down lands on the sign in anyway, because
 * after a reload the browser has no access token and the contract of the
 * platform offers no state for "the platform is unavailable".
 */
export const authGuard: CanActivateFn = async () => {
  const session = inject(AuthSessionStore);
  const router = inject(Router);

  if (session.authenticated()) {
    return true;
  }

  try {
    await session.restore();
    return true;
  } catch {
    // The guard does not touch the session of the browser: the renewal only
    // happens when there is none, so a failure has nothing to preserve, and
    // a session that appeared while the renewal was failing — a sign in
    // that arrived at the same time — belongs to the user and must survive.
    // The sign in is the only destination that is available without a token.
    return router.createUrlTree(['/sign-in']);
  }
};
