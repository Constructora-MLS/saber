import {
  ApiError,
  FALLBACK_ERROR_DETAIL,
  FieldErrorResource,
  parseProblem,
  UNEXPECTED_ERROR_CODE,
  UNEXPECTED_ERROR_DETAIL,
  UNKNOWN_ERROR_CODE,
} from '../../../shared/infrastructure/http/problem';

/** GroupApiError is a failure returned by the groups API. */
export class GroupApiError extends ApiError {
  constructor(
    status: number,
    code: string,
    detail: string,
    fieldErrors: readonly FieldErrorResource[] = [],
  ) {
    super(status, code, detail, fieldErrors);
    this.name = 'GroupApiError';
  }
}

/** toGroupApiError translates a response without exposing its raw payload. */
export function toGroupApiError(status: number, body: unknown): GroupApiError {
  const problem = parseProblem(body);
  if (!problem) {
    return new GroupApiError(status, UNEXPECTED_ERROR_CODE, UNEXPECTED_ERROR_DETAIL);
  }
  return new GroupApiError(
    status,
    problem.code ?? UNKNOWN_ERROR_CODE,
    problem.detail ?? problem.title ?? FALLBACK_ERROR_DETAIL,
    problem.errors ?? [],
  );
}
