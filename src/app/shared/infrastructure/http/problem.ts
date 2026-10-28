// Package http holds the shared representation of a failure of the API.
//
// The platform publishes every failure as problem details (RFC 9457): a
// type, a title, a status, a detail, a code and the invalid fields of the
// request. The envelope is the same in every bounded context, so it lives
// here once and every context translates it into its own error.
// package http

/**
 * The invalid field of a failed request.
 */
export interface FieldErrorResource {
  readonly field: string;
  readonly message: string;
}

/**
 * The RFC 9457 representation of a failure of the API.
 */
export interface ProblemResource {
  readonly type?: string;
  readonly title?: string;
  readonly status?: number;
  readonly detail?: string;
  readonly code?: string;
  readonly errors?: readonly FieldErrorResource[];
}

/**
 * ApiError is the failure of a call to the API.
 *
 * The technical details of the failure stay in the payload of the problem
 * details, but the message that the interfaces show is the detail published
 * by the platform.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly detail: string,
    readonly fieldErrors: readonly FieldErrorResource[] = [],
  ) {
    super(detail);
    this.name = 'ApiError';
  }

  /**
   * messageOfField returns the message published for a field, when the
   * platform rejected that field.
   */
  messageOfField(field: string): string | null {
    const match = this.fieldErrors.find((error) => error.field === field);
    return match?.message ?? null;
  }
}

/**
 * parseProblem reads the problem details of a failed response.
 *
 * A body that does not follow the contract is not a problem details
 * response, and the caller reports it as an unexpected failure.
 */
export function parseProblem(body: unknown): ProblemResource | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }
  const candidate = body as ProblemResource;
  if (
    typeof candidate.title !== 'string' &&
    typeof candidate.detail !== 'string' &&
    typeof candidate.code !== 'string'
  ) {
    return null;
  }
  return candidate;
}

/**
 * UNEXPECTED_ERROR_CODE is the code of a failure whose payload does not
 * follow the problem details contract.
 */
export const UNEXPECTED_ERROR_CODE = 'unexpected_error';

/**
 * UNKNOWN_ERROR_CODE is the code of a failure that the platform published
 * without a code.
 */
export const UNKNOWN_ERROR_CODE = 'unknown_error';

/**
 * UNEXPECTED_ERROR_DETAIL is the message shown when the platform did not
 * publish a readable failure.
 */
export const UNEXPECTED_ERROR_DETAIL = 'No se pudo completar la operación. Inténtalo nuevamente.';

/**
 * FALLBACK_ERROR_DETAIL is the message shown when the platform published a
 * failure without a detail.
 */
export const FALLBACK_ERROR_DETAIL = 'No se pudo completar la operación.';
