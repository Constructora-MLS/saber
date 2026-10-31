// Package valueobjects holds the value objects of the IAM bounded context.
// package valueobjects

import { AuthValidationError } from '../errors/auth-errors';

/** The boundaries of the password of a user. */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 30;

/**
 * The boundaries of the password that an invited member chooses.
 *
 * The platform asks for a longer password when the account is created, and
 * the sign in only asks for the password that already exists: the account
 * password never outlives the limit of the sign in, so the member can
 * always write it.
 */
export const ACCOUNT_PASSWORD_MIN_LENGTH = 12;
export const ACCOUNT_PASSWORD_MAX_LENGTH = 30;

/** Password is a validated password of a user. */
export type Password = string & { readonly __password: unique symbol };

/**
 * parsePassword validates the password of a user.
 *
 * The password is never normalized: the spaces are part of it.
 */
export function parsePassword(raw: string): Password {
  if (raw.length === 0) {
    throw new AuthValidationError('password', 'La contraseña es obligatoria.');
  }
  if (raw.length < PASSWORD_MIN_LENGTH) {
    throw new AuthValidationError(
      'password',
      `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`,
    );
  }
  if (raw.length > PASSWORD_MAX_LENGTH) {
    throw new AuthValidationError(
      'password',
      `La contraseña no puede superar los ${PASSWORD_MAX_LENGTH} caracteres.`,
    );
  }
  return raw as Password;
}

/**
 * parseAccountPassword validates the password of a new account.
 *
 * The password is the one that the invited member chooses, so it respects
 * the boundaries that the platform asks for when the account is created.
 */
export function parseAccountPassword(raw: string): Password {
  if (raw.length === 0) {
    throw new AuthValidationError('password', 'La contraseña es obligatoria.');
  }
  if (raw.length < ACCOUNT_PASSWORD_MIN_LENGTH) {
    throw new AuthValidationError(
      'password',
      `La contraseña debe tener al menos ${ACCOUNT_PASSWORD_MIN_LENGTH} caracteres.`,
    );
  }
  if (raw.length > ACCOUNT_PASSWORD_MAX_LENGTH) {
    throw new AuthValidationError(
      'password',
      `La contraseña no puede superar los ${ACCOUNT_PASSWORD_MAX_LENGTH} caracteres.`,
    );
  }
  return raw as Password;
}

/**
 * Password keeps the established factory call sites while exposing a
 * primitive branded type rather than a wrapper class.
 */
export const Password = {
  create: parsePassword,
} as const;
