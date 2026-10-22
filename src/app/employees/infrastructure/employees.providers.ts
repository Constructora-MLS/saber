import { Provider } from '@angular/core';
import { CatalogRegimeAcl } from './http/catalog-regime-acl';
import { EmployeeHttpGateway } from './http/employee-http-gateway';
import { EMPLOYEE_REPOSITORY } from '../domain/repositories/employee-repositories';
import { REGIME_NAME_RESOLVER } from '../domain/services/regime-name-resolver';

/**
 * provideEmployees wires the Employees bounded context.
 *
 * The context reads the workers from the API of the platform and resolves
 * the names of their regimes through the anti-corruption layer of the
 * Catalog context.
 */
export function provideEmployees(): Provider[] {
  return [
    EmployeeHttpGateway,
    CatalogRegimeAcl,
    { provide: EMPLOYEE_REPOSITORY, useExisting: EmployeeHttpGateway },
    { provide: REGIME_NAME_RESOLVER, useExisting: CatalogRegimeAcl },
  ];
}
