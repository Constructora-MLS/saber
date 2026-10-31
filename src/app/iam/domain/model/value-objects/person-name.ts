// Package valueobjects holds the value objects of the IAM bounded context.
// package valueobjects

import { AuthValidationError } from '../errors/auth-errors';

/** The boundaries of the name of an account. */
export const PERSON_NAME_MAX_LENGTH = 100;

/**
 * The name of an account that a form edits.
 *
 * The form shows the failure next to the field that caused it, so the field
 * travels with the value that it validates.
 */
export type PersonNameField = 'firstName' | 'lastName';

/**
 * The way each name is named in the messages of the interfaces.
 */
const FIELD_LABELS: Record<PersonNameField, string> = {
  firstName: 'El nombre',
  lastName: 'El apellido',
};

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
export function parsePersonName(raw: string, field?: PersonNameField): PersonName {
  const name = raw.trim();
  const label = field ? FIELD_LABELS[field] : 'El nombre';
  if (name.length === 0) {
    throw new AuthValidationError(field ?? 'name', `${label} es obligatorio.`);
  }
  if ([...name].length > PERSON_NAME_MAX_LENGTH) {
    throw new AuthValidationError(
      field ?? 'name',
      `${label} no puede superar los ${PERSON_NAME_MAX_LENGTH} caracteres.`,
    );
  }
  return name as PersonName;
}
