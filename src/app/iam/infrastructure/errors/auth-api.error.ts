// Package errors holds the failure of a call to the API of the IAM bounded
// context.
// package errors

import { HttpErrorResponse } from '@angular/common/http';
import {
  ApiError,
  FALLBACK_ERROR_DETAIL,
  FieldErrorResource,
  parseProblem,
  UNEXPECTED_ERROR_CODE,
  UNEXPECTED_ERROR_DETAIL,
  UNKNOWN_ERROR_CODE,
} from '../../../shared/infrastructure/http/problem';

/**
 * AuthApiError is the failure of a call to the API of the IAM bounded
 * context.
 *
 * The technical details of the failure stay in the payload of the problem
 * details, but the message that the interfaces show is the detail published
 * by the platform.
 */
export class AuthApiError extends ApiError {
  constructor(
    status: number,
    code: string,
    detail: string,
    fieldErrors: readonly FieldErrorResource[] = [],
  ) {
    super(status, code, detail, fieldErrors);
    this.name = 'AuthApiError';
  }
}

/**
 * toAuthApiError translates a failed response into the error of the context.
 *
 * A response that does not follow the problem details contract is reported
 * as an unexpected failure, without leaking the payload.
 */
export function toAuthApiError(status: number, body: unknown): AuthApiError {
  const problem = parseProblem(body);

  if (!problem) {
    return new AuthApiError(status, UNEXPECTED_ERROR_CODE, UNEXPECTED_ERROR_DETAIL);
  }

  return new AuthApiError(
    status,
    problem.code ?? UNKNOWN_ERROR_CODE,
    problem.detail ?? problem.title ?? FALLBACK_ERROR_DETAIL,
    problem.errors ?? [],
  );
}

/**
 * UNAUTHORIZED_STATUS is the status of a rejected credential.
 */
export const UNAUTHORIZED_STATUS = 401;

/**
 * statusOf returns the status of a failure of the platform.
 *
 * The failure travels as it comes from the HTTP boundary — the response of
 * the client — or already translated into the error of the context.
 */
export function statusOf(error: unknown): number | null {
  if (error instanceof HttpErrorResponse) {
    return error.status;
  }

  if (error instanceof ApiError) {
    return error.status;
  }

  return null;
}

/**
 * isUnauthorized tells whether a failure is the rejection of the credential.
 *
 * The platform answers 401 when it rejects the credential, and what that
 * means depends on the route that was called: the renewal of the session
 * removes the cookie of the refresh token, so the credential is dead for
 * good, while the 401 of a private route leaves the cookie of the session
 * alive, so the session is renewed once.
 *
 * The predicate only reports the status of the failure: the policy of each
 * route belongs to the store of the session, which is the layer that knows
 * the session of the browser.
 */
export function isUnauthorized(error: unknown): boolean {
  return statusOf(error) === UNAUTHORIZED_STATUS;
}
