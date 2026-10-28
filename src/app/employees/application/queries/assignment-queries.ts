// Package queries holds the queries of the Assignments bounded context.
//
// A query requests information without changing the state of the context.
// package queries

import { FilterableAssignmentStatus } from '../../domain/model/value-objects/assignment-status';

export interface AssignmentPage<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly totalPages: number;
  readonly total: number;
}

export interface AssignmentCriteria {
  readonly employeeId: string;
  readonly status?: FilterableAssignmentStatus;
  readonly limit?: number;
  readonly page?: number;
}

/**
 * ListAssignmentsQuery asks for a page of the assignments of a worker.
 */
export interface ListAssignmentsQuery {
  /** The worker the assignments belong to. */
  readonly employeeId: string;
  /** The state the assignments are filtered by. */
  readonly status?: FilterableAssignmentStatus;
  /** The size of the page. */
  readonly limit?: number;
  /** The number of the requested page, starting at one. */
  readonly page?: number;
}
