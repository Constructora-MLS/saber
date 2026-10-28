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
  AssignmentChanges,
  AssignmentGateway,
  NewAssignment,
} from '../../infrastructure/gateways/assignment.gateway';

@Injectable({ providedIn: 'root' })
export class CreateAssignmentCommandService {
  private readonly gateway = inject(AssignmentGateway);

  async execute(command: CreateAssignmentCommand): Promise<Assignment> {
    const assignment: NewAssignment = {
      employeeId: EmployeeId.create(command.employeeId),
      workUnitId: WorkUnitId.create(command.workUnitId),
      positionId: PositionId.create(command.positionId),
      startDate: AssignmentDate.create(command.startDate, 'startDate'),
    };

    return this.gateway.createAssignment(assignment);
  }
}

@Injectable({ providedIn: 'root' })
export class UpdateAssignmentCommandService {
  private readonly gateway = inject(AssignmentGateway);

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

    return this.gateway.updateAssignment(changes);
  }
}

@Injectable({ providedIn: 'root' })
export class CeaseAssignmentCommandService {
  private readonly gateway = inject(AssignmentGateway);

  async execute(command: CeaseAssignmentCommand): Promise<Assignment> {
    const id = AssignmentId.create(command.uuid);
    const date = AssignmentDate.create(command.date, 'date');

    return this.gateway.ceaseAssignment(id, date);
  }
}

@Injectable({ providedIn: 'root' })
export class DeleteAssignmentCommandService {
  private readonly gateway = inject(AssignmentGateway);

  async execute(command: DeleteAssignmentCommand): Promise<void> {
    await this.gateway.deleteAssignment(AssignmentId.create(command.uuid));
  }
}
