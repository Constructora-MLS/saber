// Package valueobjects holds the value objects of the Employees bounded
// context.
//
// Every value object validates its invariants on construction and never
// exposes a mutable state.
// package valueobjects

import { EmployeeValidationError } from '../errors/employee-errors';

/**
 * UUID_PATTERN is the shape of the identifier of a record of the platform.
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * EmployeeId is the identifier of an employee.
 */
export class EmployeeId {
  private constructor(private readonly text: string) {}

  /**
   * create validates and builds the identifier of an employee.
   *
   * The identifier is the identifier of a record of the platform, so it
   * must be a UUID: the platform rejects any other value.
   */
  static create(raw: string): EmployeeId {
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      throw new EmployeeValidationError('id', 'El identificador del trabajador es obligatorio.');
    }
    if (!UUID_PATTERN.test(trimmed)) {
      throw new EmployeeValidationError('id', 'El identificador del trabajador no es válido.');
    }
    return new EmployeeId(trimmed);
  }

  /**
   * restore rebuilds an identifier from its stored value.
   */
  static restore(value: string): EmployeeId {
    return new EmployeeId(value);
  }

  /**
   * value returns the identifier as it was stored.
   */
  get value(): string {
    return this.text;
  }
}
