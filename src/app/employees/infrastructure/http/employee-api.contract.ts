// Package http holds the contracts of the HTTP API of the Employees bounded
// context.
//
// The types mirror the published OpenAPI contract of the platform, so the
// frontend consumes the same contract that the backend documents.
// package http

/**
 * The state of a worker as it is published by the API.
 *
 * The state is the labour status of the worker: it is derived from its
 * assignments and it is never edited by hand. The logically deleted workers
 * are never published: the platform excludes them from the listings and
 * answers that they do not exist.
 */
export type EmployeeStatusResource = 'VIGENTE' | 'RETIRADO';

/**
 * The representation of a worker.
 */
export interface EmployeeResource {
  readonly uuid: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly dni: string;
  readonly regimeId: string;
  readonly status: EmployeeStatusResource;
  /** The moment the worker was registered, in the RFC 3339 format. */
  readonly createdAt?: string;
  /** The moment the worker was changed for the last time, in the RFC 3339 format. */
  readonly updatedAt?: string;
}

/**
 * A page of workers.
 */
export interface EmployeePageResource {
  readonly items: readonly EmployeeResource[];
  /** The number of the page, starting at one. */
  readonly page: number;
  /** The number of pages of the listing. */
  readonly totalPages: number;
  /** The number of records that match the query. */
  readonly total: number;
}

/**
 * The body of the registration of a worker.
 */
export interface CreateEmployeeRequest {
  readonly firstName: string;
  readonly lastName: string;
  readonly dni: string;
  readonly regimeId: string;
}

/**
 * The body of the modification of a worker.
 *
 * An absent field keeps the current value.
 *
 * The labour status is not part of the body: it is derived from the
 * assignments of the worker and it is never edited by hand.
 */
export interface UpdateEmployeeRequest {
  readonly firstName?: string;
  readonly lastName?: string;
  readonly dni?: string;
  readonly regimeId?: string;
}

/**
 * The invalid field of a failed request.
 */
export interface FieldErrorResource {
  readonly field?: string;
  readonly message?: string;
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
