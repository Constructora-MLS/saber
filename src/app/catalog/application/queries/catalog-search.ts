// Package queries holds the queries of the Catalog bounded context.
//
// A query requests information without changing the state of the context.

/**
 * The boundaries of the search of a listing.
 *
 * They mirror the boundaries of the platform: a search shorter than two
 * characters is rejected by the API, so it is not sent at all.
 */
export const CATALOG_SEARCH_MIN_LENGTH = 2;
export const CATALOG_SEARCH_MAX_LENGTH = 120;

/**
 * normalizeCatalogSearch prepares the search of a listing.
 *
 * The search that the platform would reject is dropped, so the listing
 * shows every record instead of an error.
 */
export function normalizeCatalogSearch(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed || trimmed.length < CATALOG_SEARCH_MIN_LENGTH) {
    return undefined;
  }
  return trimmed.slice(0, CATALOG_SEARCH_MAX_LENGTH);
}
