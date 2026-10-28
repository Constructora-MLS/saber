// Package valueobjects holds the value objects of the Assignments bounded
// context.
// package valueobjects

import { AssignmentValidationError } from '../errors/assignment-errors';

/**
 * DATE_PATTERN is the shape of a date of the platform.
 *
 * The platform publishes the dates as a text of the YYYY-MM-DD format, and
 * a date without a time never depends on the time zone of the browser.
 */
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * The number of milliseconds of a day.
 */
const MILLISECONDS_PER_DAY = 86_400_000;

/**
 * AssignmentDate is a date without a time.
 *
 * The value is the midnight of its day in UTC, so two dates of the same day
 * are the same date and the comparison never depends on the hour.
 */
export class AssignmentDate {
  private constructor(
    private readonly text: string,
    private readonly day: number,
  ) {}

  /**
   * create validates and builds a date.
   *
   * The field is the name of the invalid field of the operation, so the
   * failure points at the field that has to be corrected.
   */
  static create(raw: string, field: string): AssignmentDate {
    const trimmed = raw.trim();
    const match = DATE_PATTERN.exec(trimmed);

    if (!match) {
      throw new AssignmentValidationError(field, 'La fecha no es válida.');
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const moment = Date.UTC(year, month - 1, day);

    const rebuilt = new Date(moment);
    if (
      rebuilt.getUTCFullYear() !== year ||
      rebuilt.getUTCMonth() !== month - 1 ||
      rebuilt.getUTCDate() !== day
    ) {
      throw new AssignmentValidationError(field, 'La fecha no es válida.');
    }

    return new AssignmentDate(trimmed, moment);
  }

  /**
   * restore rebuilds a date from its stored value.
   */
  static restore(value: string): AssignmentDate {
    return AssignmentDate.create(value, 'date');
  }

  /**
   * value returns the date as it was stored.
   */
  get value(): string {
    return this.text;
  }

  /**
   * isBefore reports whether the date happens before the other one.
   */
  isBefore(other: AssignmentDate): boolean {
    return this.day < other.day;
  }

  /**
   * isAfter reports whether the date happens after the other one.
   */
  isAfter(other: AssignmentDate): boolean {
    return this.day > other.day;
  }
}
