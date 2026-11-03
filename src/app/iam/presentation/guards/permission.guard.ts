// Package guards holds the guards of the IAM bounded context.
// package guards

import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthSessionStore } from '../../application/session/auth-session.store';
import {
  FunctionalPermission,
  holdsAnyPermission,
} from '../../domain/model/value-objects/effective-permissions';
import { hasAnyAccess } from '../../../shared/presentation/navigation/first-accessible-route';

/**
 * permissionGuard protects the private routes of the platform.
 *
 * The route declares the permissions that the platform asks for it, and the
 * guard sends the member to the page that explains the refusal when the
 * member does not hold them. The platform remains the authority: the guard
 * only decides what the interface offers, never what the platform allows.
 *
 * A member without any permission of the platform reaches the page that
 * tells him so, because the refusal of a single route is not the same
 * situation as the refusal of every application.
 *
 * The guard is a matcher of the route and not an activator: a member that
 * may not open a page never downloads it.
 */
export const permissionGuard: CanMatchFn = async (route) => {
  const session = inject(AuthSessionStore);
  const router = inject(Router);

  const required = (route.data?.['permission'] ?? []) as readonly FunctionalPermission[];
  if (required.length === 0) {
    return true;
  }

  // The guard of the session runs after this one: the recognition of the
  // route happens first, so the session is renewed here when the browser
  // does not hold one. The renewal is shared, so the platform is never
  // asked for it twice.
  if (!session.authenticated()) {
    try {
      await session.restore();
    } catch {
      return router.createUrlTree(['/sign-in']);
    }
  }

  const permissions = session.permissions();
  if (holdsAnyPermission(permissions, required)) {
    return true;
  }

  return router.createUrlTree([
    hasAnyAccess(permissions) ? '/forbidden' : '/no-permissions',
  ]);
};
