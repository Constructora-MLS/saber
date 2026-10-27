// Package queries holds the queries of the Employees bounded context.
//
// A query requests information without changing the state of the context.
// package queries

import { FilterableEmployeeStatus } from '../../domain/model/value-objects/employee-status';

/**
 * ListEmployeesQuery asks for a page of the workers of the platform.
 */
export interface ListEmployeesQuery {
  /** The term searched in the names and in the DNI. */
  readonly search?: string;
  /** The state the workers are filtered by. */
  readonly status?: FilterableEmployeeStatus;
  /** The size of the page. */
  readonly limit?: number;
  /** The number of the requested page, starting at one. */
  readonly page?: number;
}
