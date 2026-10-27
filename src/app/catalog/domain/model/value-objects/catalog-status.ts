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
 * FilterableCatalogStatus is the state a record can be filtered by.
 *
 * The logically deleted records are never listed, so they are not a filter
 * the platform accepts.
 */
export type FilterableCatalogStatus = 'ACTIVE' | 'INACTIVE';

/**
 * The states a record can be filtered by.
 *
 * The logically deleted records are never listed.
 */
export const FILTERABLE_CATALOG_STATUSES: readonly FilterableCatalogStatus[] = [
  'ACTIVE',
  'INACTIVE',
];

/**
 * UpdatableCatalogStatus is the state a record can be moved to.
 *
 * The logical deletion is the only operation that sets the deleted state,
 * so the deleted state is never the target of a modification.
 */
export type UpdatableCatalogStatus = 'ACTIVE' | 'INACTIVE';

/**
 * UPDATABLE_CATALOG_STATUSES are the states a record can be moved to.
 */
export const UPDATABLE_CATALOG_STATUSES: readonly UpdatableCatalogStatus[] = ['ACTIVE', 'INACTIVE'];

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
