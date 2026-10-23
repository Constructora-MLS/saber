// Package services holds the domain services of the Employees bounded
// context.
//
// A service that talks to another bounded context lives here: it is the port
// of the other context, so this context never depends on its internals.
// package services

import { InjectionToken } from '@angular/core';

/**
 * RegimeAvailability tells whether a labor regime can be shown and chosen.
 *
 * The catalog publishes the state of the regime; the Employees context reads
 * it as the availability of the reference, because that is the only thing it
 * decides with it.
 */
export type RegimeAvailability = 'ACTIVE' | 'INACTIVE';

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
   * An unavailable regime is never shown in a listing and it is never
   * offered to choose.
   */
  readonly availability: RegimeAvailability;
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
}

/**
 * PositionReference is a position, as the Employees context knows it.
 */
export interface PositionReference {
  /** The identifier of the position. */
  readonly id: string;
  /** The name of the position. */
  readonly name: string;
}

/**
 * CatalogReferenceResolver resolves the catalogs that the Employees context
 * points at.
 *
 * The labor regimes, the units of work and the positions belong to the
 * Catalog bounded context, so this context asks for them through this port
 * and keeps only the references in its own model.
 */
export interface CatalogReferenceResolver {
  /**
   * resolveRegimes returns the regime of every given reference.
   */
  resolveRegimes(regimeIds: readonly string[]): Promise<ReadonlyMap<string, RegimeReference>>;

  /**
   * listRegimes returns the regimes that the worker can choose.
   *
   * Only the available regimes are offered: an unavailable regime is not a
   * choice.
   */
  listRegimes(): Promise<readonly RegimeReference[]>;

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
   * listWorkUnits returns the units of work that the worker can choose.
   */
  listWorkUnits(): Promise<readonly WorkUnitReference[]>;

  /**
   * resolvePositions returns the position of every given reference.
   */
  resolvePositions(positionIds: readonly string[]): Promise<ReadonlyMap<string, PositionReference>>;

  /**
   * listPositions returns the positions that the worker can choose.
   */
  listPositions(): Promise<readonly PositionReference[]>;
}

/** The token of the resolver of the catalogs. */
export const CATALOG_REFERENCE_RESOLVER = new InjectionToken<CatalogReferenceResolver>(
  'CATALOG_REFERENCE_RESOLVER',
);
