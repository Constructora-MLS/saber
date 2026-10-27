import { Provider } from '@angular/core';
import { AssignmentHttpGateway } from './http/assignment-http-gateway';
import { CatalogReferenceAcl } from './http/catalog-reference-acl';
import { EmployeeHttpGateway } from './http/employee-http-gateway';
import { ASSIGNMENT_REPOSITORY } from '../domain/repositories/assignment-repositories';
import { EMPLOYEE_REPOSITORY } from '../domain/repositories/employee-repositories';
import { CATALOG_REFERENCE_RESOLVER } from '../domain/services/catalog-reference-resolver';

/**
 * provideEmployees wires the Employees bounded context.
 *
 * The context reads the workers and their assignments from the API of the
 * platform and it resolves the names of the catalogs that they point at
 * through the anti-corruption layer of the Catalog context.
 *
 * The workers and the assignments live in the same context, because the
 * labour status of a worker is derived from its assignments: the rule needs
 * both aggregates, so it never leaves the context that owns them.
 */
export function provideEmployees(): Provider[] {
  return [
    EmployeeHttpGateway,
    AssignmentHttpGateway,
    CatalogReferenceAcl,
    { provide: EMPLOYEE_REPOSITORY, useExisting: EmployeeHttpGateway },
    { provide: ASSIGNMENT_REPOSITORY, useExisting: AssignmentHttpGateway },
    { provide: CATALOG_REFERENCE_RESOLVER, useExisting: CatalogReferenceAcl },
  ];
}
