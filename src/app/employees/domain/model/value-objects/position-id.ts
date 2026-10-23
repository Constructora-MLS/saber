// Package valueobjects holds the value objects of the Employees bounded
// context.
// package valueobjects

import { AssignmentValidationError } from '../errors/assignment-errors';

/**
 * UUID_PATTERN is the shape of the identifier of a record of the platform.
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * PositionId is the reference to the position of an assignment.
 *
 * The position belongs to the Catalog bounded context, so the identifier is
 * kept as an opaque reference and never as a model of the position.
 */
export class PositionId {
  private constructor(private readonly text: string) {}

  /**
   * create validates and builds the reference to a position.
   */
  static create(raw: string): PositionId {
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      throw new AssignmentValidationError('positionId', 'El cargo es obligatorio.');
    }
    if (!UUID_PATTERN.test(trimmed)) {
      throw new AssignmentValidationError('positionId', 'El cargo no es válido.');
    }
    return new PositionId(trimmed);
  }

  /**
   * restore rebuilds a reference from its stored value.
   */
  static restore(value: string): PositionId {
    return new PositionId(value);
  }

  /**
   * value returns the reference as it was stored.
   */
  get value(): string {
    return this.text;
  }
}
