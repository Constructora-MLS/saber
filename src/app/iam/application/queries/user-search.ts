// Package queries holds the queries of the IAM bounded context.

/**
 * The boundaries of the search of a listing.
 *
 * They mirror the boundaries of the platform: a search shorter than two
 * characters is rejected by the API, so it is not sent at all.
 */
export const USER_SEARCH_MIN_LENGTH = 2;
export const USER_SEARCH_MAX_LENGTH = 120;

/**
 * normalizeUserSearch prepares the search of a listing.
 *
 * The search that the platform would reject is dropped, so the listing
 * shows every account instead of an error.
 */
export function normalizeUserSearch(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed || trimmed.length < USER_SEARCH_MIN_LENGTH) {
    return undefined;
  }
  return trimmed.slice(0, USER_SEARCH_MAX_LENGTH);
}
