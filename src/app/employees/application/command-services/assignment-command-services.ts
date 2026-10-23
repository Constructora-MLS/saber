// Package commandservices holds the use cases that change the state of the
// Assignments bounded context.
//
// Every use case validates the intent of the command against the invariants
// of the domain before it reaches the registry.
// package commandservices

import { inject, Injectable } from '@angular/core';
import {
  CeaseAssignmentCommand,
  CreateAssignmentCommand,
  DeleteAssignmentCommand,
  UpdateAssignmentCommand,
} from '../commands/assignment-commands';
import { Assignment } from '../../domain/model/aggregates/assignment';
import { AssignmentDate } from '../../domain/model/value-objects/assignment-date';
import { AssignmentId } from '../../domain/model/value-objects/assignment-id';
import { EmployeeId } from '../../domain/model/value-objects/employee-id';
import { PositionId } from '../../domain/model/value-objects/position-id';
import { WorkUnitId } from '../../domain/model/value-objects/work-unit-id';
import {
  ASSIGNMENT_REPOSITORY,
  AssignmentChanges,
  NewAssignment,
} from '../../domain/repositories/assignment-repositories';

/**
 * CreateAssignmentCommandService registers an assignment of a worker.
 */
@Injectable({ providedIn: 'root' })
export class CreateAssignmentCommandService {
  private readonly repository = inject(ASSIGNMENT_REPOSITORY);

  /**
   * execute registers the assignment.
   *
   * The assignment always starts vigente and open: the cessation is the
   * only way to close its period.
   */
  async execute(command: CreateAssignmentCommand): Promise<Assignment> {
    const assignment: NewAssignment = {
      employeeId: EmployeeId.create(command.employeeId),
      workUnitId: WorkUnitId.create(command.workUnitId),
      positionId: PositionId.create(command.positionId),
      startDate: AssignmentDate.create(command.startDate, 'startDate'),
    };

    return this.repository.createAssignment(assignment);
  }
}

/**
 * UpdateAssignmentCommandService modifies editable details of an assignment.
 */
@Injectable({ providedIn: 'root' })
export class UpdateAssignmentCommandService {
  private readonly repository = inject(ASSIGNMENT_REPOSITORY);

  async execute(command: UpdateAssignmentCommand): Promise<Assignment> {
    const changes: AssignmentChanges = {
      id: AssignmentId.create(command.uuid),
      ...(command.workUnitId !== undefined
        ? { workUnitId: WorkUnitId.create(command.workUnitId) }
        : {}),
      ...(command.positionId !== undefined
        ? { positionId: PositionId.create(command.positionId) }
        : {}),
      ...(command.startDate !== undefined
        ? { startDate: AssignmentDate.create(command.startDate, 'startDate') }
        : {}),
    };

    return this.repository.updateAssignment(changes);
  }
}

/**
 * CeaseAssignmentCommandService records the effective end date of an assignment.
 */
@Injectable({ providedIn: 'root' })
export class CeaseAssignmentCommandService {
  private readonly repository = inject(ASSIGNMENT_REPOSITORY);

  /**
   * execute applies the cessation.
   *
   * Future dates are accepted and become effective without a scheduled write.
   */
  async execute(command: CeaseAssignmentCommand): Promise<Assignment> {
    const id = AssignmentId.create(command.uuid);
    const date = AssignmentDate.create(command.date, 'date');

    return this.repository.ceaseAssignment(id, date);
  }
}

/**
 * DeleteAssignmentCommandService logically deletes an assignment.
 */
@Injectable({ providedIn: 'root' })
export class DeleteAssignmentCommandService {
  private readonly repository = inject(ASSIGNMENT_REPOSITORY);

  async execute(command: DeleteAssignmentCommand): Promise<void> {
    await this.repository.deleteAssignment(AssignmentId.create(command.uuid));
  }
}
