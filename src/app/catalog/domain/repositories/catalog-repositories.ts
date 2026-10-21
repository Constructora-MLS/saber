import { InjectionToken } from '@angular/core';
import { Position } from '../model/aggregates/position';
import { Regime } from '../model/aggregates/regime';
import { Service } from '../model/aggregates/service';
import { WorkUnit } from '../model/aggregates/work-unit';
import { CatalogName } from '../model/value-objects/catalog-name';
import { CatalogStatus } from '../model/value-objects/catalog-status';
import { Description } from '../model/value-objects/description';
import { UnitCode } from '../model/value-objects/unit-code';

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
  /** The prefix searched in the name. */
  readonly search?: string;
  /** The state the records are filtered by. */
  readonly status?: CatalogStatus;
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
 */
export interface NewWorkUnit {
  readonly code: UnitCode;
  readonly name: CatalogName;
  readonly description: Description | null;
  readonly serviceId: string;
}

/**
 * ServiceRepository is the port of the registry of the services.
 */
export interface ServiceRepository {
  listServices(criteria: CatalogCriteria): Promise<CatalogPage<Service>>;
  createService(service: NewService): Promise<Service>;
}

/**
 * PositionRepository is the port of the registry of the positions.
 */
export interface PositionRepository {
  listPositions(criteria: CatalogCriteria): Promise<CatalogPage<Position>>;
  createPosition(position: NewPosition): Promise<Position>;
}

/**
 * RegimeRepository is the port of the registry of the regimes.
 */
export interface RegimeRepository {
  listRegimes(criteria: CatalogCriteria): Promise<CatalogPage<Regime>>;
  createRegime(regime: NewRegime): Promise<Regime>;
}

/**
 * WorkUnitRepository is the port of the registry of the work units.
 */
export interface WorkUnitRepository {
  listWorkUnits(criteria: WorkUnitCriteria): Promise<CatalogPage<WorkUnit>>;
  createWorkUnit(workUnit: NewWorkUnit): Promise<WorkUnit>;
}

/** The token of the registry of the services. */
export const SERVICE_REPOSITORY = new InjectionToken<ServiceRepository>('SERVICE_REPOSITORY');

/** The token of the registry of the positions. */
export const POSITION_REPOSITORY = new InjectionToken<PositionRepository>('POSITION_REPOSITORY');

/** The token of the registry of the regimes. */
export const REGIME_REPOSITORY = new InjectionToken<RegimeRepository>('REGIME_REPOSITORY');

/** The token of the registry of the work units. */
export const WORK_UNIT_REPOSITORY = new InjectionToken<WorkUnitRepository>('WORK_UNIT_REPOSITORY');
