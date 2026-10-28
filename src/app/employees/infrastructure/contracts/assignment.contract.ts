// Package http holds the contracts of the HTTP API of the Assignments
// bounded context.
//
// The types mirror the published OpenAPI contract of the platform, so the
// frontend consumes the same contract that the backend documents.
// package http

/**
 * The state of an assignment as it is published by the API.
 *
 * The logically deleted assignments are never published: the platform
 * excludes them from the listings and answers that they do not exist.
 */
export type AssignmentStatusResource = 'VIGENTE' | 'RETIRADO';

/**
 * The representation of an assignment.
 */
export interface AssignmentResource {
  readonly uuid: string;
  /** The worker the assignment belongs to. */
  readonly employeeId: string;
  /** The unit of work the worker is assigned to. */
  readonly workUnitId: string;
  /** The position the worker performs. */
  readonly positionId: string;
  /** The date the labour period starts, in the YYYY-MM-DD format. */
  readonly startDate: string;
  /**
   * The date the labour period was closed, in the YYYY-MM-DD format.
   *
   * It is null while the period is open.
   */
  readonly endDate: string | null;
  readonly status: AssignmentStatusResource;
  /** The moment the assignment was registered, in the RFC 3339 format. */
  readonly createdAt?: string;
  /** The moment the assignment was changed for the last time, in the RFC 3339 format. */
  readonly updatedAt?: string;
}

/**
 * A page of assignments.
 */
export interface AssignmentPageResource {
  readonly items: readonly AssignmentResource[];
  /** The number of the page, starting at one. */
  readonly page: number;
  /** The number of pages of the listing. */
  readonly totalPages: number;
  /** The number of records that match the query. */
  readonly total: number;
}

/**
 * The body of the registration of an assignment.
 *
 * The state and the date of the cessation are not part of the request: the
 * assignment always starts vigente and open, and the cessation is its own
 * operation.
 */
export interface CreateAssignmentRequest {
  readonly employeeId: string;
  readonly workUnitId: string;
  readonly positionId: string;
  readonly startDate: string;
}

/**
 * The body of a partial update of an assignment.
 */
export interface UpdateAssignmentRequest {
  readonly workUnitId?: string;
  readonly positionId?: string;
  readonly startDate?: string;
}

/**
 * The body of recording the effective end date of an assignment.
 */
export interface CeaseAssignmentRequest {
  readonly date: string;
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
