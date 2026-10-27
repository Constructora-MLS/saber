// Package queries holds the technical limits of the searches that the
// selectors of the catalogs perform.
//
// The limits are not owned by a bounded context: they mirror the boundaries
// of the platform, so the selectors of every context offer the same
// behaviour without depending on each other.
// package queries

/**
 * CATALOG_SELECTOR_PAGE_SIZE is the number of records that a selector
 * offers.
 *
 * The platform caps the page at a hundred records, and a selector offers
 * twenty of them: the worker looks for a record among the ones that match
 * the term, never among the whole catalog.
 */
export const CATALOG_SELECTOR_PAGE_SIZE = 20;

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
