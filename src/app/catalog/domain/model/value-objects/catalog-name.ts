// package valueobjects

import { CatalogValidationError } from '../errors/catalog-errors';
import { hasControlCharacters, textLength } from './text';

/** The boundaries of the name of a catalog record. */
export const CATALOG_NAME_MIN_LENGTH = 2;
export const CATALOG_NAME_MAX_LENGTH = 120;

/** CatalogName is a validated name of a catalog record. */
export type CatalogName = string & { readonly __catalogName: unique symbol };

/** parseCatalogName validates and normalizes a catalog name. */
export function parseCatalogName(raw: string): CatalogName {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new CatalogValidationError('name', 'El nombre es obligatorio.');
  }
  if (textLength(trimmed) < CATALOG_NAME_MIN_LENGTH) {
    throw new CatalogValidationError(
      'name',
      `El nombre debe tener al menos ${CATALOG_NAME_MIN_LENGTH} caracteres.`,
    );
  }
  if (textLength(trimmed) > CATALOG_NAME_MAX_LENGTH) {
    throw new CatalogValidationError(
      'name',
      `El nombre no puede superar los ${CATALOG_NAME_MAX_LENGTH} caracteres.`,
    );
  }
  if (hasControlCharacters(trimmed)) {
    throw new CatalogValidationError('name', 'El nombre contiene caracteres no permitidos.');
  }
  return trimmed as CatalogName;
}

/** restoreCatalogName trusts a value returned by the backend. */
export function restoreCatalogName(value: string): CatalogName {
  return value as CatalogName;
}

/**
 * CatalogName keeps the established factory call sites while exposing a
 * primitive branded type rather than a wrapper class.
 */
export const CatalogName = {
  create: parseCatalogName,
  restore: restoreCatalogName,
} as const;
