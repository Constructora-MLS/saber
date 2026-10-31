// Package http holds the HTTP boundary of the IAM bounded context.
// package http

import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthSessionStore } from '../../application/session/auth-session.store';

/**
 * The routes of the platform that answer without an access token.
 *
 * The sign in and the renewal authenticate with the credential of the
 * session, the verification of a certificate is public: any person can read
 * a certificate without signing in, and the acceptance of an invitation is
 * public because the invited member arrives from the email.
 */
const PUBLIC_ROUTES = ['/auth/sign-in', '/auth/refresh', '/certificates/verify/', '/invitations/'];

/**
 * authInterceptor adds the access token to the private requests.
 *
 * The token travels in the Authorization header, never in a cookie, so the
 * browser never sends it to a route that does not need it.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const accessToken = inject(AuthSessionStore).accessToken();
  if (!accessToken || isPublicRoute(request.url)) {
    return next(request);
  }

  return next(request.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } }));
};

/** isPublicRoute reports whether a route answers without an access token. */
function isPublicRoute(url: string): boolean {
  return PUBLIC_ROUTES.some((route) => url.includes(route));
}
