// Package valueobjects holds the value objects of the Certificates bounded
// context.
// package valueobjects

/**
 * CERTIFICATE_PAGE_SIZE is the size of the page that the listings of the
 * certificates ask for.
 *
 * The platform answers a page of every listing and its maximum is a hundred
 * records, so the interfaces ask for the biggest page that the platform
 * accepts.
 */
export const CERTIFICATE_PAGE_SIZE = 100;
