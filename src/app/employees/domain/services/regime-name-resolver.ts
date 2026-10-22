// Package services holds the domain services of the Employees bounded
// context.
//
// A service that talks to another bounded context lives here: it is the port
// of the other context, so this context never depends on its internals.
// package services

import { InjectionToken } from '@angular/core';

/**
 * RegimeOption is a labor regime that the worker of the application can
 * choose.
 */
export interface RegimeOption {
  /** The identifier of the regime. */
  readonly id: string;
  /** The name of the regime. */
  readonly name: string;
}

/**
 * RegimeNameResolver resolves the labor regimes of the workers.
 *
 * The regimes belong to the Catalog bounded context, so this context asks
 * for them through this port and keeps only the references in its own model.
 */
export interface RegimeNameResolver {
  /**
   * resolveNames returns the name of every regime of the given references.
   *
   * A reference without a name is absent from the result: the listing shows
   * the reference it knows and never breaks.
   */
  resolveNames(regimeIds: readonly string[]): Promise<ReadonlyMap<string, string>>;

  /**
   * listRegimes returns the regimes that the worker can choose.
   *
   * The list is empty when the catalog is not reachable: the form asks for
   * the regime again instead of failing.
   */
  listRegimes(): Promise<readonly RegimeOption[]>;
}

/** The token of the resolver of the regimes. */
export const REGIME_NAME_RESOLVER = new InjectionToken<RegimeNameResolver>('REGIME_NAME_RESOLVER');
