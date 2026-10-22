// Package queries holds the queries of the Employees bounded context.
//
// A query requests information without changing the state of the context.
// package queries

import { FilterableEmployeeStatus } from '../../domain/model/value-objects/employee-status';

/**
 * ListEmployeesQuery asks for a page of the workers of the platform.
 */
export interface ListEmployeesQuery {
  /** The prefix searched in the names and the exact value searched in the DNI. */
  readonly search?: string;
  /** The state the workers are filtered by. */
  readonly status?: FilterableEmployeeStatus;
  /** The size of the page. */
  readonly limit?: number;
  /** The opaque cursor of the previous page. */
  readonly cursor?: string;
}
