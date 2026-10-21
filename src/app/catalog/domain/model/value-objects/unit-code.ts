// package valueobjects

import { CatalogValidationError } from '../errors/catalog-errors';

/** The boundaries of the code of a work unit. */
export const UNIT_CODE_MIN_LENGTH = 2;
export const UNIT_CODE_MAX_LENGTH = 40;

/**
 * UnitCode is the code of a work unit.
 *
 * The code is unique across the work units and it identifies the unit in
 * the assignments and in the certificates.
 */
export class UnitCode {
  private constructor(private readonly text: string) {}

  /**
   * create validates and builds a work unit code.
   */
  static create(raw: string): UnitCode {
    const trimmed = raw.trim().toUpperCase();
    if (trimmed.length === 0) {
      throw new CatalogValidationError('code', 'El código es obligatorio.');
    }
    if (trimmed.length < UNIT_CODE_MIN_LENGTH) {
      throw new CatalogValidationError(
        'code',
        `El código debe tener al menos ${UNIT_CODE_MIN_LENGTH} caracteres.`,
      );
    }
    if (trimmed.length > UNIT_CODE_MAX_LENGTH) {
      throw new CatalogValidationError(
        'code',
        `El código no puede superar los ${UNIT_CODE_MAX_LENGTH} caracteres.`,
      );
    }
    if (!/^[A-Z0-9-]+$/.test(trimmed)) {
      throw new CatalogValidationError('code', 'El código solo admite letras, números y guiones.');
    }
    return new UnitCode(trimmed);
  }

  /**
   * restore rebuilds a code from its stored value.
   */
  static restore(value: string): UnitCode {
    return new UnitCode(value);
  }

  /**
   * value returns the code as it was stored.
   */
  get value(): string {
    return this.text;
  }
}
