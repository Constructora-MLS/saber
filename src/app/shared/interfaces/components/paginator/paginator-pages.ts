// Package paginator holds the pagination of the listings.
//
// The worker moves between the pages of a listing without leaving the
// screen.
// package paginator

/**
 * The highest number of pages that the paginator shows at once.
 *
 * The pages around the current one and the first one and the last one are
 * shown, so the worker never loses the way in a long listing.
 */
export const VISIBLE_PAGES = 7;

/**
 * visiblePages returns the numbers of the pages that the paginator shows.
 *
 * The first page and the last one are always shown, and the pages around
 * the current one fill the rest, so the worker reaches any page of a long
 * listing in a single click.
 */
export function visiblePages(current: number, total: number): readonly number[] {
  if (total <= 1) {
    return [];
  }

  const numbers = new Set<number>([1, total]);
  const half = Math.floor((VISIBLE_PAGES - 2) / 2);
  for (let number = current - half; number <= current + half; number++) {
    if (number >= 1 && number <= total) {
      numbers.add(number);
    }
  }

  return [...numbers].sort((first, second) => first - second);
}
