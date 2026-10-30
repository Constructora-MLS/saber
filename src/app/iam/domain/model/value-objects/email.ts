// Package valueobjects holds the value objects of the IAM bounded context.
// package valueobjects

import { AuthValidationError } from '../errors/auth-errors';

/** The shape of a valid email address. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

/** The longest address that the platform accepts. */
export const EMAIL_MAX_LENGTH = 254;

/** Email is the address that identifies a user of the platform. */
export type Email = string & { readonly __email: unique symbol };

/**
 * parseEmail validates and normalizes the address of a user.
 *
 * The address is stored in lower case, so the same address never reaches the
 * platform twice with a different case.
 */
export function parseEmail(raw: string): Email {
  const address = raw.trim().toLowerCase();
  if (address.length === 0) {
    throw new AuthValidationError('email', 'El correo electrónico es obligatorio.');
  }
  if (address.length > EMAIL_MAX_LENGTH) {
    throw new AuthValidationError(
      'email',
      `El correo electrónico no puede superar los ${EMAIL_MAX_LENGTH} caracteres.`,
    );
  }
  if (!EMAIL_PATTERN.test(address)) {
    throw new AuthValidationError('email', 'El correo electrónico no es válido.');
  }
  return address as Email;
}

/**
 * Email keeps the established factory call sites while exposing a primitive
 * branded type rather than a wrapper class.
 */
export const Email = {
  create: parseEmail,
} as const;
