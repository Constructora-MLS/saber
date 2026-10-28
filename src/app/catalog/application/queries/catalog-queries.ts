// Package queries holds the queries of the Catalog bounded context.
//
// A query requests information without changing the state of the context.
// package queries

import { FilterableCatalogStatus } from '../../domain/model/value-objects/catalog-status';

/**
 * CatalogPage is a page of a listing.
 */
export interface CatalogPage<T> {
  /** The records of the page. It is never empty by contract. */
  readonly items: readonly T[];
  /** The number of the page, starting at one. */
  readonly page: number;
  /** The number of pages of the listing. */
  readonly totalPages: number;
  /** The number of records that match the query. */
  readonly total: number;
}

/**
 * CatalogCriteria are the filters shared by every listing of the context.
 */
export interface CatalogCriteria {
  readonly search?: string;
  readonly status?: FilterableCatalogStatus;
  readonly limit?: number;
  readonly page?: number;
}

/**
 * WorkUnitCriteria are the filters of the listing of the work units.
 */
export interface WorkUnitCriteria extends CatalogCriteria {
  readonly serviceId?: string;
}

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
  /** The number of the requested page, starting at one. */
  readonly page?: number;
}

/**
 * ListPositionsQuery asks for a page of the positions.
 */
export interface ListPositionsQuery {
  readonly search?: string;
  readonly status?: FilterableCatalogStatus;
  readonly limit?: number;
  /** The number of the requested page, starting at one. */
  readonly page?: number;
}

/**
 * ListRegimesQuery asks for a page of the regimes.
 */
export interface ListRegimesQuery {
  readonly search?: string;
  readonly status?: FilterableCatalogStatus;
  readonly limit?: number;
  /** The number of the requested page, starting at one. */
  readonly page?: number;
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
  /** The number of the requested page, starting at one. */
  readonly page?: number;
}
