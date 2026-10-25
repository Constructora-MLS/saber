// Package services holds the domain services of the Certificates bounded
// context.
//
// A service that talks to another bounded context lives here: it is the
// port of the other context, so this context never depends on its
// internals.
// package services

import { InjectionToken } from '@angular/core';

/**
 * CertificateServiceReference is a service of the catalog, as the
 * Certificates context knows it.
 */
export interface CertificateServiceReference {
  /** The identifier of the service. */
  readonly id: string;
  /** The name of the service. */
  readonly name: string;
}

/**
 * CertificateServiceResolver resolves the services whose templates the
 * certificates use.
 *
 * The services belong to the Catalog bounded context, so this context asks
 * for them through this port and keeps only their names.
 */
export interface CertificateServiceResolver {
  /**
   * resolveServiceNames returns the name of every given service.
   */
  resolveServiceNames(serviceIds: readonly string[]): Promise<ReadonlyMap<string, string>>;

  /**
   * listServices returns the services of the catalog.
   */
  listServices(): Promise<readonly CertificateServiceReference[]>;
}

/** The token of the resolver of the services. */
export const CERTIFICATE_SERVICE_RESOLVER = new InjectionToken<CertificateServiceResolver>(
  'CERTIFICATE_SERVICE_RESOLVER',
);
