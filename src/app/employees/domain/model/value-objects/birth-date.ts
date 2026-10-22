// Package valueobjects holds the value objects of the Employees bounded
// context.
// package valueobjects

import { EmployeeValidationError } from '../errors/employee-errors';

/**
 * BirthDate is the date of birth of an employee.
 *
 * It travels as the ISO date of the platform: the year, the month and the
 * day, in that order. A worker cannot be born in the future, so the date of
 * birth is always a date of the past.
 */
export class BirthDate {
  private constructor(private readonly text: string) {}

  /**
   * create validates and builds a birth date.
   */
  static create(raw: string): BirthDate {
    const trimmed = raw.trim();
    if (!isIsoDate(trimmed)) {
      throw new EmployeeValidationError('birthDate', 'La fecha de nacimiento no es válida.');
    }
    if (trimmed > today()) {
      throw new EmployeeValidationError(
        'birthDate',
        'La fecha de nacimiento no puede ser posterior a hoy.',
      );
    }
    return new BirthDate(trimmed);
  }

  /**
   * restore rebuilds a birth date from its stored value.
   */
  static restore(value: string): BirthDate {
    return new BirthDate(value);
  }

  /**
   * value returns the birth date as it was stored.
   */
  get value(): string {
    return this.text;
  }
}

/**
 * today returns the current date in the ISO format of the platform.
 */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * isIsoDate reports whether the text is a date of the platform and whether
 * that date exists in the calendar.
 */
function isIsoDate(text: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
