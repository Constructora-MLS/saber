// Package valueobjects holds the value objects of the Employees bounded
// context.
// package valueobjects

import { EmployeeValidationError } from '../errors/employee-errors';

/** The boundaries of the first name and of the last name. */
export const PERSON_NAME_MIN_LENGTH = 2;
export const PERSON_NAME_MAX_LENGTH = 100;

/**
 * PersonName is the first name or the last name of an employee.
 */
export class PersonName {
  private constructor(private readonly text: string) {}

  /**
   * create validates and builds a person name.
   */
  static create(raw: string): PersonName {
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      throw new EmployeeValidationError('name', 'El nombre es obligatorio.');
    }
    if (trimmed.length < PERSON_NAME_MIN_LENGTH) {
      throw new EmployeeValidationError(
        'name',
        `El nombre debe tener al menos ${PERSON_NAME_MIN_LENGTH} caracteres.`,
      );
    }
    if (trimmed.length > PERSON_NAME_MAX_LENGTH) {
      throw new EmployeeValidationError(
        'name',
        `El nombre no puede superar los ${PERSON_NAME_MAX_LENGTH} caracteres.`,
      );
    }
    if (hasControlCharacters(trimmed)) {
      throw new EmployeeValidationError('name', 'El nombre contiene caracteres no permitidos.');
    }
    return new PersonName(trimmed);
  }

  /**
   * restore rebuilds a name from its stored value. The stored records were
   * validated when they were written, so the reconstitution of an aggregate
   * does not re-run the validation rules.
   */
  static restore(value: string): PersonName {
    return new PersonName(value);
  }

  /**
   * value returns the name as it was stored.
   */
  get value(): string {
    return this.text;
  }
}

/**
 * hasControlCharacters reports whether the text carries a control character.
 */
function hasControlCharacters(text: string): boolean {
  for (const character of text) {
    const code = character.codePointAt(0) ?? 0;
    if (code < 0x20 || code === 0x7f) {
      return true;
    }
  }
  return false;
}
