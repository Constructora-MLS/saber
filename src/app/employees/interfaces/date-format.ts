// The format of the date of birth in the interfaces of the platform.
//
// The platform publishes the dates in the ISO format, but the worker of the
// application reads and writes them in the format of Peru: the day, the
// month and the year.

/** The format that the interfaces show. */
const DISPLAY_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/;

/**
 * The number of characters of a date of birth as the interfaces show it.
 *
 * The field holds the day, the month and the year, so the limit of the
 * field is the length of the format.
 */
export const BIRTH_DATE_INPUT_LENGTH = 10;

/** The format that the platform publishes. */
const PLATFORM_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * toBirthDateInput reads a date of the platform and returns the date as the
 * interfaces show it.
 */
export function toBirthDateInput(platformDate: string): string {
  const match = PLATFORM_PATTERN.exec(platformDate.trim());
  if (!match) {
    return '';
  }
  return `${match[3]}/${match[2]}/${match[1]}`;
}

/**
 * fromBirthDateInput reads the date of the interfaces and returns the date of
 * the platform.
 *
 * A date that is not a real day of the calendar has no platform date, so the
 * value is not sent.
 */
export function fromBirthDateInput(displayDate: string): string | null {
  const parsed = parse(displayDate);
  return parsed;
}

/**
 * birthDateFormatError names the reason why a date of the interfaces is not
 * valid.
 *
 * The reason is empty when the date is valid.
 */
export function birthDateFormatError(displayDate: string): 'format' | 'future' | null {
  const trimmed = displayDate.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const parsed = parse(trimmed);
  if (parsed === null) {
    return 'format';
  }

  return parsed > today() ? 'future' : null;
}

/**
 * parse reads a date of the interfaces and returns the date of the platform.
 */
function parse(displayDate: string): string | null {
  const match = DISPLAY_PATTERN.exec(displayDate.trim());
  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${match[3]}-${match[2]}-${match[1]}`;
}

/**
 * today returns the current date in the format of the platform.
 */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}
