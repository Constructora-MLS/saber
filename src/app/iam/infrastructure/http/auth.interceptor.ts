// Package http holds the HTTP boundary of the IAM bounded context.
// package http

import { HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
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
 * invited member arrives from the email. The recovery of the password is
 * public too: the link of the email arrives in a browser that may not hold
 * a session, and the credential of the recovery is the token of the link.
 */
const PUBLIC_ROUTES = [
  '/auth/sign-in',
  '/auth/refresh',
  '/auth/logout',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/certificates/verify/',
  '/invitations/',
];

/**
 * VERIFICATION_ROUTE is the route that reads the permissions of the member.
 *
 * The route never renews the session and never asks for the permissions
 * again: the renewal of the session ends with a verification, so a renewal
 * that the verification provoked would wait for itself, and a refusal that
 * the verification provoked would ask for the permissions forever.
 */
const VERIFICATION_ROUTE = '/auth/verify';

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
 * credential makes the browser forget the session, and an unavailable
 * platform keeps the session alive, because the cookie of the session is
 * still valid on the platform.
 *
 * The boundary never navigates: it does not know the routes of the
 * application. When the credential dies, the interceptor tells the store of
 * the session to forget it, and the store publishes the rejection. The
 * presentation reads that state and takes the user to the sign in.
 *
 * Known limitation: the guarantee of the policy — an unavailable platform
 * keeps the session of the cookie alive — is observable in the requests that
 * are in flight with a session in the memory of the browser. A navigation
 * with the store of the platform down lands on the sign in anyway, because
 * after a reload the browser has no access token and the contract of the
 * platform offers no state for "the platform is unavailable".
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(AuthSessionStore);

  if (isPublicRoute(request.url)) {
    return next(request);
  }

  const accessToken = session.accessToken();
  if (!accessToken) {
    return next(request);
  }

  // The request carries the identifier of the session that it uses, so the
  // reaction abandons exactly that session when the credential dies.
  const sessionId = session.sessionId();
  const generation = session.sessionGeneration();

  return next(withAccessToken(request, accessToken)).pipe(
    catchError((error: unknown) => {
      // The read of the permissions stands alone: it never renews the
      // session and it never asks for the permissions again. The renewal of
      // the session ends with a verification, so a renewal that the
      // verification provoked would wait for itself, and a refusal that the
      // verification provoked would ask for the permissions forever.
      if (request.url.includes(VERIFICATION_ROUTE) || session.sessionGeneration() !== generation) {
        return throwError(() => error);
      }

      // The platform refused the operation: the authority of the member
      // may have changed, so the session reads it again and the interface
      // offers what the platform grants at this moment. The operation is
      // never repeated: the platform refused it for a reason, and that
      // reason may be the hierarchy of the groups and not the permissions.
      refreshTheAuthority(error, session);

      // The store of the session owns the policy of the credential: the
      // interceptor does not read the status of the failure, it asks the
      // session, so the boundary and the presentation share one rule.
      if (!session.platformRejectedTheCredential(error) || !session.canRestoreFor(generation)) {
        return throwError(() => error);
      }

      return renewAndRetry(request, next, session, accessToken, sessionId, generation, error);
    }),
  );
};

/**
 * refreshTheAuthority reads the permissions of the member again when the
 * platform refused the operation.
 *
 * The refusal does not prove that a permission was revoked: the platform
 * also refuses an operation that breaks the hierarchy of the groups. The
 * session is read again so the interface offers the permissions that the
 * platform grants at this moment, and the copy of the refusal never names a
 * revocation.
 *
 * The read is shared: two refusals that arrive at the same time read the
 * permissions once. The read is not awaited: the failure of the request
 * reaches the caller at once, and the permissions are read in the
 * background. The browser never polls the platform: the read happens only
 * when the platform refused something.
 */
function refreshTheAuthority(error: unknown, session: AuthSessionStore): void {
  if (!session.platformRefusedTheOperation(error)) {
    return;
  }

  void session.refreshPermissions().catch(() => undefined);
}

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
 *
 * The identifier of the session of the request travels with the reaction:
 * the store forgets only the session whose identifier is the one that the
 * platform rejected, so a session that appeared while the renewal was
 * failing survives.
 */
function renewAndRetry(
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
  session: AuthSessionStore,
  accessToken: string,
  sessionId: number,
  generation: number,
  originalError: unknown,
): Observable<HttpEvent<unknown>> {
  return from(session.restore()).pipe(
    catchError((error: unknown) => {
      forgetTheDeadSession(error, session, sessionId);

      return throwError(() => error);
    }),
    switchMap(() => {
      // Never replay a request under a different login, even if the old
      // renewal succeeded after the new login appeared.
      if (session.sessionGeneration() !== generation || !session.authenticated()) {
        return throwError(() => originalError);
      }
      const renewedToken = session.accessToken() ?? accessToken;
      // The renewal opened a session of its own: the retry carries the
      // identifier of that session, and not the one of the request that
      // failed, because the credential that the platform refuses now is the
      // renewed one.
      const renewedSessionId = session.sessionId();

      return next(withAccessToken(request, renewedToken)).pipe(
        catchError((error: unknown) => {
          // The retry is not renewed again: it only reacts. The renewal
          // already happened, so a rejection of the retry is a credential
          // that the platform still refuses.
          forgetTheDeadSession(error, session, renewedSessionId);

          return throwError(() => error);
        }),
      );
    }),
  );
}

/**
 * forgetTheDeadSession abandons the session when the platform rejected the
 * credential.
 *
 * The reaction is idempotent: the store forgets a session only once, so the
 * first failure finds the session and abandons it, and the failures that
 * arrive at the same time find it empty and do nothing, so N requests
 * produce one rejection and not N.
 *
 * The session is named by the identifier that the store gave to it, and not
 * by its access token: the platform signs a deterministic token, so a token
 * that repeats does not mean that the session repeats.
 */
function forgetTheDeadSession(error: unknown, session: AuthSessionStore, sessionId: number): void {
  if (!session.platformRejectedTheCredential(error)) {
    return;
  }

  session.forget(sessionId);
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
