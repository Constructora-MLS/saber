// Package http holds the HTTP boundary of the IAM bounded context.
// package http

import { HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, Observable, switchMap, throwError } from 'rxjs';
import { AuthSessionStore } from '../../application/session/auth-session.store';

/**
 * The routes of the platform that answer without an access token.
 *
 * The sign in, the renewal and the closure of the session authenticate with
 * the credential of the session — the refresh token of the cookie — and not
 * with an access token: the closure does not need it because the session of
 * the cookie is the credential that the platform revokes. The verification of
 * a certificate is public: any person can read a certificate without
 * signing in, and the acceptance of an invitation is public because the
 * invited member arrives from the email.
 */
const PUBLIC_ROUTES = [
  '/auth/sign-in',
  '/auth/refresh',
  '/auth/logout',
  '/certificates/verify/',
  '/invitations/',
];

/**
 * authInterceptor adds the access token to the private requests.
 *
 * The token travels in the Authorization header, never in a cookie, so the
 * browser never sends it to a route that does not need it.
 *
 * When the platform rejects the token of a private request, the session is
 * renewed once and the request is retried once: the access token lives a
 * quarter of an hour and the session of the cookie outlives it, so a request
 * that arrives with an old token deserves a new session instead of a
 * failure. When the renewal fails, the store of the session decides: a dead
 * credential makes the browser forget the session and the user sign in
 * again, and an unavailable platform keeps the session alive, because the
 * cookie of the session is still valid on the platform.
 *
 * Known limitation: the guarantee of the policy — an unavailable platform
 * keeps the session of the cookie alive — is observable in the requests that
 * are in flight with a session in the memory of the browser. A navigation
 * with the store of the platform down lands on the sign in anyway, because
 * after a reload the browser has no access token and the contract of the
 * platform offers no state for "the platform is unavailable".
 *
 * Deliberate exception to the layering: this interceptor navigates. The
 * rejection of the credential is detected in the HTTP boundary and the
 * session is lost there, so the redirect belongs to the same reaction and
 * the presentation stays free of the details of the HTTP.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(AuthSessionStore);
  const router = inject(Router);

  if (isPublicRoute(request.url)) {
    return next(request);
  }

  const accessToken = session.accessToken();
  if (!accessToken) {
    return next(request);
  }

  return next(withAccessToken(request, accessToken)).pipe(
    catchError((error: unknown) => {
      // The store of the session owns the policy of the credential: the
      // interceptor does not read the status of the failure, it asks the
      // session, so the boundary and the presentation share one rule.
      if (!session.credentialIsDead(error)) {
        return throwError(() => error);
      }

      return renewAndRetry(request, next, session, router);
    }),
  );
};

/**
 * renewAndRetry renews the session and retries the request once.
 *
 * The renewal is the one of the store, which shares it with the requests
 * that arrive at the same time, so the platform never rotates the refresh
 * token twice.
 *
 * The retry is emitted with next, which is the downstream segment of the
 * chain: the retried request does not re-enter this interceptor, so it can
 * never be renewed twice. The catchError of the renewal is outside the
 * switchMap of the retry, so the failure of the retry is never renewed
 * again: it reaches the caller as it is.
 *
 * The failure of the retry does react, though: a retry that the platform
 * rejects again means that the credential is dead even after the renewal,
 * so the session is abandoned and the user signs in again. The reaction is
 * the same one of the failed renewal and it is idempotent.
 */
function renewAndRetry(
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
  session: AuthSessionStore,
  router: Router,
): Observable<HttpEvent<unknown>> {
  return from(session.restore()).pipe(
    catchError((error: unknown) => {
      forgetTheDeadSession(error, session, router);

      return throwError(() => error);
    }),
    switchMap(() => next(withAccessToken(request, session.accessToken()))),
    catchError((error: unknown) => {
      // The retry is not renewed again: it only reacts. The renewal already
      // happened, so a rejection of the retry is a credential that the
      // platform still refuses.
      forgetTheDeadSession(error, session, router);

      return throwError(() => error);
    }),
  );
}

/**
 * forgetTheDeadSession abandons the session when the platform rejected the
 * credential and takes the user to the sign in.
 *
 * The reaction is idempotent: it only acts when the store still holds a
 * session, so the first failure finds the session and abandons it, and the
 * failures that arrive at the same time find it empty and do nothing, so N
 * requests produce one navigation and not N.
 */
function forgetTheDeadSession(error: unknown, session: AuthSessionStore, router: Router): void {
  if (!session.credentialIsDead(error)) {
    return;
  }

  if (session.authenticated()) {
    session.clear();
    void router.navigate(['/sign-in']);
  }
}

/** withAccessToken adds the access token to the request when the browser has one. */
function withAccessToken(
  request: HttpRequest<unknown>,
  accessToken: string | null,
): HttpRequest<unknown> {
  return accessToken
    ? request.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } })
    : request;
}

/** isPublicRoute reports whether a route answers without an access token. */
function isPublicRoute(url: string): boolean {
  return PUBLIC_ROUTES.some((route) => url.includes(route));
}
