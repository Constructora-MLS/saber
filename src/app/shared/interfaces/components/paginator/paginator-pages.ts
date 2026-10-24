// Package paginator holds the pagination of the listings.
//
// The worker moves between the pages of a listing without leaving the
// screen.
// package paginator

/**
 * visiblePages returns the items that the paginator shows.
 *
 * A number is a page and a null is the ellipsis that hides the pages
 * between two shown ones. The first page and the last one are always
 * shown, so the worker knows how long the listing is and reaches its
 * beginning and its end in a single click.
 */
export function visiblePages(current: number, total: number): readonly (number | null)[] {
  if (total <= 1) {
    return [];
  }

  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  const items: (number | null)[] = [1];
  if (start > 2) {
    items.push(null);
  }
  for (let number = start; number <= end; number++) {
    items.push(number);
  }
  if (end < total - 1) {
    items.push(null);
  }
  items.push(total);

  return items;
}
