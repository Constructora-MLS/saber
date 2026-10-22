// Package valueobjects holds the value objects of the Employees bounded
// context.
// package valueobjects

import { EmployeeValidationError } from '../errors/employee-errors';

/**
 * RegimeId is the reference to the labor regime of an employee.
 *
 * The regime belongs to the Catalog bounded context, so the identifier is
 * kept as an opaque reference and never as a model of the regime.
 */
export class RegimeId {
  private constructor(private readonly text: string) {}

  /**
   * create validates and builds the reference to a regime.
   */
  static create(raw: string): RegimeId {
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      throw new EmployeeValidationError('regimeId', 'El régimen es obligatorio.');
    }
    return new RegimeId(trimmed);
  }

  /**
   * restore rebuilds a reference from its stored value.
   */
  static restore(value: string): RegimeId {
    return new RegimeId(value);
  }

  /**
   * value returns the reference as it was stored.
   */
  get value(): string {
    return this.text;
  }
}
