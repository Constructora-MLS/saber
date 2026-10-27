// Package services holds the domain services of the Employees bounded
// context.
//
// A service that talks to another bounded context lives here: it is the port
// of the other context, so this context never depends on its internals.
// package services

import { InjectionToken } from '@angular/core';

/**
 * CatalogAvailability tells whether a record of a catalog can be shown and
 * chosen.
 *
 * The catalog publishes the state of the record; the Employees context reads
 * it as the availability of the reference, because that is the only thing it
 * decides with it.
 */
export type CatalogAvailability = 'ACTIVE' | 'INACTIVE';

/**
 * RegimeReference is a labor regime, as the Employees context knows it.
 */
export interface RegimeReference {
  /** The identifier of the regime. */
  readonly id: string;
  /** The name of the regime. */
  readonly name: string;
  /**
   * Whether the regime is available.
   *
   * An unavailable regime is never offered to choose.
   */
  readonly availability: CatalogAvailability;
}

/**
 * WorkUnitReference is a unit of work, as the Employees context knows it.
 *
 * The unit of work belongs to the Catalog bounded context, so this context
 * keeps only the data it shows and never the model of the unit.
 */
export interface WorkUnitReference {
  /** The identifier of the unit of work. */
  readonly id: string;
  /** The code of the unit of work. */
  readonly code: string;
  /** The name of the unit of work. */
  readonly name: string;
  /** The name of the service the unit of work belongs to. */
  readonly serviceName: string;
  /** Whether the unit of work is available. */
  readonly availability: CatalogAvailability;
}

/**
 * PositionReference is a position, as the Employees context knows it.
 */
export interface PositionReference {
  /** The identifier of the position. */
  readonly id: string;
  /** The name of the position. */
  readonly name: string;
  /** Whether the position is available. */
  readonly availability: CatalogAvailability;
}

/**
 * CatalogReferenceResolver resolves the catalogs that the Employees context
 * points at.
 *
 * The labor regimes, the units of work and the positions belong to the
 * Catalog bounded context, so this context asks for them through this port
 * and keeps only the references in its own model.
 *
 * Every read is a page of the platform, never the whole catalog: a selector
 * asks for the records that match a term and the platform answers with a
 * page.
 */
export interface CatalogReferenceResolver {
  /**
   * resolveRegimes returns the regime of every given reference.
   */
  resolveRegimes(regimeIds: readonly string[]): Promise<ReadonlyMap<string, RegimeReference>>;

  /**
   * listRegimes returns the available regimes that match the term.
   *
   * An empty term lists the first page of the available regimes.
   */
  listRegimes(search?: string): Promise<readonly RegimeReference[]>;

  /**
   * findRegime returns the regime of a reference, whatever its availability.
   *
   * A form that modifies a record needs the regime that the record already
   * carries, even when it is no longer available: hiding it would make the
   * form lose the value of the record.
   */
  findRegime(regimeId: string): Promise<RegimeReference | null>;

  /**
   * resolveWorkUnits returns the unit of work of every given reference.
   */
  resolveWorkUnits(workUnitIds: readonly string[]): Promise<ReadonlyMap<string, WorkUnitReference>>;

  /**
   * listWorkUnits returns the available units of work that match the term.
   */
  listWorkUnits(search?: string): Promise<readonly WorkUnitReference[]>;

  /**
   * resolvePositions returns the position of every given reference.
   */
  resolvePositions(positionIds: readonly string[]): Promise<ReadonlyMap<string, PositionReference>>;

  /**
   * listPositions returns the available positions that match the term.
   */
  listPositions(search?: string): Promise<readonly PositionReference[]>;
}

/** The token of the resolver of the catalogs. */
export const CATALOG_REFERENCE_RESOLVER = new InjectionToken<CatalogReferenceResolver>(
  'CATALOG_REFERENCE_RESOLVER',
);
