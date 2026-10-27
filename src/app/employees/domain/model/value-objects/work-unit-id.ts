// Package valueobjects holds the value objects of the Employees bounded
// context.
// package valueobjects

import { AssignmentValidationError } from '../errors/assignment-errors';

/**
 * UUID_PATTERN is the shape of the identifier of a record of the platform.
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * WorkUnitId is the reference to the unit of work of an assignment.
 *
 * The unit of work belongs to the Catalog bounded context, so the
 * identifier is kept as an opaque reference and never as a model of the
 * unit.
 */
export class WorkUnitId {
  private constructor(private readonly text: string) {}

  /**
   * create validates and builds the reference to a unit of work.
   */
  static create(raw: string): WorkUnitId {
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      throw new AssignmentValidationError('workUnitId', 'La unidad de trabajo es obligatoria.');
    }
    if (!UUID_PATTERN.test(trimmed)) {
      throw new AssignmentValidationError('workUnitId', 'La unidad de trabajo no es válida.');
    }
    return new WorkUnitId(trimmed);
  }

  /**
   * restore rebuilds a reference from its stored value.
   */
  static restore(value: string): WorkUnitId {
    return new WorkUnitId(value);
  }

  /**
   * value returns the reference as it was stored.
   */
  get value(): string {
    return this.text;
  }
}
