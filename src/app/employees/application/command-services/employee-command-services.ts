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
  EmployeeChanges,
  EmployeeGateway,
  NewEmployee,
} from '../../infrastructure/gateways/employee.gateway';

@Injectable({ providedIn: 'root' })
export class CreateEmployeeCommandService {
  private readonly gateway = inject(EmployeeGateway);

  async execute(command: CreateEmployeeCommand): Promise<Employee> {
    const worker: NewEmployee = {
      firstName: PersonName.create(command.firstName),
      lastName: PersonName.create(command.lastName),
      dni: DNI.create(command.dni),
      regimeId: RegimeId.create(command.regimeId),
    };

    return this.gateway.createEmployee(worker);
  }
}

@Injectable({ providedIn: 'root' })
export class UpdateEmployeeCommandService {
  private readonly gateway = inject(EmployeeGateway);

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

    return this.gateway.updateEmployee(changes);
  }
}

@Injectable({ providedIn: 'root' })
export class DeleteEmployeeCommandService {
  private readonly gateway = inject(EmployeeGateway);

  async execute(command: DeleteEmployeeCommand): Promise<void> {
    await this.gateway.deleteEmployee(EmployeeId.create(command.uuid));
  }
}
