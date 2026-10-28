// package valueobjects

import { CatalogValidationError } from '../errors/catalog-errors';
import { hasControlCharacters, textLength } from './text';

/** The maximum length of the description of a catalog record. */
export const DESCRIPTION_MAX_LENGTH = 500;

/** Description is a validated optional description of a catalog record. */
export type Description = string & { readonly __description: unique symbol };

/** parseDescription validates and normalizes a description. */
export function parseDescription(raw: string): Description {
  const trimmed = raw.trim();
  if (textLength(trimmed) > DESCRIPTION_MAX_LENGTH) {
    throw new CatalogValidationError(
      'description',
      `La descripción no puede superar los ${DESCRIPTION_MAX_LENGTH} caracteres.`,
    );
  }
  if (hasControlCharacters(trimmed)) {
    throw new CatalogValidationError(
      'description',
      'La descripción contiene caracteres no permitidos.',
    );
  }
  return trimmed as Description;
}

/** restoreDescription trusts a value returned by the backend. */
export function restoreDescription(value: string): Description {
  return value as Description;
}

/** isDescriptionEmpty reports whether a description carries no text. */
export function isDescriptionEmpty(value: Description): boolean {
  return value.length === 0;
}

/**
 * Description keeps the established factory call sites while exposing a
 * primitive branded type rather than a wrapper class.
 */
export const Description = {
  create: parseDescription,
  restore: restoreDescription,
} as const;
