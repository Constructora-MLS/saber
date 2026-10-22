// package valueobjects

import { CatalogValidationError } from '../errors/catalog-errors';
import { hasControlCharacters, textLength } from './text';

/** The boundaries of the name of a catalog record. */
export const CATALOG_NAME_MIN_LENGTH = 2;
export const CATALOG_NAME_MAX_LENGTH = 120;

/**
 * CatalogName is the name of a catalog record.
 */
export class CatalogName {
  private constructor(private readonly text: string) {}

  /**
   * create validates and builds a catalog name.
   */
  static create(raw: string): CatalogName {
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
    return new CatalogName(trimmed);
  }

  /**
   * restore rebuilds a name from its stored value. The stored records were
   * validated when they were written, so the reconstitution of an aggregate
   * does not re-run the validation rules.
   */
  static restore(value: string): CatalogName {
    return new CatalogName(value);
  }

  /**
   * value returns the name as it was stored.
   */
  get value(): string {
    return this.text;
  }
}
