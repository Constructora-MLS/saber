// Package valueobjects holds the value objects of the IAM bounded context.
// package valueobjects

import { AuthValidationError } from '../errors/auth-errors';

/** The boundaries of the name of an account. */
export const PERSON_NAME_MAX_LENGTH = 100;

/**
 * PersonName is the first name or the last name of an account.
 */
export type PersonName = string & { readonly __personName: unique symbol };

/**
 * parsePersonName validates and normalizes the name of an account.
 *
 * The name is stored without the spaces around it, and it is never empty:
 * the platform asks for the names of the invited member.
 */
export function parsePersonName(raw: string): PersonName {
  const name = raw.trim();
  if (name.length === 0) {
    throw new AuthValidationError('name', 'El nombre es obligatorio.');
  }
  if ([...name].length > PERSON_NAME_MAX_LENGTH) {
    throw new AuthValidationError(
      'name',
      `El nombre no puede superar los ${PERSON_NAME_MAX_LENGTH} caracteres.`,
    );
  }
  return name as PersonName;
}
