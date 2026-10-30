// Package guards holds the guards of the IAM bounded context.
// package guards

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSessionStore } from '../../application/session/auth-session.store';

/**
 * authGuard protects the private routes of the platform.
 *
 * A request without a session renews it with the refresh token of the
 * cookie. When there is no valid session, the user is sent to the sign in
 * and the route he wanted is kept, so he returns to it after signing in.
 */
export const authGuard: CanActivateFn = async (_route, state) => {
  const session = inject(AuthSessionStore);
  const router = inject(Router);

  if (session.authenticated()) {
    return true;
  }

  try {
    await session.restore();
    return true;
  } catch {
    return router.createUrlTree(['/sign-in'], {
      queryParams: { returnUrl: state.url },
    });
  }
};
