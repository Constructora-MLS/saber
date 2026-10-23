// Package assignmentperiodformat holds the writing of the labour periods of
// the assignments.
//
// The functions are pure: they read the dates of the platform and they write
// them in the language of the interfaces, so they can be verified without
// the interfaces.
// package assignmentperiodformat

/**
 * The short names of the months, in the language of the interfaces.
 */
const MONTH_NAMES = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'set',
  'oct',
  'nov',
  'dic',
] as const;

/**
 * The parts of a date of the platform.
 */
interface AssignmentDateParts {
  /** The day of the month. */
  readonly day: number;
  /** The month of the year, from one to twelve. */
  readonly month: number;
  /** The year of the date. */
  readonly year: number;
}

/**
 * formatAssignmentDate writes a date of the platform in the language of the
 * interfaces.
 *
 * The date is read from its text and never from a date object, so the day of
 * the date never moves with the time zone of the browser.
 */
export function formatAssignmentDate(date: string): string {
  const parts = parseAssignmentDate(date);
  if (!parts) {
    return date;
  }

  return `${pad(parts.day)} ${MONTH_NAMES[parts.month - 1]} ${parts.year}`;
}

/**
 * formatAssignmentPeriod writes the period of an assignment in the language
 * of the interfaces.
 *
 * An open period is announced with "Desde", and a closed one with the two
 * dates that bound it. The year is shown once when both dates belong to the
 * same year, so the period of a year reads as one date range.
 */
export function formatAssignmentPeriod(startDate: string, endDate: string | null): string {
  const start = parseAssignmentDate(startDate);
  if (!start) {
    return startDate;
  }

  if (!endDate) {
    return `Desde ${formatAssignmentDate(startDate)}`;
  }

  const end = parseAssignmentDate(endDate);
  if (!end) {
    return `${formatAssignmentDate(startDate)} – ${endDate}`;
  }

  const from = `${pad(start.day)} ${MONTH_NAMES[start.month - 1]}`;
  const to = `${pad(end.day)} ${MONTH_NAMES[end.month - 1]}`;

  return start.year === end.year
    ? `${from} – ${to} ${end.year}`
    : `${from} ${start.year} – ${to} ${end.year}`;
}

/**
 * todayAsAssignmentDate writes the current day in the format of the
 * platform.
 *
 * The day is read from the clock of the browser, so the forms of the
 * assignments offer the same last day that the platform accepts.
 */
export function todayAsAssignmentDate(): string {
  const now = new Date();

  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * parseAssignmentDate reads the parts of a date of the platform.
 *
 * The date of the platform is a text of the YYYY-MM-DD format, so it is
 * read as a text and never as a moment.
 */
function parseAssignmentDate(date: string): AssignmentDateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  return { day, month, year };
}

/**
 * pad writes the day of a date with two digits.
 */
function pad(day: number): string {
  return day < 10 ? `0${day}` : String(day);
}
