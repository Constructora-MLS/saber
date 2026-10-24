// Package queries holds the queries of the Employees bounded context.
//
// A query requests information without changing the state of the context.

/**
 * The boundaries of the search of a listing of the catalogs.
 *
 * They mirror the boundaries of the platform: a search shorter than two
 * characters is rejected by the API, so it is not sent at all.
 */
export const CATALOG_SEARCH_MIN_LENGTH = 2;

/**
 * normalizeCatalogSearch prepares the search of a listing of a catalog.
 *
 * The search that the platform would reject is dropped, so the listing
 * shows the first page of the catalog instead of an error.
 */
export function normalizeCatalogSearch(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed || trimmed.length < CATALOG_SEARCH_MIN_LENGTH) {
    return undefined;
  }
  return trimmed;
}
