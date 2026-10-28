// package valueobjects

import { CatalogValidationError } from '../errors/catalog-errors';

/**
 * The shape of the code of a work unit.
 *
 * The platform draws the codes: three symbols of the alphabet, a dash and
 * three more.
 */
export const UNIT_CODE_PATTERN = /^[0-9A-HJKMNP-TV-Z]{3}-[0-9A-HJKMNP-TV-Z]{3}$/;

/** UnitCode is the validated code of a work unit. */
export type UnitCode = string & { readonly __unitCode: unique symbol };

/** parseUnitCode validates and normalizes a platform-generated code. */
export function parseUnitCode(raw: string): UnitCode {
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
  return trimmed as UnitCode;
}

/** restoreUnitCode trusts a value returned by the backend. */
export function restoreUnitCode(value: string): UnitCode {
  return value as UnitCode;
}

/**
 * UnitCode keeps the established factory call sites while exposing a
 * primitive branded type rather than a wrapper class.
 */
export const UnitCode = {
  create: parseUnitCode,
  restore: restoreUnitCode,
} as const;
