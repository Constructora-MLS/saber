// Package repositories holds the ports of the Assignments bounded context.
// package repositories

import { InjectionToken } from '@angular/core';
import { Assignment } from '../model/aggregates/assignment';
import { AssignmentDate } from '../model/value-objects/assignment-date';
import { AssignmentId } from '../model/value-objects/assignment-id';
import { FilterableAssignmentStatus } from '../model/value-objects/assignment-status';
import { EmployeeId } from '../model/value-objects/employee-id';
import { PositionId } from '../model/value-objects/position-id';
import { WorkUnitId } from '../model/value-objects/work-unit-id';

/**
 * AssignmentPage is a page of a listing.
 *
 * The pagination is by page number, so the worker reaches any page of the
 * listing with a single request.
 */
export interface AssignmentPage<T> {
  /** The assignments of the page. It is never empty by contract. */
  readonly items: readonly T[];
  /** The number of the page, starting at one. */
  readonly page: number;
  /** The number of pages of the listing. */
  readonly totalPages: number;
  /** The number of records that match the query. */
  readonly total: number;
}

/**
 * AssignmentCriteria are the filters of the listing of the assignments.
 */
export interface AssignmentCriteria {
  /** The worker the assignments belong to. */
  readonly employeeId: string;
  /** The state the assignments are filtered by. */
  readonly status?: FilterableAssignmentStatus;
  /** The size of the page. */
  readonly limit?: number;
  /** The number of the requested page, starting at one. */
  readonly page?: number;
}

/**
 * NewAssignment is the assignment that a worker of the application asks to
 * register.
 */
export interface NewAssignment {
  /** The worker the assignment belongs to. */
  readonly employeeId: EmployeeId;
  /** The unit of work the worker is assigned to. */
  readonly workUnitId: WorkUnitId;
  /** The position the worker performs. */
  readonly positionId: PositionId;
  /** The date the labour period starts. */
  readonly startDate: AssignmentDate;
}

/**
 * AssignmentRepository is the port of the registry of the assignments.
 */
export interface AssignmentChanges {
  /** The assignment being changed. */
  readonly id: AssignmentId;
  /** The replacement work unit, when changed. */
  readonly workUnitId?: WorkUnitId;
  /** The replacement position, when changed. */
  readonly positionId?: PositionId;
  /** The replacement start date, when changed. */
  readonly startDate?: AssignmentDate;
}

export interface AssignmentRepository {
  listAssignments(criteria: AssignmentCriteria): Promise<AssignmentPage<Assignment>>;
  createAssignment(assignment: NewAssignment): Promise<Assignment>;
  updateAssignment(changes: AssignmentChanges): Promise<Assignment>;
  ceaseAssignment(id: AssignmentId, date: AssignmentDate): Promise<Assignment>;
  deleteAssignment(id: AssignmentId): Promise<void>;
}

/** The token of the registry of the assignments. */
export const ASSIGNMENT_REPOSITORY = new InjectionToken<AssignmentRepository>(
  'ASSIGNMENT_REPOSITORY',
);
