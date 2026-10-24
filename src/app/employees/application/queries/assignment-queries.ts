// Package queries holds the queries of the Assignments bounded context.
//
// A query requests information without changing the state of the context.
// package queries

import { FilterableAssignmentStatus } from '../../domain/model/value-objects/assignment-status';

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
