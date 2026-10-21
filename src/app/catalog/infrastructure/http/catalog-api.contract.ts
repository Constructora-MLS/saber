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
}

/** The representation of a position. */
export interface PositionResource {
  readonly uuid: string;
  readonly name: string;
  readonly description?: string;
  readonly status: CatalogStatusResource;
}

/** The representation of a regime. */
export interface RegimeResource {
  readonly uuid: string;
  readonly name: string;
  readonly description?: string;
  readonly status: CatalogStatusResource;
}

/** The representation of a work unit. */
export interface WorkUnitResource {
  readonly uuid: string;
  readonly code: string;
  readonly name: string;
  readonly description?: string;
  readonly serviceId: string;
  readonly status: CatalogStatusResource;
}

/** A page of services. */
export interface ServicePageResource {
  readonly items: readonly ServiceResource[];
  readonly nextCursor: string | null;
}

/** A page of positions. */
export interface PositionPageResource {
  readonly items: readonly PositionResource[];
  readonly nextCursor: string | null;
}

/** A page of regimes. */
export interface RegimePageResource {
  readonly items: readonly RegimeResource[];
  readonly nextCursor: string | null;
}

/** A page of work units. */
export interface WorkUnitPageResource {
  readonly items: readonly WorkUnitResource[];
  readonly nextCursor: string | null;
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
  readonly code: string;
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
 */
export interface UpdateWorkUnitRequest {
  readonly code?: string;
  readonly name?: string;
  readonly description?: string;
  readonly serviceId?: string;
  readonly status?: CatalogStatusResource;
}

/** The invalid field of a failed request. */
export interface FieldErrorResource {
  readonly field?: string;
  readonly message?: string;
}

/** The RFC 9457 representation of a failure of the API. */
export interface ProblemResource {
  readonly type?: string;
  readonly title?: string;
  readonly status?: number;
  readonly detail?: string;
  readonly code?: string;
  readonly errors?: readonly FieldErrorResource[];
}
