// Package queries holds the queries of the Catalog bounded context.
//
// A query requests information without changing the state of the context.
// package queries

import { FilterableCatalogStatus } from '../../domain/model/value-objects/catalog-status';

/**
 * ListServicesQuery asks for a page of the services.
 */
export interface ListServicesQuery {
  /** The term searched in the names of the services. */
  readonly search?: string;
  /** The state the services are filtered by. */
  readonly status?: FilterableCatalogStatus;
  /** The size of the page. */
  readonly limit?: number;
  /** The opaque cursor of the previous page. */
  readonly cursor?: string;
}

/**
 * ListPositionsQuery asks for a page of the positions.
 */
export interface ListPositionsQuery {
  readonly search?: string;
  readonly status?: FilterableCatalogStatus;
  readonly limit?: number;
  readonly cursor?: string;
}

/**
 * ListRegimesQuery asks for a page of the regimes.
 */
export interface ListRegimesQuery {
  readonly search?: string;
  readonly status?: FilterableCatalogStatus;
  readonly limit?: number;
  readonly cursor?: string;
}

/**
 * ListWorkUnitsQuery asks for a page of the work units.
 */
export interface ListWorkUnitsQuery {
  /** Case-insensitive substring matched in the code or name. */
  readonly search?: string;
  readonly status?: FilterableCatalogStatus;
  readonly serviceId?: string;
  readonly limit?: number;
  readonly cursor?: string;
}
