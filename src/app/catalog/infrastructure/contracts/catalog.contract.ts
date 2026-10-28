// Package http holds the contracts of the HTTP API of the Catalog bounded
// context.
//
// The types mirror the published OpenAPI contract of the platform, so the
// frontend consumes the same contract that the backend documents.
// package http

/** The state of a record as it is published by the API. */
export type CatalogStatusResource = 'ACTIVE' | 'INACTIVE';

/** The representation of a service. */
export interface ServiceResource {
  readonly uuid: string;
  readonly name: string;
  readonly description?: string;
  readonly status: CatalogStatusResource;
  /** The moment the record was registered, in the RFC 3339 format. */
  readonly createdAt?: string;
  /** The moment the record was changed for the last time, in the RFC 3339 format. */
  readonly updatedAt?: string;
}

/** The representation of a position. */
export interface PositionResource {
  readonly uuid: string;
  readonly name: string;
  readonly description?: string;
  readonly status: CatalogStatusResource;
  /** The moment the record was registered, in the RFC 3339 format. */
  readonly createdAt?: string;
  /** The moment the record was changed for the last time, in the RFC 3339 format. */
  readonly updatedAt?: string;
}

/** The representation of a regime. */
export interface RegimeResource {
  readonly uuid: string;
  readonly name: string;
  readonly description?: string;
  readonly status: CatalogStatusResource;
  /** The moment the record was registered, in the RFC 3339 format. */
  readonly createdAt?: string;
  /** The moment the record was changed for the last time, in the RFC 3339 format. */
  readonly updatedAt?: string;
}

/** The representation of a work unit. */
export interface WorkUnitResource {
  readonly uuid: string;
  readonly code: string;
  readonly name: string;
  readonly description?: string;
  readonly serviceId: string;
  /** The name of the service the work unit belongs to. */
  readonly serviceName: string;
  readonly status: CatalogStatusResource;
  /** The moment the record was registered, in the RFC 3339 format. */
  readonly createdAt?: string;
  /** The moment the record was changed for the last time, in the RFC 3339 format. */
  readonly updatedAt?: string;
}

/** A page of services. */
export interface ServicePageResource {
  readonly items: readonly ServiceResource[];
  /** The number of the page, starting at one. */
  readonly page: number;
  /** The number of pages of the listing. */
  readonly totalPages: number;
  /** The number of records that match the query. */
  readonly total: number;
}

/** A page of positions. */
export interface PositionPageResource {
  readonly items: readonly PositionResource[];
  /** The number of the page, starting at one. */
  readonly page: number;
  /** The number of pages of the listing. */
  readonly totalPages: number;
  /** The number of records that match the query. */
  readonly total: number;
}

/** A page of regimes. */
export interface RegimePageResource {
  readonly items: readonly RegimeResource[];
  /** The number of the page, starting at one. */
  readonly page: number;
  /** The number of pages of the listing. */
  readonly totalPages: number;
  /** The number of records that match the query. */
  readonly total: number;
}

/** A page of work units. */
export interface WorkUnitPageResource {
  readonly items: readonly WorkUnitResource[];
  /** The number of the page, starting at one. */
  readonly page: number;
  /** The number of pages of the listing. */
  readonly totalPages: number;
  /** The number of records that match the query. */
  readonly total: number;
}

/** The body of the creation of a service. */
export interface CreateServiceRequest {
  readonly name: string;
  readonly description?: string | null;
}

/** The body of the creation of a position. */
export interface CreatePositionRequest {
  readonly name: string;
  readonly description?: string | null;
}

/** The body of the creation of a regime. */
export interface CreateRegimeRequest {
  readonly name: string;
  readonly description?: string | null;
}

/** The body of the creation of a work unit. */
export interface CreateWorkUnitRequest {
  readonly name: string;
  readonly description?: string | null;
  readonly serviceId: string;
}

/**
 * The body of the modification of a service.
 *
 * An absent field keeps the current value. An empty description removes
 * the description of the record.
 */
export interface UpdateServiceRequest {
  readonly name?: string;
  readonly description?: string;
  readonly status?: CatalogStatusResource;
}

/**
 * The body of the modification of a position.
 */
export interface UpdatePositionRequest {
  readonly name?: string;
  readonly description?: string;
  readonly status?: CatalogStatusResource;
}

/**
 * The body of the modification of a regime.
 */
export interface UpdateRegimeRequest {
  readonly name?: string;
  readonly description?: string;
  readonly status?: CatalogStatusResource;
}

/**
 * The body of the modification of a work unit.
 *
 * An absent field keeps the current value.
 *
 * The code is not part of the request: the platform drew it when the work
 * unit was registered and it never changes.
 */
export interface UpdateWorkUnitRequest {
  readonly name?: string;
  readonly description?: string;
  readonly serviceId?: string;
  readonly status?: CatalogStatusResource;
}

/**
 * The invalid field of a failed request and the RFC 9457 representation of
 * a failure of the API are the envelope of the platform: they are declared
 * once, in the shared module, and re-exported here for the consumers of this
 * contract.
 */
export type { FieldErrorResource, ProblemResource } from '../../../shared/infrastructure/http/problem';
