// Package valueobjects holds the value objects of the IAM bounded context.
// package valueobjects

import { AuthValidationError } from '../errors/auth-errors';

/**
 * The boundaries of the token of a recovery link.
 *
 * The token is an opaque credential that the platform publishes in the
 * email of the recovery: the browser never interprets it, it only carries
 * it back to the platform. The boundaries are the ones of a credential and
 * not the ones of a format: the shape of the token is an implementation
 * detail of the platform and it may change without breaking the browser.
 */
export const RECOVERY_TOKEN_MIN_LENGTH = 32;
export const RECOVERY_TOKEN_MAX_LENGTH = 128;

/**
 * The characters that never travel in a token.
 *
 * A token is a credential of a single line: a space or a control character
 * means that the link was truncated or that it was copied with something
 * else, so the browser refuses it instead of sending it.
 */
const FORBIDDEN_CHARACTERS = /[\s\u0000-\u001f\u007f]/;

/** RecoveryToken is the credential of a link of recovery of the password. */
export type RecoveryToken = string & { readonly __recoveryToken: unique symbol };

/**
 * parseRecoveryToken validates and normalizes the token of a recovery link.
 *
 * The token is trimmed, because the browser may copy it with the spaces of
 * the address bar, and it is rejected when it is empty, when it is shorter
 * or longer than the boundaries of a credential, or when it carries a space
 * or a control character.
 */
export function parseRecoveryToken(raw: string): RecoveryToken {
  const trimmed = raw.trim();

  if (trimmed.length === 0) {
    throw new AuthValidationError('token', 'El enlace de recuperación no es válido.');
  }
  if (trimmed.length < RECOVERY_TOKEN_MIN_LENGTH || trimmed.length > RECOVERY_TOKEN_MAX_LENGTH) {
    throw new AuthValidationError('token', 'El enlace de recuperación no es válido.');
  }
  if (FORBIDDEN_CHARACTERS.test(trimmed)) {
    throw new AuthValidationError('token', 'El enlace de recuperación no es válido.');
  }

  return trimmed as RecoveryToken;
}

/**
 * restoreRecoveryToken trusts a value that the platform published.
 *
 * The token never travels from the platform to the browser in a body: it
 * only arrives in the address bar, so the parser is the one that reads it.
 * The factory exists to keep the two factories of every value object.
 */
export function restoreRecoveryToken(value: string): RecoveryToken {
  return value as RecoveryToken;
}

/**
 * RecoveryToken keeps the established factory call sites while exposing a
 * primitive branded type rather than a wrapper class.
 */
export const RecoveryToken = {
  create: parseRecoveryToken,
  restore: restoreRecoveryToken,
} as const;
