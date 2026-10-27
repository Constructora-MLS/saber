// Package valueobjects holds the value objects of the Employees bounded
// context.
// package valueobjects

import { EmployeeValidationError } from '../errors/employee-errors';

/** The exact length of a DNI. */
export const DNI_LENGTH = 8;

/**
 * DNI is the identity document of an employee.
 *
 * It is always a text, so the leading zeroes are preserved.
 */
export class DNI {
  private constructor(private readonly text: string) {}

  /**
   * create validates and builds a DNI.
   */
  static create(raw: string): DNI {
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      throw new EmployeeValidationError('dni', 'El DNI es obligatorio.');
    }
    if (trimmed.length !== DNI_LENGTH || !isNumeric(trimmed)) {
      throw new EmployeeValidationError('dni', `El DNI debe tener ${DNI_LENGTH} dígitos.`);
    }
    return new DNI(trimmed);
  }

  /**
   * restore rebuilds a DNI from its stored value.
   */
  static restore(value: string): DNI {
    return new DNI(value);
  }

  /**
   * value returns the DNI as it was stored.
   */
  get value(): string {
    return this.text;
  }
}

/**
 * isNumeric reports whether the text is made only of digits.
 */
function isNumeric(text: string): boolean {
  for (const character of text) {
    if (character < '0' || character > '9') {
      return false;
    }
  }
  return true;
}
