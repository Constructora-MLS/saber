// package valueobjects

import { CatalogValidationError } from '../errors/catalog-errors';

/**
 * The shape of the code of a work unit.
 *
 * The platform draws the codes: three symbols of the alphabet, a dash and
 * three more.
 */
export const UNIT_CODE_PATTERN = /^[0-9A-HJKMNP-TV-Z]{3}-[0-9A-HJKMNP-TV-Z]{3}$/;

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
   *
   * The code is drawn by the platform, so it always has the shape of a
   * drawn code: three symbols of the alphabet, a dash and three more. The
   * value is not uppercased, because the platform never draws a lowercase
   * code and the database keeps the shape as an invariant.
   */
  static create(raw: string): UnitCode {
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      throw new CatalogValidationError('code', 'El código es obligatorio.');
    }
    if (!UNIT_CODE_PATTERN.test(trimmed)) {
      throw new CatalogValidationError(
        'code',
        'El código debe tener tres símbolos, un guion y tres símbolos más.',
      );
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
