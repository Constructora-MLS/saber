import { inject, Injectable } from '@angular/core';
import {
  AssignmentCriteria,
  AssignmentPage,
  ListAssignmentsQuery,
} from '../queries/assignment-queries';
import { Assignment } from '../../domain/model/aggregates/assignment';
import { Employee } from '../../domain/model/aggregates/employee';
import { EmployeeId } from '../../domain/model/value-objects/employee-id';
import { CatalogReferenceAcl } from '../../infrastructure/acl/catalog-reference.acl';
import { EmployeeStatus } from '../../domain/model/value-objects/employee-status';
import { AssignmentGateway } from '../../infrastructure/gateways/assignment.gateway';
import { EmployeeGateway } from '../../infrastructure/gateways/employee.gateway';

export interface WorkerRecord {
  readonly id: string;
  readonly name: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly regimeId: string;
  readonly documentValue: string;
  readonly regimeName: string | null;
  readonly status: EmployeeStatus;
}

@Injectable({ providedIn: 'root' })
export class ListAssignmentsQueryService {
  private readonly gateway = inject(AssignmentGateway);

  async execute(query: ListAssignmentsQuery): Promise<AssignmentPage<Assignment>> {
    return this.gateway.listAssignments(this.criteria(query));
  }

  private criteria(query: ListAssignmentsQuery): AssignmentCriteria {
    return {
      employeeId: query.employeeId,
      status: query.status,
      limit: query.limit,
      page: query.page,
    };
  }
}

@Injectable({ providedIn: 'root' })
export class GetWorkerRecordQueryService {
  private readonly employees = inject(EmployeeGateway);
  private readonly catalog = inject(CatalogReferenceAcl);

  async execute(employeeId: string): Promise<WorkerRecord | null> {
    const worker = await this.findWorker(employeeId);
    if (!worker) {
      return null;
    }

    const regimes = await this.regimes([worker.regimeId.value]);

    return {
      id: worker.id.value,
      name: worker.fullName,
      firstName: worker.firstName.value,
      lastName: worker.lastName.value,
      documentValue: worker.dni.value,
      regimeId: worker.regimeId.value,
      regimeName: regimes.get(worker.regimeId.value)?.name ?? null,
      status: worker.status,
    };
  }

  private async findWorker(employeeId: string): Promise<Employee | null> {
    try {
      return await this.employees.findEmployee(EmployeeId.create(employeeId));
    } catch {
      return null;
    }
  }

  private async regimes(
    regimeIds: readonly string[],
  ): Promise<ReadonlyMap<string, { readonly name: string }>> {
    try {
      return await this.catalog.resolveRegimes(regimeIds);
    } catch {
      return new Map();
    }
  }
}
