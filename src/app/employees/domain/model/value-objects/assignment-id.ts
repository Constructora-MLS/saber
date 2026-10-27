// Package valueobjects holds the value objects of the Assignments bounded
// context.
//
// Every value object validates its invariants on construction and never
// exposes a mutable state.
// package valueobjects

import { AssignmentValidationError } from '../errors/assignment-errors';

/**
 * UUID_PATTERN is the shape of the identifier of a record of the platform.
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * AssignmentId is the identifier of an assignment.
 */
export class AssignmentId {
  private constructor(private readonly text: string) {}

  /**
   * create validates and builds the identifier of an assignment.
   *
   * The identifier is the identifier of a record of the platform, so it
   * must be a UUID: the platform rejects any other value.
   */
  static create(raw: string): AssignmentId {
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      throw new AssignmentValidationError(
        'id',
        'El identificador de la asignación es obligatorio.',
      );
    }
    if (!UUID_PATTERN.test(trimmed)) {
      throw new AssignmentValidationError('id', 'El identificador de la asignación no es válido.');
    }
    return new AssignmentId(trimmed);
  }

  /**
   * restore rebuilds an identifier from its stored value.
   */
  static restore(value: string): AssignmentId {
    return new AssignmentId(value);
  }

  /**
   * value returns the identifier as it was stored.
   */
  get value(): string {
    return this.text;
  }
}
