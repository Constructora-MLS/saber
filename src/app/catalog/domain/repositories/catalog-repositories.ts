import { InjectionToken } from '@angular/core';
import { Position } from '../model/aggregates/position';
import { Regime } from '../model/aggregates/regime';
import { Service } from '../model/aggregates/service';
import { WorkUnit } from '../model/aggregates/work-unit';
import { CatalogName } from '../model/value-objects/catalog-name';
import {
  FilterableCatalogStatus,
  UpdatableCatalogStatus,
} from '../model/value-objects/catalog-status';
import { Description } from '../model/value-objects/description';

/**
 * CatalogPage is a page of a listing.
 *
 * The pagination is by keyset, so the cursor is opaque and it points to the
 * next position of the order.
 */
export interface CatalogPage<T> {
  /** The records of the page. It is never empty by contract. */
  readonly items: readonly T[];
  /** The opaque cursor of the next page, when it exists. */
  readonly nextCursor: string | null;
}

/**
 * CatalogCriteria are the filters shared by every listing of the context.
 */
export interface CatalogCriteria {
  /**
   * Services, positions and regimes match name prefixes. Work units match a
   * case-insensitive substring of their code or name.
   */
  readonly search?: string;
  /** The state the records are filtered by. */
  readonly status?: FilterableCatalogStatus;
  /** The size of the page. */
  readonly limit?: number;
  /** The opaque cursor of the previous page. */
  readonly cursor?: string;
}

/**
 * WorkUnitCriteria are the filters of the listing of the work units.
 */
export interface WorkUnitCriteria extends CatalogCriteria {
  /** The service the work units belong to. */
  readonly serviceId?: string;
}

/**
 * NewService is the service that a worker of the application asks to
 * register.
 */
export interface NewService {
  readonly name: CatalogName;
  readonly description: Description | null;
}

/**
 * NewPosition is the position that a worker of the application asks to
 * register.
 */
export interface NewPosition {
  readonly name: CatalogName;
  readonly description: Description | null;
}

/**
 * NewRegime is the regime that a worker of the application asks to register.
 */
export interface NewRegime {
  readonly name: CatalogName;
  readonly description: Description | null;
}

/**
 * NewWorkUnit is the work unit that a worker of the application asks to
 * register.
 *
 * The code is not part of it: the platform draws the code and returns it in
 * the registered work unit.
 */
export interface NewWorkUnit {
  readonly name: CatalogName;
  readonly description: Description | null;
  readonly serviceId: string;
}

/**
 * ServiceChanges are the changes of a service that the platform accepts.
 */
export interface ServiceChanges {
  /** The identifier of the service. */
  readonly id: string;
  /** The new name of the service. */
  readonly name: CatalogName;
  /** The new description of the service. A null description removes it. */
  readonly description: Description | null;
  /** The new state of the service. */
  readonly status: UpdatableCatalogStatus;
}

/**
 * PositionChanges are the changes of a position that the platform accepts.
 */
export interface PositionChanges {
  /** The identifier of the position. */
  readonly id: string;
  /** The new name of the position. */
  readonly name: CatalogName;
  /** The new description of the position. A null description removes it. */
  readonly description: Description | null;
  /** The new state of the position. */
  readonly status: UpdatableCatalogStatus;
}

/**
 * RegimeChanges are the changes of a regime that the platform accepts.
 */
export interface RegimeChanges {
  /** The identifier of the regime. */
  readonly id: string;
  /** The new name of the regime. */
  readonly name: CatalogName;
  /** The new description of the regime. A null description removes it. */
  readonly description: Description | null;
  /** The new state of the regime. */
  readonly status: UpdatableCatalogStatus;
}

/**
 * WorkUnitChanges are the changes of a work unit that the platform accepts.
 */
export interface WorkUnitChanges {
  /** The identifier of the work unit. */
  readonly id: string;
  /** The new name of the work unit. */
  readonly name: CatalogName;
  /** The new description of the work unit. A null description removes it. */
  readonly description: Description | null;
  /**
   * The new service of the work unit.
   *
   * It is omitted when the service does not change, so the platform keeps
   * the current service.
   */
  readonly serviceId?: string;
  /** The new state of the work unit. */
  readonly status: UpdatableCatalogStatus;
}

/**
 * ServiceRepository is the port of the registry of the services.
 */
export interface ServiceRepository {
  listServices(criteria: CatalogCriteria): Promise<CatalogPage<Service>>;
  createService(service: NewService): Promise<Service>;
  updateService(changes: ServiceChanges): Promise<Service>;
  deleteService(id: string): Promise<void>;
}

/**
 * PositionRepository is the port of the registry of the positions.
 */
export interface PositionRepository {
  listPositions(criteria: CatalogCriteria): Promise<CatalogPage<Position>>;
  createPosition(position: NewPosition): Promise<Position>;
  updatePosition(changes: PositionChanges): Promise<Position>;
  deletePosition(id: string): Promise<void>;
}

/**
 * RegimeRepository is the port of the registry of the regimes.
 */
export interface RegimeRepository {
  listRegimes(criteria: CatalogCriteria): Promise<CatalogPage<Regime>>;
  createRegime(regime: NewRegime): Promise<Regime>;
  updateRegime(changes: RegimeChanges): Promise<Regime>;
  deleteRegime(id: string): Promise<void>;
}

/**
 * WorkUnitRepository is the port of the registry of the work units.
 */
export interface WorkUnitRepository {
  listWorkUnits(criteria: WorkUnitCriteria): Promise<CatalogPage<WorkUnit>>;
  createWorkUnit(workUnit: NewWorkUnit): Promise<WorkUnit>;
  updateWorkUnit(changes: WorkUnitChanges): Promise<WorkUnit>;
  deleteWorkUnit(id: string): Promise<void>;
}

/** The token of the registry of the services. */
export const SERVICE_REPOSITORY = new InjectionToken<ServiceRepository>('SERVICE_REPOSITORY');

/** The token of the registry of the positions. */
export const POSITION_REPOSITORY = new InjectionToken<PositionRepository>('POSITION_REPOSITORY');

/** The token of the registry of the regimes. */
export const REGIME_REPOSITORY = new InjectionToken<RegimeRepository>('REGIME_REPOSITORY');

/** The token of the registry of the work units. */
export const WORK_UNIT_REPOSITORY = new InjectionToken<WorkUnitRepository>('WORK_UNIT_REPOSITORY');
