import { CatalogStatus } from '../value-objects/catalog-status';
import { CatalogName } from '../value-objects/catalog-name';
import { Description } from '../value-objects/description';

/**
 * Regime is the aggregate root of a regime.
 *
 * A regime is the labour regime of an assignment: it drives the benefits and
 * the contributions derived from the assignment.
 */
export class Regime {
  private constructor(
    readonly id: string,
    readonly name: CatalogName,
    readonly description: Description | null,
    readonly status: CatalogStatus,
  ) {}

  /**
   * create builds the regime that the platform accepted.
   */
  static create(
    id: string,
    name: CatalogName,
    description: Description | null,
    status: CatalogStatus,
  ): Regime {
    return new Regime(id, name, description, status);
  }

  /**
   * restore rebuilds the regime from its persisted state.
   */
  static restore(
    id: string,
    name: CatalogName,
    description: Description | null,
    status: CatalogStatus,
  ): Regime {
    return new Regime(id, name, description, status);
  }
}
