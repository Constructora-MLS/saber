// package http

import { FieldErrorResource, ProblemResource } from '../contracts/catalog.contract';

/**
 * CatalogApiError is the failure of a call to the API of the Catalog
 * bounded context.
 *
 * The technical details of the failure stay in the payload of the problem
 * details, but the message that the interfaces show is the detail published
 * by the platform.
 */
export class CatalogApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly detail: string,
    readonly fieldErrors: readonly FieldErrorResource[] = [],
  ) {
    super(detail);
    this.name = 'CatalogApiError';
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
 * toCatalogApiError translates a failed response into the error of the
 * context.
 *
 * A response that does not follow the problem details contract is reported
 * as an unexpected failure, without leaking the payload.
 */
export function toCatalogApiError(status: number, body: unknown): CatalogApiError {
  const problem = asProblem(body);

  if (!problem) {
    return new CatalogApiError(
      status,
      'unexpected_error',
      'No se pudo completar la operación. Inténtalo nuevamente.',
    );
  }

  return new CatalogApiError(
    status,
    problem.code ?? 'unknown_error',
    problem.detail ?? problem.title ?? 'No se pudo completar la operación.',
    problem.errors ?? [],
  );
}

/**
 * asProblem reads the problem details of a failed response.
 */
function asProblem(body: unknown): ProblemResource | null {
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
