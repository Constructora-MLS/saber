import { CatalogStatus } from '../value-objects/catalog-status';
import { CatalogName } from '../value-objects/catalog-name';
import { Description } from '../value-objects/description';
import { UnitCode } from '../value-objects/unit-code';

/**
 * WorkUnit is the aggregate root of a work unit.
 *
 * A work unit is an obra or an expediente that belongs to a service and
 * that carries the assignments of the workers.
 */
export class WorkUnit {
  private constructor(
    readonly id: string,
    readonly code: UnitCode,
    readonly name: CatalogName,
    readonly description: Description | null,
    readonly serviceId: string,
    readonly status: CatalogStatus,
  ) {}

  /**
   * create builds the work unit that the platform accepted.
   */
  static create(
    id: string,
    code: UnitCode,
    name: CatalogName,
    description: Description | null,
    serviceId: string,
    status: CatalogStatus,
  ): WorkUnit {
    return new WorkUnit(id, code, name, description, serviceId, status);
  }

  /**
   * restore rebuilds the work unit from its persisted state.
   */
  static restore(
    id: string,
    code: UnitCode,
    name: CatalogName,
    description: Description | null,
    serviceId: string,
    status: CatalogStatus,
  ): WorkUnit {
    return new WorkUnit(id, code, name, description, serviceId, status);
  }
}
