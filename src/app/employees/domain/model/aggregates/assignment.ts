// Package aggregates holds the aggregate roots of the Assignments bounded
// context.
// package aggregates

import { AssignmentDate } from '../value-objects/assignment-date';
import { AssignmentId } from '../value-objects/assignment-id';
import { AssignmentStatus } from '../value-objects/assignment-status';
import { EmployeeId } from '../value-objects/employee-id';
import { PositionId } from '../value-objects/position-id';
import { WorkUnitId } from '../value-objects/work-unit-id';

/**
 * Assignment is the aggregate root of an assignment.
 *
 * An assignment is the link between a worker, a unit of work and a
 * position, with its labour period. The worker, the unit of work and the
 * position are references: the aggregate knows their identifiers and never
 * their models.
 */
export class Assignment {
  private constructor(
    readonly id: AssignmentId,
    readonly employeeId: EmployeeId,
    readonly workUnitId: WorkUnitId,
    readonly positionId: PositionId,
    readonly startDate: AssignmentDate,
    readonly endDate: AssignmentDate | null,
    readonly status: AssignmentStatus,
  ) {}

  /**
   * create builds the assignment that the platform accepted.
   *
   * The assignment always starts vigente and open: the cessation is the
   * only way to close the period.
   */
  static create(
    id: AssignmentId,
    employeeId: EmployeeId,
    workUnitId: WorkUnitId,
    positionId: PositionId,
    startDate: AssignmentDate,
  ): Assignment {
    return new Assignment(id, employeeId, workUnitId, positionId, startDate, null, 'VIGENTE');
  }

  /**
   * restore rebuilds the assignment from its published representation.
   */
  static restore(
    id: AssignmentId,
    employeeId: EmployeeId,
    workUnitId: WorkUnitId,
    positionId: PositionId,
    startDate: AssignmentDate,
    endDate: AssignmentDate | null,
    status: AssignmentStatus,
  ): Assignment {
    return new Assignment(id, employeeId, workUnitId, positionId, startDate, endDate, status);
  }

  /**
   * isOpen reports whether the labour period of the assignment is open.
   */
  get isOpen(): boolean {
    return this.status === 'VIGENTE';
  }
}
