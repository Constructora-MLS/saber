import { CatalogStatus } from '../value-objects/catalog-status';
import { CatalogName } from '../value-objects/catalog-name';
import { Description } from '../value-objects/description';

/**
 * Position is the aggregate root of a position.
 *
 * A position is the role a worker performs. It is independent of the work
 * unit where the worker is assigned.
 */
export class Position {
  private constructor(
    readonly id: string,
    readonly name: CatalogName,
    readonly description: Description | null,
    readonly status: CatalogStatus,
  ) {}

  /**
   * create builds the position that the platform accepted.
   */
  static create(
    id: string,
    name: CatalogName,
    description: Description | null,
    status: CatalogStatus,
  ): Position {
    return new Position(id, name, description, status);
  }

  /**
   * restore rebuilds the position from its persisted state.
   */
  static restore(
    id: string,
    name: CatalogName,
    description: Description | null,
    status: CatalogStatus,
  ): Position {
    return new Position(id, name, description, status);
  }
}
