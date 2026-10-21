// Package valueobjects holds the value objects of the Catalog bounded
// context.
//
// Every value object validates its invariants on construction and never
// exposes a mutable state.
// package valueobjects

/**
 * CatalogStatus is the lifecycle state of a catalog record.
 */
export type CatalogStatus = 'ACTIVE' | 'INACTIVE' | 'DELETED';

/**
 * The states a record can be filtered by.
 *
 * The logically deleted records are never listed.
 */
export const FILTERABLE_CATALOG_STATUSES: readonly CatalogStatus[] = ['ACTIVE', 'INACTIVE'];

/**
 * catalogStatusLabel returns the label of a state in the language of the
 * interfaces.
 */
export function catalogStatusLabel(status: CatalogStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'Activo';
    case 'INACTIVE':
      return 'Inactivo';
    case 'DELETED':
      return 'Eliminado';
  }
}
