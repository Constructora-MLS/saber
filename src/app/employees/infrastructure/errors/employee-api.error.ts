// Package http holds the failure of a call to the API of the Employees
// bounded context.
// package http

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
 * EmployeeApiError is the failure of a call to the API of the Employees
 * bounded context.
 *
 * The technical details of the failure stay in the payload of the problem
 * details, but the message that the interfaces show is the detail published
 * by the platform.
 */
export class EmployeeApiError extends ApiError {
  constructor(
    status: number,
    code: string,
    detail: string,
    fieldErrors: readonly FieldErrorResource[] = [],
  ) {
    super(status, code, detail, fieldErrors);
    this.name = 'EmployeeApiError';
  }
}

/**
 * toEmployeeApiError translates a failed response into the error of the
 * context.
 *
 * A response that does not follow the problem details contract is reported
 * as an unexpected failure, without leaking the payload.
 */
export function toEmployeeApiError(status: number, body: unknown): EmployeeApiError {
  const problem = parseProblem(body);

  if (!problem) {
    return new EmployeeApiError(status, UNEXPECTED_ERROR_CODE, UNEXPECTED_ERROR_DETAIL);
  }

  return new EmployeeApiError(
    status,
    problem.code ?? UNKNOWN_ERROR_CODE,
    problem.detail ?? problem.title ?? FALLBACK_ERROR_DETAIL,
    problem.errors ?? [],
  );
}
