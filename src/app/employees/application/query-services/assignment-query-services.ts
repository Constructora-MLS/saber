// Package queryservices holds the use cases that read the state of the
// Employees bounded context.
//
// The listings are served by keyset pagination, so the cursor is opaque and
// it is never composed by the interfaces.
// package queryservices

import { inject, Injectable } from '@angular/core';
import { ListAssignmentsQuery } from '../queries/assignment-queries';
import {
  ASSIGNMENT_REPOSITORY,
  AssignmentCriteria,
  AssignmentPage,
} from '../../domain/repositories/assignment-repositories';
import { Assignment } from '../../domain/model/aggregates/assignment';
import { Employee } from '../../domain/model/aggregates/employee';
import { EmployeeId } from '../../domain/model/value-objects/employee-id';
import {
  CATALOG_REFERENCE_RESOLVER,
  PositionReference,
  WorkUnitReference,
} from '../../domain/services/catalog-reference-resolver';
import { EmployeeStatus } from '../../domain/model/value-objects/employee-status';
import { EMPLOYEE_REPOSITORY } from '../../domain/repositories/employee-repositories';

/**
 * WorkerRecord is the record of the worker that the assignments belong to.
 *
 * The record is the identity of the worker, plus the name of its labor
 * regime: the regime belongs to the Catalog context, so the name is
 * resolved through the anti-corruption layer of that context.
 */
export interface WorkerRecord {
  /** The identifier of the worker. */
  readonly id: string;
  /** The full name of the worker. */
  readonly name: string;
  /** The identity document of the worker. */
  readonly documentValue: string;
  /** The name of the labor regime of the worker, when the catalog answered. */
  readonly regimeName: string | null;
  /** The state of the worker. */
  readonly status: EmployeeStatus;
}

/**
 * AssignmentOptions are the references that a new assignment can point at.
 */
export interface AssignmentOptions {
  /** The units of work that the assignment can point at. */
  readonly workUnits: readonly WorkUnitReference[];
  /** The positions that the assignment can point at. */
  readonly positions: readonly PositionReference[];
}

/**
 * ListAssignmentsQueryService returns the page of the assignments of a
 * worker that matches the query.
 */
@Injectable({ providedIn: 'root' })
export class ListAssignmentsQueryService {
  private readonly repository = inject(ASSIGNMENT_REPOSITORY);

  async execute(query: ListAssignmentsQuery): Promise<AssignmentPage<Assignment>> {
    return this.repository.listAssignments(this.criteria(query));
  }

  private criteria(query: ListAssignmentsQuery): AssignmentCriteria {
    return {
      employeeId: query.employeeId,
      status: query.status,
      limit: query.limit,
      cursor: query.cursor,
    };
  }
}

/**
 * GetWorkerRecordQueryService returns the record of the worker that the
 * assignments belong to.
 */
@Injectable({ providedIn: 'root' })
export class GetWorkerRecordQueryService {
  private readonly employees = inject(EMPLOYEE_REPOSITORY);
  private readonly catalog = inject(CATALOG_REFERENCE_RESOLVER);

  /**
   * execute reads the record of the worker.
   *
   * The name of the regime is a courtesy of the catalog: a catalog that
   * does not answer leaves the record without it, and the record is still
   * shown.
   */
  async execute(employeeId: string): Promise<WorkerRecord | null> {
    const worker = await this.findWorker(employeeId);
    if (!worker) {
      return null;
    }

    const regimes = await this.regimes([worker.regimeId.value]);

    return {
      id: worker.id.value,
      name: worker.fullName,
      documentValue: worker.dni.value,
      regimeName: regimes.get(worker.regimeId.value)?.name ?? null,
      status: worker.status,
    };
  }

  /**
   * findWorker reads the worker of the record.
   *
   * The worker belongs to this context, so it is read through its own
   * registry and never through a contract of another context.
   */
  private async findWorker(employeeId: string): Promise<Employee | null> {
    try {
      return await this.employees.findEmployee(EmployeeId.create(employeeId));
    } catch {
      return null;
    }
  }

  /**
   * regimes asks the catalog for the names of the regimes.
   */
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

/**
 * ListAssignmentOptionsQueryService returns the references that a new
 * assignment can point at.
 */
@Injectable({ providedIn: 'root' })
export class ListAssignmentOptionsQueryService {
  private readonly catalog = inject(CATALOG_REFERENCE_RESOLVER);

  /**
   * execute reads the units of work and the positions of the catalogs.
   */
  async execute(): Promise<AssignmentOptions> {
    const [workUnits, positions] = await Promise.all([
      this.catalog.listWorkUnits(),
      this.catalog.listPositions(),
    ]);

    return { workUnits, positions };
  }
}
