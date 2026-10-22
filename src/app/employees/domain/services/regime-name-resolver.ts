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
 * RegimeOption is a labor regime that the worker of the application can
 * choose.
 */
export interface RegimeOption {
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
 * RegimeNameResolver resolves the labor regimes of the workers.
 *
 * The regimes belong to the Catalog bounded context, so this context asks
 * for them through this port and keeps only the references in its own model.
 */
export interface RegimeNameResolver {
  /**
   * resolveNames returns the name of every available regime of the given
   * references.
   *
   * A reference to a regime that is not available is absent from the result:
   * the listing shows the reference it knows and never breaks.
   */
  resolveNames(regimeIds: readonly string[]): Promise<ReadonlyMap<string, string>>;

  /**
   * listRegimes returns the regimes that the worker can choose.
   *
   * Only the available regimes are offered: an unavailable regime is not a
   * choice.
   *
   * The list is empty when the catalog is not reachable: the form asks for
   * the regime again instead of failing.
   */
  listRegimes(): Promise<readonly RegimeOption[]>;

  /**
   * findRegime returns the regime of a reference, whatever its availability.
   *
   * A form that modifies a record needs the regime that the record already
   * carries, even when it is no longer available: hiding it would make the
   * form lose the value of the record.
   */
  findRegime(regimeId: string): Promise<RegimeOption | null>;
}

/** The token of the resolver of the regimes. */
export const REGIME_NAME_RESOLVER = new InjectionToken<RegimeNameResolver>('REGIME_NAME_RESOLVER');
