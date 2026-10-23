// Package commandservices holds the use cases that change the state of the
// Employees bounded context.
//
// Every use case validates the intent of the command against the invariants
// of the domain before it reaches the registry.
// package commandservices

import { inject, Injectable } from '@angular/core';
import {
  CreateEmployeeCommand,
  DeleteEmployeeCommand,
  UpdateEmployeeCommand,
} from '../commands/employee-commands';
import { Employee } from '../../domain/model/aggregates/employee';
import { DNI } from '../../domain/model/value-objects/dni';
import { EmployeeId } from '../../domain/model/value-objects/employee-id';
import { PersonName } from '../../domain/model/value-objects/person-name';
import { RegimeId } from '../../domain/model/value-objects/regime-id';
import {
  EMPLOYEE_REPOSITORY,
  EmployeeChanges,
  NewEmployee,
} from '../../domain/repositories/employee-repositories';

/**
 * CreateEmployeeCommandService registers a worker of the platform.
 */
@Injectable({ providedIn: 'root' })
export class CreateEmployeeCommandService {
  private readonly repository = inject(EMPLOYEE_REPOSITORY);

  async execute(command: CreateEmployeeCommand): Promise<Employee> {
    const worker: NewEmployee = {
      firstName: PersonName.create(command.firstName),
      lastName: PersonName.create(command.lastName),
      dni: DNI.create(command.dni),
      regimeId: RegimeId.create(command.regimeId),
    };

    return this.repository.createEmployee(worker);
  }
}

/**
 * UpdateEmployeeCommandService modifies the data of a worker.
 */
@Injectable({ providedIn: 'root' })
export class UpdateEmployeeCommandService {
  private readonly repository = inject(EMPLOYEE_REPOSITORY);

  /**
   * execute applies the changes to a worker.
   *
   * Only the fields that the command carries are validated and sent: the
   * fields that are absent keep the value that the record already has.
   */
  async execute(command: UpdateEmployeeCommand): Promise<Employee> {
    const changes: EmployeeChanges = {
      id: EmployeeId.create(command.uuid),
      ...(command.firstName !== undefined
        ? { firstName: PersonName.create(command.firstName) }
        : {}),
      ...(command.lastName !== undefined ? { lastName: PersonName.create(command.lastName) } : {}),
      ...(command.dni !== undefined ? { dni: DNI.create(command.dni) } : {}),
      ...(command.regimeId !== undefined ? { regimeId: RegimeId.create(command.regimeId) } : {}),
    };

    return this.repository.updateEmployee(changes);
  }
}

/**
 * DeleteEmployeeCommandService logically deletes a worker.
 */
@Injectable({ providedIn: 'root' })
export class DeleteEmployeeCommandService {
  private readonly repository = inject(EMPLOYEE_REPOSITORY);

  async execute(command: DeleteEmployeeCommand): Promise<void> {
    await this.repository.deleteEmployee(EmployeeId.create(command.uuid));
  }
}
