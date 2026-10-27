// Package components holds the presentation of the Certificates bounded
// context.
//
// The functions are pure: they read the dates of the platform and they
// write them in the language of the interfaces, so they can be verified
// without the interfaces.
// package components

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
 * formatCertificateDate writes a date of the platform in the language of
 * the interfaces.
 *
 * The date is read from its text and never from a date object, so the day
 * of the date never moves with the time zone of the browser. A moment of
 * the RFC 3339 format is read as the day that it starts.
 */
export function formatCertificateDate(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date.trim());
  if (!match) {
    return date;
  }

  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return date;
  }

  return `${pad(day)} ${MONTH_NAMES[month - 1]} ${match[1]}`;
}

/**
 * pad writes the day of a date with two digits.
 */
function pad(day: number): string {
  return day < 10 ? `0${day}` : String(day);
}
