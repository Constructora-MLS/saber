import { CatalogStatus } from '../value-objects/catalog-status';
import { CatalogName } from '../value-objects/catalog-name';
import { Description } from '../value-objects/description';

/**
 * Service is the aggregate root of a service.
 *
 * A service is the family of works that shares a contract, a margin and a
 * responsible. The work units belong to a service, so the service is
 * registered before its work units.
 */
export class Service {
  private constructor(
    readonly id: string,
    readonly name: CatalogName,
    readonly description: Description | null,
    readonly status: CatalogStatus,
  ) {}

  /**
   * create builds the service that the platform accepted.
   *
   * The identifier is assigned by the platform, so the aggregate is only
   * built once the registry confirms the creation.
   */
  static create(
    id: string,
    name: CatalogName,
    description: Description | null,
    status: CatalogStatus,
  ): Service {
    return new Service(id, name, description, status);
  }

  /**
   * restore rebuilds the service from its persisted state. It does not
   * re-run the creation rules: the stored record was valid when it was
   * written.
   */
  static restore(
    id: string,
    name: CatalogName,
    description: Description | null,
    status: CatalogStatus,
  ): Service {
    return new Service(id, name, description, status);
  }
}
