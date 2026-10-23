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
 * The pagination is by keyset, so the cursor is opaque and it points to the
 * next position of the order.
 */
export interface AssignmentPage<T> {
  /** The assignments of the page. It is never empty by contract. */
  readonly items: readonly T[];
  /** The opaque cursor of the next page, when it exists. */
  readonly nextCursor: string | null;
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
  /** The opaque cursor of the previous page. */
  readonly cursor?: string;
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
export interface AssignmentRepository {
  listAssignments(criteria: AssignmentCriteria): Promise<AssignmentPage<Assignment>>;
  createAssignment(assignment: NewAssignment): Promise<Assignment>;
  ceaseAssignment(id: AssignmentId, date: AssignmentDate): Promise<Assignment>;
  deleteAssignment(id: AssignmentId): Promise<void>;
}

/** The token of the registry of the assignments. */
export const ASSIGNMENT_REPOSITORY = new InjectionToken<AssignmentRepository>(
  'ASSIGNMENT_REPOSITORY',
);
