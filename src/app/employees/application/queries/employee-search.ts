// Package queries holds the queries of the Employees bounded context.
//
// A query requests information without changing the state of the context.

/**
 * The boundaries of the search of a listing.
 *
 * They mirror the boundaries of the platform: a search shorter than two
 * characters is rejected by the API, so it is not sent at all.
 */
export const EMPLOYEE_SEARCH_MIN_LENGTH = 2;
export const EMPLOYEE_SEARCH_MAX_LENGTH = 120;

/**
 * normalizeEmployeeSearch prepares the search of a listing.
 *
 * The search that the platform would reject is dropped, so the listing
 * shows every worker instead of an error.
 */
export function normalizeEmployeeSearch(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed || trimmed.length < EMPLOYEE_SEARCH_MIN_LENGTH) {
    return undefined;
  }
  return trimmed.slice(0, EMPLOYEE_SEARCH_MAX_LENGTH);
}
