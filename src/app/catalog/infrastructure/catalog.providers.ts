import { Provider } from '@angular/core';
import { CatalogHttpGateway } from './http/catalog-http-gateway';
import {
  POSITION_REPOSITORY,
  REGIME_REPOSITORY,
  SERVICE_REPOSITORY,
  WORK_UNIT_REPOSITORY,
} from '../domain/repositories/catalog-repositories';

/**
 * provideCatalog wires the Catalog bounded context.
 *
 * The four registries share a single adapter: it speaks the same contract
 * for every catalog, so one connection pool and one interceptor are enough.
 */
export function provideCatalog(): Provider[] {
  return [
    CatalogHttpGateway,
    { provide: SERVICE_REPOSITORY, useExisting: CatalogHttpGateway },
    { provide: POSITION_REPOSITORY, useExisting: CatalogHttpGateway },
    { provide: REGIME_REPOSITORY, useExisting: CatalogHttpGateway },
    { provide: WORK_UNIT_REPOSITORY, useExisting: CatalogHttpGateway },
  ];
}
